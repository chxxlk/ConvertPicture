import { Worker, Queue, Job } from "bullmq";
import { connection } from "./connection";
import sharp from "sharp";
import fs from "fs";
import path from "path";

// Limit Sharp threads (default bisa tinggi)
sharp.concurrency(2);

const queue = new Queue("image-conversion", { connection });

new Worker(
  "image-conversion",
  async (job: Job) => {
    const { filePath: inputPath, format, requestId } = job.data;
    const outputPath = path.join("/tmp", `converted-${job.id}.${format}`);

    try {
      console.log(`[Job ${job.id}] Starting (streaming): ${path.basename(inputPath)} → ${format}`);

      await new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(inputPath);
        const writeStream = fs.createWriteStream(outputPath);

        readStream
          .pipe(sharp().toFormat(format as any))
          .pipe(writeStream)
          .on("finish", () => {
            console.log(`[Job ${job.id}] Streaming done: ${outputPath}`);
            resolve(undefined);
          })
          .on("error", (err: any) => {
            console.error(`[Job ${job.id}] Stream error:`, err.message);
            reject(err);
          });
      });

      // Log memory after job
      if (global.gc) {
        global.gc(); // Trigger GC if --expose-gc is set
      }
      const mem = process.memoryUsage();
      console.log(`[Job ${job.id}] Memory: RSS=${(mem.rss / 1024 / 1024).toFixed(0)}MB, Heap=${(mem.heapUsed / 1024 / 1024).toFixed(0)}MB`);

      // Clean input immediately
      await fs.promises.unlink(inputPath).catch(() => {});
      console.log(`[Job ${job.id}] Input cleaned`);

      return {
        outputPath,
        jobId: job.id,
        requestId,
      };
    } catch (err: any) {
      console.error(`[Job ${job.id}] Failed:`, err.message);
      // Cleanup on failure
      await fs.promises.unlink(inputPath).catch(() => {});
      await fs.promises.unlink(outputPath).catch(() => {});
      throw err;
    }
  },
  {
    connection,
    concurrency: 2, // Kurangi dari 4 → 2 (hemat RAM)
  }
);

// Auto-cleanup old files every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const MAX_FILE_AGE = 60 * 60 * 1000; // 1 hour

async function cleanupOldFiles() {
  const now = Date.now();
  try {
    const files = await fs.readdir("/tmp");
    let count = 0;

    for (const file of files) {
      if (file.startsWith("converted-") || file.startsWith("upload-")) {
        const filePath = path.join("/tmp", file);
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > MAX_FILE_AGE) {
          await fs.unlink(filePath).catch(() => {});
          count++;
        }
      }
    }
    if (count > 0) console.log(`[Cleanup] Removed ${count} old files`);
  } catch (err) {
    console.error("[Cleanup] Error:", err);
  }
}

setInterval(cleanupOldFiles, CLEANUP_INTERVAL);
console.log("Worker started (concurrency: 2, sharp concurrency: 2)");
console.log(`Cleanup every ${CLEANUP_INTERVAL / 60000}min (files >1h old)`);

// Suggest running with --expose-gc for better memory management
console.log("Tip: Run with 'bun --expose-gc worker.ts' for explicit GC");
