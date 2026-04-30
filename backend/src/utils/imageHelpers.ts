import sharp from "sharp";
import path from "path";
import { randomUUID } from "crypto";

export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_FORMATS = ["png", "jpeg", "webp"];
const MAX_SIZE_SYNC = 500 * 1024; // 500KB - sync threshold
const SLOW_CONVERSIONS = new Set(["webp→png", "png→webp"]);

export function isAllowedType(type: string): boolean {
  return ALLOWED_TYPES.includes(type);
}

export function isAllowedFormat(format: string): boolean {
  return ALLOWED_FORMATS.includes(format);
}

export function generateSafePath(prefix: string, format: string): string {
  const id = randomUUID();
  const safeName = `${prefix}-${id}.${format}`;
  return path.join("/tmp", safeName);
}

export async function shouldUseSync(
  buffer: Buffer,
  format: string
): Promise<boolean> {
  try {
    const meta = await sharp(buffer).metadata();
    const size = buffer.length;

    console.log(`[shouldUseSync] size=${size}, format=${meta.format}, target=${format}`);

    // File too big for sync (always use queue)
    if (size > MAX_SIZE_SYNC) {
      console.log(`[shouldUseSync] Too big, using async`);
      return false;
    }

    // Heavy conversions always async
    const inputFormat = meta.format || "unknown";
    const conversionKey = `${inputFormat}→${format}`;
    if (SLOW_CONVERSIONS.has(conversionKey)) {
      console.log(`[shouldUseSync] Slow conversion ${conversionKey}, using async`);
      return false;
    }

    // Large dimensions = async
    if ((meta.width || 0) > 2000 || (meta.height || 0) > 2000) {
      console.log(`[shouldUseSync] Large dimensions, using async`);
      return false;
    }

    console.log(`[shouldUseSync] Using SYNC mode`);
    return true; // Small file, fast conversion
  } catch (err: any) {
    console.log(`[shouldUseSync] Error: ${err.message}, using async`);
    return false; // If can't read metadata, use async
  }
}
