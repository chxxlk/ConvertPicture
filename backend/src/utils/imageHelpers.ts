import sharp from "sharp";
import { randomUUID } from "crypto";

export const isAllowedType = (type: string): boolean => {
  return ["image/jpeg", "image/png", "image/webp"].includes(type);
};

export const isAllowedFormat = (format: string): boolean => {
  return ["png", "jpeg", "jpg", "webp"].includes(format);
};

export const generateSafePath = (prefix: string, format: string): string => {
  return `/tmp/${prefix}-${randomUUID()}.${format}`;
};

export const shouldUseSync = async (buffer: Buffer, format: string): Promise<boolean> => {
  try {
    const meta = await sharp(buffer).metadata();
    const size = buffer.length;

    if (size > 1 * 1024 * 1024) return false; // >1MB
    if (meta.format === "webp" && ["png", "jpeg"].includes(format)) return false;
    if (meta.format === "png" && format === "webp") return false;
    if ((meta.width || 0) > 2000 || (meta.height || 0) > 2000) return false;
    return true;
  } catch {
    return false;
  }
};
