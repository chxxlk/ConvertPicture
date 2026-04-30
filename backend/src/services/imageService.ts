// This file is deprecated - use streaming in worker.ts instead
// Keeping this export for backward compatibility, but don't use for new code
import sharp from "sharp"

export const convertImage = async (
  input: Buffer,
  format: string
): Promise<Buffer> => {
  switch (format) {
    case "png":
      return sharp(input).png().toBuffer()
    case "jpeg":
    case "jpg":
      return sharp(input).jpeg().toBuffer()
    case "webp":
      return sharp(input).webp().toBuffer()
    default:
      throw new Error("Unsupported format")
  }
}
