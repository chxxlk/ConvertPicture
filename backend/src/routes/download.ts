import { Hono } from "hono";
import fs from "fs/promises";
import path from "path";

export const downloadRoute = new Hono();

// Download converted file
downloadRoute.get("/download/:jobId", async (c) => {
  const jobId = c.req.param("jobId");

  if (!/^\d+$/.test(jobId)) {
    return c.json({ error: "Invalid job ID" }, 400);
  }

  const formats = ["png", "jpeg", "jpg", "webp", "avif"];
  let filePath: string | null = null;
  console.log(`[Download] Looking for job ${jobId}`);

  // Check /var/storage/converted first (worker saves as {jobId}.{fmt})
  for (const fmt of formats) {
    const tryPath = `/var/storage/converted/${jobId}.${fmt}`;
    try {
      await fs.access(tryPath);
      filePath = tryPath;
      console.log(`[Download] Found: ${tryPath}`);
      break;
    } catch { continue; }
  }

  // Fallback to /tmp with new naming ({jobId}.{fmt})
  if (!filePath) {
    for (const fmt of formats) {
      const tryPath = `/tmp/${jobId}.${fmt}`;
      try {
        await fs.access(tryPath);
        filePath = tryPath;
        console.log(`[Download] Found in /tmp: ${tryPath}`);
        break;
      } catch { continue; }
    }
  }

  // Fallback to old naming in /tmp (converted-{jobId}.{fmt})
  if (!filePath) {
    for (const fmt of formats) {
      const tryPath = `/tmp/converted-${jobId}.${fmt}`;
      try {
        await fs.access(tryPath);
        filePath = tryPath;
        console.log(`[Download] Found old format in /tmp: ${tryPath}`);
        break;
      } catch { continue; }
    }
  }

  // Fallback to /tmp with new naming
  if (!filePath) {
    for (const fmt of formats) {
      const tryPath = path.join("/tmp", `converted-${jobId}.${fmt}`);
      try {
        await fs.access(tryPath);
        filePath = tryPath;
        console.log(`[Download] Found in /tmp: ${tryPath}`);
        break;
      } catch { continue; }
    }
  }

  if (!filePath) {
    console.error(`[Download] File not found for job ${jobId}`);
    return c.json({ error: "File not found or expired" }, 404);
  }

  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).slice(1);
  console.log(`[Download] Serving ${filePath} (${buffer.length} bytes)`);

  // Delete after serving
  setTimeout(async () => {
    await fs.unlink(filePath!).catch(() => {});
    console.log(`[Download] Auto-deleted ${filePath}`);
  }, 3000);

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": `image/${ext}`,
      "Content-Disposition": `attachment; filename=converted.${ext}`,
    },
  });
});