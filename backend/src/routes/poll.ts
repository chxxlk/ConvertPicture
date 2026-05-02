import { Hono } from "hono";
import { Queue, Job } from "bullmq";
import { connection } from "../queue/connection";

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
    // Return JSON only, not binary
    const baseUrl = `${c.req.url.origin}`;
    return c.json({
      status: "completed",
      jobId,
      downloadUrl: `${baseUrl}/api/download/${jobId}`,
    });
  }

  if (state === "failed") {
    return c.json({
      status: "failed",
      error: job.failedReason,
    }, 500);
  }

  // Still processing (waiting, active, delayed)
  return c.json({
    status: state,
    progress: job.progress,
    jobId,
  });
});
