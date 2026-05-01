import { Hono } from "hono";
import { rateLimit } from "../middleware/rateLimit.ts";
import { logger } from "../utils/logger.ts";
import { isAllowedType, isAllowedFormat, shouldUseSync } from "../utils/imageHelpers";
import { convertImage } from "../services/imageService";

export const convertSyncRoute = new Hono();

const MAX_SIZE_SYNC = 1 * 1024 * 1024; // 1MB max for sync

// SYNC MODE ONLY - streams result directly
convertSyncRoute.post("/convert-sync", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"] as File;
  const format = body["format"] as string;

  const ip =
    c.req.header("x-forwaded-for") ||
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

  if (file.size > MAX_SIZE_SYNC) {
    return c.json({ error: "File too large for sync (max 1MB). Use /api/convert instead." }, 400);
  }

  if (!isAllowedFormat(format)) {
    return c.json({ error: "Invalid format" }, 400);
  }

  // Check if conversion is suitable for sync
  const buffer = await file.arrayBuffer();
  const inputBuffer = Buffer.from(buffer);

  console.log(`[Sync] Checking: size=${inputBuffer.length}, format=${format}`);

  const isSync = await shouldUseSync(inputBuffer, format);
  if (!isSync) {
    return c.json({ error: "Conversion too complex for sync. Use /api/convert instead." }, 400);
  }

  try {
    const converted = await convertImage(inputBuffer, format);
    const reqId = c.get("requestId" as any) || "unknown";

    logger.info({
      requestId: reqId,
      msg: "Image converted (sync)",
      format,
      size: converted.length,
    });

    c.header("Content-Type", `image/${format}`);
    c.header("Content-Disposition", `attachment; filename=converted.${format}`);

    return c.body(converted as any);
  } catch (err: any) {
    const reqId = c.get("requestId" as any) || "unknown";
    logger.error({
      requestId: reqId,
      msg: "Sync conversion failed",
      error: err.message,
    });
    return c.json({ error: "Conversion failed" }, 500);
  }
});
