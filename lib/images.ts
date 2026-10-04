import sharp from "sharp";
import { DomainError } from "./engine";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const IMAGE_LIMITS = {
  logo: { min: 32, max: 4096, output: 512 },
  banner: { min: 200, max: 6000, output: 1600 },
} as const;
export type ImageKind = keyof typeof IMAGE_LIMITS;
const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

/** Signature sniffing: the declared type is never trusted on its own. */
export function sniff(bytes: Buffer) {
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";
  return null;
}

/**
 * Validates and re-encodes an uploaded PNG/JPEG/WebP: real signature, declared MIME, size,
 * dimensions and a single frame. The output is a resized WebP that keeps transparency and
 * drops metadata, so the city never loads oversized originals or hidden payloads.
 */
export async function normalizeImage(
  bytes: Buffer,
  kind: ImageKind,
  declaredType?: string,
) {
  if (bytes.length > MAX_UPLOAD_BYTES)
    throw new DomainError("Las imágenes deben pesar menos de 2 MB.");
  const format = sniff(bytes);
  if (!format)
    throw new DomainError("Solo se admiten imágenes PNG, JPEG y WebP.");
  if (declaredType && declaredType !== MIME[format])
    throw new DomainError("El tipo de archivo no coincide con su contenido.");
  const limits = IMAGE_LIMITS[kind];
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(bytes, {
      failOn: "error",
      limitInputPixels: limits.max * limits.max,
    }).metadata();
  } catch {
    throw new DomainError("No se ha podido leer la imagen.");
  }
  const { width = 0, height = 0 } = meta;
  if ((meta.pages ?? 1) > 1)
    throw new DomainError("Las imágenes animadas no están permitidas.");
  if (Math.min(width, height) < limits.min)
    throw new DomainError(
      `La imagen es demasiado pequeña: mínimo ${limits.min} px por lado.`,
    );
  if (Math.max(width, height) > limits.max)
    throw new DomainError(
      `La imagen es demasiado grande: máximo ${limits.max} px por lado.`,
    );
  if (Math.max(width, height) / Math.min(width, height) > 8)
    throw new DomainError("La proporción de la imagen es demasiado extrema.");
  const output = await sharp(bytes, { failOn: "error" })
    .rotate()
    .resize({
      width: limits.output,
      height: limits.output,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 86, alphaQuality: 100, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  return {
    bytes: output.data,
    width: output.info.width,
    height: output.info.height,
    hasAlpha: !!meta.hasAlpha,
    ext: "webp" as const,
    contentType: "image/webp",
  };
}
