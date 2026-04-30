import { Hono } from "hono";
import { Queue, Job } from "bullmq";
import { connection } from "../queue/connection";

const queue = new Queue("image-conversion", { connection });

export const statusRoute = new Hono();

// Check job status
statusRoute.get("/convert/:jobId", async (c) => {
  const jobId = c.req.param("jobId");

  // Try both methods to get job
  const job = await Job.fromId(queue, jobId) || await queue.getJob(jobId);

  if (!job) {
    return c.json({ error: "Job not found" }, 404);
  }

  const state = await job.getState();

  const response: any = { status: state };

  if (state === "completed") {
    response.outputUrl = `/api/download/${jobId}`;
    response.result = {
      jobId: job.id,
      size: job.returnvalue?.size,
    };
  }

  if (state === "failed") {
    response.error = job.failedReason;
  }

  return c.json(response);
});
