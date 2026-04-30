import { Hono } from "hono";
import fs from "fs/promises";
import path from "path";

export const downloadRoute = new Hono();

// Download converted file
downloadRoute.get("/download/:jobId", async (c) => {
  const jobId = c.req.param("jobId");

  // Security: only allow valid jobId format (numeric)
  if (!/^\d+$/.test(jobId)) {
    return c.json({ error: "Invalid job ID" }, 400);
  }

  // Try common formats
  const formats = ["png", "jpeg", "jpg", "webp"];
  let filePath: string | null = null;

  for (const fmt of formats) {
    // Worker saves as converted-{jobId}.{format}
    const tryPath = path.join("/tmp", `converted-${jobId}.${fmt}`);
    try {
      await fs.access(tryPath);
      filePath = tryPath;
      break;
    } catch {
      continue;
    }
  }

  if (!filePath) {
    return c.json({ error: "File not found or expired" }, 404);
  }

  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).slice(1);

    // Delete after serving (one-time download)
    setTimeout(async () => {
      await fs.unlink(filePath!).catch(() => {});
      console.log(`[Download] Auto-deleted ${filePath}`);
    }, 3000); // 3s delay

    c.header("Content-Type", `image/${ext}`);
    c.header("Content-Disposition", `attachment; filename=converted.${ext}`);

    return c.body(buffer, {
      headers: {
        "Content-Type": `image/${ext}`,
        "Content-Disposition": `attachment; filename=converted.${ext}`,
      },
    });
  } catch {
    return c.json({ error: "Failed to read file" }, 500);
  }
});
