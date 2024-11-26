import sharp from 'sharp';
import { createWriteStream } from 'fs';

type ImageFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'avif' | 'tiff' | 'svg';

/**
 * Generate a bordered pattern as a pixel buffer
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @param borderSize - Border size in pixels
 * @param borderColor - Border color (RGB)
 * @param fillColor - Background color (RGB)
 * @returns The pixel buffer representing the pattern
 */
function generateBorderPattern(
  width: number,
  height: number,
  borderSize: number,
  borderColor: { r: number; g: number; b: number },
  fillColor: { r: number; g: number; b: number },
) {
  const buffer = Buffer.alloc(width * height * 3); // RGB buffer

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isBorder = x < borderSize || x >= width - borderSize || y < borderSize || y >= height - borderSize;
      const color = isBorder ? borderColor : fillColor;

      const index = (y * width + x) * 3;
      buffer[index] = color.r;
      buffer[index + 1] = color.g;
      buffer[index + 2] = color.b;
    }
  }

  return buffer;
}

async function generateBaseImage(width: number, height: number, targetSizeBytes: number, format: ImageFormat) {
  const cellSize = 10;
  const color1 = { r: 255, g: 0, b: 0 };
  const color2 = { r: 0, g: 0, b: 255 };
  const patternBuffer = generateBorderPattern(width, height, cellSize, color1, color2);

  let quality = 100; // Start with the highest quality
  let baseImageBuffer;
  let baseImageSize;

  do {
    baseImageBuffer = sharp(patternBuffer, {
      raw: {
        width,
        height,
        channels: 3,
      },
    });
    // .jpeg({ quality })
    // .toBuffer();

    if (format === 'jpeg') {
      baseImageBuffer.jpeg({ quality });
    }

    if (format === 'png') {
      baseImageBuffer.png({ quality });
    }

    if (format === 'webp') {
      baseImageBuffer.webp({ quality });
    }

    if (format === 'gif') {
      // TODO effort
      baseImageBuffer.gif();
    }

    if (format === 'avif') {
      baseImageBuffer.avif({ quality });
    }

    baseImageBuffer = await baseImageBuffer.toBuffer();

    baseImageSize = baseImageBuffer.byteLength;

    if (baseImageSize > targetSizeBytes) {
      quality -= 5;
    }

    if (quality < 5) {
      throw new Error(
        `Unable to generate image within target size (${targetSizeBytes} bytes). Consider increasing the dimensions or accepting a larger file size.`,
      );
    }
  } while (baseImageSize > targetSizeBytes);

  console.log(`Image successfully generated with quality: ${quality}`);
  return baseImageBuffer;
}

/**
 * Create an image with a pattern background and an exact file size
 * Supports very large file sizes (e.g., >2GB)
 * @param width - The width of the image in pixels
 * @param height - The height of the image in pixels
 * @param targetSizeMb - The exact file size in Mb
 * @param format - The image format (jpeg, png, webp, gif, avif, tiff, svg)
 * @param outputPath - The file path to save the image
 */
async function generateImage(
  width: number,
  height: number,
  targetSizeMb: number,
  format: ImageFormat = 'jpeg',
  outputPath: string | null,
): Promise<void> {
  try {
    const targetSizeBytes = targetSizeMb * 1_000_000;
    const baseImageBuffer = await generateBaseImage(width, height, targetSizeBytes, format);
    const baseImageSize = baseImageBuffer.byteLength;
    outputPath = outputPath ?? `${width}x${height}_${targetSizeMb}MB.${format}`;
    const writeStream = createWriteStream(outputPath, { flags: 'w' });
    writeStream.write(baseImageBuffer);

    const paddingSize = targetSizeBytes - baseImageSize;
    const chunkSize = 1024 * 1024; // 1MB
    const zeroChunk = Buffer.alloc(chunkSize, 0); // 1MB zero-filled chunk

    let remainingSize = paddingSize;
    while (remainingSize > 0) {
      const chunk = remainingSize > chunkSize ? zeroChunk : Buffer.alloc(remainingSize, 0);
      writeStream.write(chunk);
      remainingSize -= chunk.length;
    }

    writeStream.end();
    console.log(`Image created at ${outputPath}, size: ${targetSizeBytes} bytes`);
  } catch (exception) {
    console.error(exception);
  }
}

export default generateImage;
