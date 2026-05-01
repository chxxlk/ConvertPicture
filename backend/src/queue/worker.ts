import { Worker, Job } from "bullmq";
import { connection } from "./connection";
import sharp from "sharp";
import fs from "fs";
import path from "path";
// import { logger } from "../utils/logger";

interface JobData {
  filePath: string;
  format: string;
  requestId?: string;
}

// Get output path (persistent with fallback)
const getOutputPath = (jobId: string, format: string): string => {
  try {
    const dir = "/var/storage/converted";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, `${jobId}.${format}`);
  } catch {
    return path.join("/tmp", `converted-${jobId}.${format}`);
  }
};

// Create worker
const worker = new Worker(
  "image-conversion",
  async (job: Job<JobData>) => {
    const { filePath: inputPath, format, requestId } = job.data;
    const outputPath = getOutputPath(String(job.id), format);

    try {
      console.log(`[Job ${job.id}] Starting (streaming): ${path.basename(inputPath)} → ${format}`);

      await new Promise<void>((resolve, reject) => {
        const readStream = fs.createReadStream(inputPath);
        const writeStream = fs.createWriteStream(outputPath);

        const sharpInstance = sharp();
        sharpInstance.toFormat(format as keyof sharp.FormatEnum);

        readStream
          .pipe(sharpInstance)
          .pipe(writeStream)
          .on("finish", () => {
            console.log(`[Job ${job.id}] Streaming done: ${outputPath}`);
            resolve();
          })
          .on("error", (err: Error) => {
            console.error(`[Job ${job.id}] Stream error:`, err.message);
            reject(err);
          });
      });

      if (global.gc) {
        global.gc();
      }
      const mem = process.memoryUsage();
      console.log(`[Job ${job.id}] Memory: RSS=${(mem.rss / 1024 / 1024).toFixed(0)}MB, Heap=${(mem.heapUsed / 1024 / 1024).toFixed(0)}MB`);

      await fs.promises.unlink(inputPath).catch(() => { });
      console.log(`[Job ${job.id}] Input cleaned`);

      return {
        outputPath,
        jobId: job.id,
        requestId,
      };
    } catch (err: any) {
      console.error(`[Job ${job.id}] Failed:`, err.message);
      await fs.promises.unlink(inputPath).catch(() => { });
      await fs.promises.unlink(outputPath).catch(() => { });
      throw err;
    }
  },
  {
    connection,
    concurrency: 2,
    lockDuration: 30000,
  }
);

// Event listeners
worker.on("completed", (job: Job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on("failed", (job: Job | undefined, err: Error) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on("stalled", (jobId: string | number) => {
  console.error(`[Worker] Job ${jobId} stalled!`);
});

// Auto-cleanup old files every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const MAX_FILE_AGE = 60 * 60 * 1000;

async function cleanupOldFiles() {
  const now = Date.now();
  try {
    const dirs = ["/tmp", "/var/storage/converted"];
    let count = 0;

    for (const dir of dirs) {
      try {
        const files = await fs.promises.readdir(dir);
        for (const file of files) {
          if (file.startsWith("converted-") || file.startsWith("upload-")) {
            const filePath = path.join(dir, file);
            const stats = await fs.promises.stat(filePath);
            if (now - stats.mtimeMs > MAX_FILE_AGE) {
              await fs.promises.unlink(filePath).catch(() => { });
              count++;
            }
          }
        }
      } catch { }
    }
    if (count > 0) console.log(`[Cleanup] Removed ${count} old files`);
  } catch (err) {
    console.error("[Cleanup] Error:", err);
  }
}

setInterval(cleanupOldFiles, CLEANUP_INTERVAL);
console.log("Worker started (concurrency: 2, sharp concurrency: 2)");
console.log(`Cleanup every ${CLEANUP_INTERVAL / 60000}min (files >1h old)`);
console.log("Tip: Run with 'bun --expose-gc worker.ts' for explicit GC");
