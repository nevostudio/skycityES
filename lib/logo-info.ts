import type { LogoInfo } from "./brand-theme";
import { loadBitmap } from "./sign-canvas";

/**
 * Logo analysis for the city (browser only): aspect ratio, to shape facade panels, and the
 * dominant saturated colour, for brands that take their building colour from the logo.
 * Results are cached per URL; listeners re-render the buildings once a logo is analysed.
 */
const known = new Map<string, LogoInfo | null>();
const pending = new Set<string>();
const listeners = new Set<() => void>();

export const logoInfo = (url?: string) => (url ? known.get(url) : undefined);

export function subscribeLogos(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestLogoInfo(url?: string) {
  if (!url || known.has(url) || pending.has(url)) return;
  pending.add(url);
  void loadBitmap(url).then((bitmap) => {
    pending.delete(url);
    known.set(url, bitmap ? analyse(bitmap) : null);
    listeners.forEach((l) => l());
  });
}

/** Hue buckets weighted by saturation and coverage; neutral and transparent pixels ignored. */
export function dominantColor(data: ArrayLike<number>): string | null {
  const buckets = Array.from({ length: 12 }, () => ({
    weight: 0,
    r: 0,
    g: 0,
    b: 0,
  }));
  let colored = 0,
    opaque = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 160) continue;
    opaque++;
    const r = data[i] / 255,
      g = data[i + 1] / 255,
      b = data[i + 2] / 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      l = (max + min) / 2,
      d = max - min;
    if (d < 0.12 || l < 0.12 || l > 0.92) continue;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (s < 0.3) continue;
    let h =
      max === r
        ? (g - b) / d + (g < b ? 6 : 0)
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
    h /= 6;
    const bucket = buckets[Math.floor(h * 12) % 12];
    bucket.weight += s;
    bucket.r += data[i] * s;
    bucket.g += data[i + 1] * s;
    bucket.b += data[i + 2] * s;
    colored++;
  }
  // A mostly monochrome logo (a few coloured pixels from anti-aliasing) has no brand colour.
  if (!opaque || colored / opaque < 0.08) return null;
  const top = buckets.reduce((a, b) => (b.weight > a.weight ? b : a));
  const hex = (v: number) =>
    Math.round(v / top.weight)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(top.r)}${hex(top.g)}${hex(top.b)}`;
}

function analyse(bitmap: HTMLCanvasElement): LogoInfo {
  const aspect = bitmap.width / bitmap.height;
  try {
    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = Math.max(1, Math.round(size / aspect));
    const c = canvas.getContext("2d", { willReadFrequently: true })!;
    c.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const { data } = c.getImageData(0, 0, canvas.width, canvas.height);
    return { aspect, color: dominantColor(data) };
  } catch {
    // A cross-origin logo without CORS cannot be read: keep its shape only.
    return { aspect, color: null };
  }
}
