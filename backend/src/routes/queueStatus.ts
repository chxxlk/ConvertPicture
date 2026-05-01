import { Hono } from "hono";
import { Queue } from "bullmq";
import { connection } from "../queue/connection";

const queue = new Queue("image-conversion", { connection });
export const queueStatusRoute = new Hono();

queueStatusRoute.get("/queue/stats", async (c) => {
  const [
    waiting,
    active,
    completed,
    failed,
    delayed,
  ] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return c.json({
    waiting,
    active,
    completed,
    failed,
    delayed,
    timestamp: new Date().toISOString(),
  });
});

queueStatusRoute.get("/queue/job/:id", async (c) => {
  const jobId = c.req.param("id");
  const job = await queue.getJob(jobId);

  if (!job) {
    return c.json({ error: "Job not found" }, 404);
  }

  return c.json({
    id: job.id,
    name: job.name,
    data: job.data,
    opts: job.opts,
    progress: job.progress,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
  });
});

queueStatusRoute.get("/queue/failed", async (c) => {
  const jobs = await queue.getFailed(0, 20);
  return c.json(
    jobs.map((j) => ({
      id: j.id,
      name: j.name,
      failedReason: j.failedReason,
      data: j.data,
      attemptsMade: j.attemptsMade,
    }))
  );
});

queueStatusRoute.post("/queue/clean", async (c) => {
  await queue.clean(0, 100, "completed");
  await queue.clean(0, 100, "failed");
  return c.json({ message: "Queue cleaned" });
});
