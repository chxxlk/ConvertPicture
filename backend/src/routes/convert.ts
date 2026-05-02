import { Hono } from "hono";
import { imageQueue } from "../queue/imageQueue";
import { rateLimit } from "../middleware/rateLimit.ts";
import { logger } from "../utils/logger.ts";
import { isAllowedType, isAllowedFormat, generateSafePath } from "../utils/imageHelpers";

export const convertRoute = new Hono();

// ASYNC MODE ONLY - returns jobId
convertRoute.post("/convert", async (c: any) => {
  const body = await c.req.parseBody();
  const file = body["file"] as File;
  // Accept both "format" (legacy) and "targetFormat" (new)
  const format = (body["targetFormat"] as string) || (body["format"] as string);

  const ip =
    c.req.header("x-forwarded-for") ||
    c.req.header("x-real-ip") ||
    "unknown";

  if (rateLimit(ip)) {
    return c.json({ error: "Too many requests" }, 429);
  }

  if (!file || !format) {
    return c.json({ error: "Missing file or format" }, 400);
  }

  if (!isAllowedType(file.type)) {
    return c.json({ error: "Unsupported file type" }, 400);
  }

  if (file.size > 10 * 1024 * 1024) {
    return c.json({ error: "File too large (max 10MB) for async queue" }, 400);
  }

  if (!isAllowedFormat(format)) {
    return c.json({ error: "Invalid format" }, 400);
  }

  // Save to disk (safe path, server-generated)
  const inputPath = generateSafePath("upload", format);
  await Bun.write(inputPath, file);

  const reqId = c.get("requestId") as any || "unknown";

  logger.info({
    requestId: reqId,
    msg: "File saved (async)",
    inputPath,
    size: file.size,
  });

  // Backpressure: Reject if queue too long
  const counts = await imageQueue.getJobCounts();
  const totalPending = counts.waiting + counts.active;

  if (totalPending > 5000) {
    logger.warn({
      requestId: reqId,
      msg: "Queue too long, rejecting request",
      queueLength: totalPending,
    });
    return c.json({ error: "Server busy, try again later" }, 503);
  }

  // Queue job with retention policy
  const job = await imageQueue.add("convert", {
    filePath: inputPath,
    targetFormat: format, // Worker expects targetFormat
    requestId: reqId,
  }, {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  });

  logger.info({
    requestId: reqId,
    msg: "Job queued",
    jobId: job.id,
    format,
    queueLength: totalPending,
  });

  return c.json({
    jobId: job.id,
    statusUrl: `/api/convert/${job.id}`,
    resultUrl: `/api/download/${job.id}`,
  });
});
