import { Hono } from "hono";
import fs from "fs/promises";
import path from "path";

export const resultRoute = new Hono();

resultRoute.get("/result/:filename", async (c) => {
  const filename = c.req.param("filename");

  // Security: only allow converted files with valid format
  if (!filename.startsWith("converted-") || filename.includes("..")) {
    return c.json({ error: "Invalid filename" }, 400);
  }

  const ext = path.extname(filename).slice(1);
  if (!["png", "jpg", "jpeg", "webp"].includes(ext)) {
    return c.json({ error: "Invalid file type" }, 400);
  }

  const filePath = path.join("/tmp", filename);

  try {
    const buffer = await fs.readFile(filePath);
    console.log(`[Result] Serving ${filename} (${(buffer.length / 1024).toFixed(0)}KB)`);

    // Delete after serving (one-time download)
    setTimeout(async () => {
      await fs.unlink(filePath).catch(() => {});
      console.log(`[Result] Auto-deleted ${filename}`);
    }, 5000); // 5s delay to ensure download starts

    c.header("Content-Type", `image/${ext}`);
    c.header("Content-Disposition", `attachment; filename=${filename}`);

    return new Response(buffer);
  } catch {
    return c.json({ error: "File not found or expired" }, 404);
  }
});
