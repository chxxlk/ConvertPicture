import { Hono } from "hono";
import { Queue, Job } from "bullmq";
import { connection } from "../queue/connection";
import fs from "fs/promises";
import path from "path";

const queue = new Queue("image-conversion", { connection });

export const pollRoute = new Hono();

pollRoute.get("/poll/:jobId", async (c) => {
  const jobId = c.req.param("jobId");
  const job = await Job.fromId(queue, jobId) || await queue.getJob(jobId);

  if (!job) {
    return c.json({ error: "Job not found" }, 404);
  }

  const state = await job.getState();

  if (state === "completed") {
    const { outputPath } = job.returnvalue || {};
    if (outputPath && await fs.access(outputPath).then(() => true).catch(() => false)) {
      const buffer = await fs.readFile(outputPath);
      const ext = path.extname(outputPath).slice(1);

      // Auto-delete after serving
      setTimeout(() => fs.unlink(outputPath).catch(() => {}), 5000);

      return new Response(buffer, {
        headers: {
          "Content-Type": `image/${ext}`,
          "Content-Disposition": `attachment; filename=converted.${ext}`,
          "X-Job-Status": "completed",
        },
      });
    }
    return c.json({ state: "completed", error: "Result file not found" });
  }

  if (state === "failed") {
    return c.json({
      state: "failed",
      error: job.failedReason,
    }, 500);
  }

  // Still processing
  return c.json({
    state, // waiting, active, delayed
    progress: job.progress,
    jobId,
  });
});
