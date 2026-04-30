import { Hono } from "hono";
import { imageQueue } from "../queue/imageQueue";
import { rateLimit } from "../middleware/rateLimit.ts";
import { logger } from "../utils/logger.ts";
import { isAllowedType, isAllowedFormat, generateSafePath } from "../utils/imageHelpers";

export const convertRoute = new Hono();

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// ASYNC MODE ONLY - returns jobId
convertRoute.post("/convert", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"] as File;
  const format = body["format"] as string;

  const ip =
    c.req.header("x-forwaded-for") ||
    c.req.header("x-real-ip") ||
    "unknown";

  // if (rateLimit(ip)) {
  //   return c.json({ error: "Too many requests" }, 429);
  // }

  if (!file || !format) {
    return c.json({ error: "Missing file or format" }, 400);
  }

  if (!isAllowedType(file.type)) {
    return c.json({ error: "Unsupported file type" }, 400);
  }

  // Validate file size (max 10MB for async)
  if (file.size > 10 * 1024 * 1024) {
    return c.json({ error: "File too large (max 10MB) for async queue" }, 400);
  }

  if (!isAllowedFormat(format)) {
    return c.json({ error: "Invalid format" }, 400);
  }

  // Save to disk (safe path, server-generated)
  const inputPath = generateSafePath("upload", format);
  await Bun.write(inputPath, file);

  logger.info({
    requestId: c.get("requestId"),
    msg: "File saved (async)",
    inputPath,
    size: file.size,
  });

  // Queue job
  const job = await imageQueue.add("convert", {
    filePath: inputPath,
    format,
    requestId: c.get("requestId"),
  });

  logger.info({
    requestId: c.get("requestId"),
    msg: "Job queued",
    jobId: job.id,
    format,
  });

  return c.json({
    jobId: job.id,
    statusUrl: `/api/convert/${job.id}`,
    resultUrl: `/api/download/${job.id}`,
  });
});
