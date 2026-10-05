import type { Ad } from "@/types";
import { DARK_INK, contrastInk, mark, signColors } from "./brand-theme";

/**
 * Canvas drawing shared by the 3D rooftop signs and the 2D preview in "Editar marca".
 * No three.js here, so the dashboard can render previews without loading the city.
 */
const FALLBACK = "Helvetica, Arial, sans-serif";
let display: string | null = null;
let ui: string | null = null;
/** Bricolage for names and figures on signs (PDF), Instrument Sans for short phrases. */
function family(kind: "display" | "ui") {
  if (typeof document === "undefined") return FALLBACK;
  const read = (v: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  if (kind === "display") display ??= read("--font-display");
  else ui ??= read("--font-ui");
  const name = kind === "display" ? display : ui;
  return name ? `${name}, ${FALLBACK}` : FALLBACK;
}
let ready: Promise<void> | null = null;
/** Resolves once the sign fonts can be drawn on a canvas (redraw after it). */
export function signFontsReady() {
  if (typeof document === "undefined") return Promise.resolve();
  return (ready ??= Promise.all([
    document.fonts.load(`800 40px ${family("display")}`),
    document.fonts.load(`500 40px ${family("ui")}`),
  ])
    .then(() => undefined)
    .catch(() => undefined));
}
const demoMarks = new Set([
  "Nova Labs",
  "Pixel Coffee",
  "Orbit Studio",
  "Green Market",
  "Moonlight Club",
]);
export type Bitmap = HTMLCanvasElement;

const images = new Map<string, Promise<Bitmap | null>>();
/**
 * Loads an image once and keeps a downscaled copy (never the original) for textures.
 * Failures resolve to null so the sign falls back to the brand initial.
 */
export function loadBitmap(url: string, max = 512): Promise<Bitmap | null> {
  const key = `${max}:${url}`;
  let pending = images.get(key);
  if (!pending) {
    pending = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => {
        const w = img.naturalWidth || img.width,
          h = img.naturalHeight || img.height;
        if (!w || !h) return resolve(null);
        const k = Math.min(1, max / Math.max(w, h));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w * k));
        canvas.height = Math.max(1, Math.round(h * k));
        const c = canvas.getContext("2d")!;
        c.imageSmoothingQuality = "high";
        c.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
    images.set(key, pending);
  }
  return pending;
}

function roundRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}
/** Largest font size (down to `min`) whose text fits in `width`. */
function fit(
  c: CanvasRenderingContext2D,
  text: string,
  width: number,
  start: number,
  min: number,
  weight: string,
  kind: "display" | "ui" = "display",
) {
  let size = start;
  c.font = `${weight} ${size}px ${family(kind)}`;
  while (size > min && c.measureText(text).width > width) {
    size -= 2;
    c.font = `${weight} ${size}px ${family(kind)}`;
  }
  return size;
}
function contain(
  c: CanvasRenderingContext2D,
  img: Bitmap,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const k = Math.min(w / img.width, h / img.height);
  const dw = img.width * k,
    dh = img.height * k;
  c.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
function cover(
  c: CanvasRenderingContext2D,
  img: Bitmap,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const k = Math.max(w / img.width, h / img.height);
  const sw = w / k,
    sh = h / k;
  c.drawImage(
    img,
    (img.width - sw) / 2,
    (img.height - sh) / 2,
    sw,
    sh,
    x,
    y,
    w,
    h,
  );
}
/** Average lightness (0–1) of a logo's opaque pixels: decides the plate it needs. */
const tones = new WeakMap<Bitmap, number>();
export function logoTone(logo: Bitmap) {
  let tone = tones.get(logo);
  if (tone !== undefined) return tone;
  tone = 0.5;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const c = canvas.getContext("2d", { willReadFrequently: true })!;
    c.drawImage(logo, 0, 0, 32, 32);
    const d = c.getImageData(0, 0, 32, 32).data;
    let sum = 0,
      n = 0;
    for (let i = 0; i < d.length; i += 4)
      if (d[i + 3] > 160) {
        sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        n++;
      }
    if (n) tone = sum / n;
  } catch {
    // Unreadable (cross-origin) logo: assume a mid tone.
  }
  tones.set(logo, tone);
  return tone;
}
/** Plate colour a logo needs on a background, or null when it already stands out. */
function plateFor(logo: Bitmap, background: string) {
  const tone = logoTone(logo),
    bg = luminance(normalizeColor(background));
  if (tone > 0.78 && bg > 0.6) return "#1c2826";
  if (tone < 0.25 && bg < 0.35) return "#fbf8f0";
  return null;
}
const normalizeColor = (color: string) => {
  if (color.startsWith("#")) return color;
  const m = color.match(/\d+/g);
  return m
    ? "#" +
        m
          .slice(0, 3)
          .map((v) => Number(v).toString(16).padStart(2, "0"))
          .join("")
    : "#888888";
};
/** Brand symbol when there is no logo: fictional demo marks or the initial on an accent disc. */
function emblem(
  c: CanvasRenderingContext2D,
  ad: Ad,
  x: number,
  y: number,
  size: number,
) {
  const { accent } = signColors(ad);
  if (demoMarks.has(ad.brand)) {
    mark(c, ad.brand, accent, x + size / 2, y + size / 2, size * 0.85);
    return;
  }
  c.fillStyle = accent;
  c.beginPath();
  c.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = contrastInk(accent);
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = `800 ${size * 0.56}px ${family("display")}`;
  c.fillText(
    ad.brand.trim().charAt(0).toUpperCase(),
    x + size / 2,
    y + size * 0.53,
  );
}

/**
 * Rooftop sign: logo + name + optional short phrase, with the accent as a base strip.
 * A wide (horizontal) logo already contains the name, so it replaces the text line.
 */
export function drawRooftopSign(
  canvas: HTMLCanvasElement,
  ad: Ad,
  logo: Bitmap | null,
  lit = false,
) {
  const c = canvas.getContext("2d")!;
  const W = canvas.width,
    H = canvas.height;
  const { background, accent, ink } = signColors(ad);
  c.clearRect(0, 0, W, H);
  c.fillStyle = background;
  roundRect(c, 0, 0, W, H, H * 0.06);
  c.fill();
  // Keep framing quiet so the logo and name occupy nearly the whole visible surface.
  const strip = H * 0.055;
  c.fillStyle = accent;
  c.fillRect(0, H - strip, W, strip);
  if (lit) {
    c.strokeStyle = accent;
    c.lineWidth = H * 0.014;
    roundRect(
      c,
      H * 0.018,
      H * 0.018,
      W - H * 0.036,
      H - strip - H * 0.024,
      H * 0.035,
    );
    c.stroke();
  }
  const pad = H * 0.065;
  const x0 = pad,
    y0 = pad,
    w = W - pad * 2,
    h = H - strip - pad * 1.35;
  const tagline = ad.tagline?.trim() || "";
  const name = ad.brand.trim().toUpperCase();
  c.textBaseline = "alphabetic";
  if (logo && logo.width / logo.height >= 2.2) {
    const logoH = tagline ? h * 0.6 : h;
    const plate = plateFor(logo, background);
    if (plate) {
      c.fillStyle = plate;
      roundRect(c, x0, y0, w, logoH, logoH * 0.08);
      c.fill();
    }
    contain(c, logo, x0 + w * 0.03, y0 + logoH * 0.08, w * 0.94, logoH * 0.84);
    if (tagline) {
      c.fillStyle = ink;
      c.globalAlpha = 0.82;
      c.textAlign = "center";
      fit(c, tagline, w, h * 0.27, h * 0.15, "500", "ui");
      c.fillText(tagline, W / 2, y0 + h * 0.95, w);
      c.globalAlpha = 1;
    }
    return;
  }
  const icon = h;
  if (logo) {
    const plate =
      plateFor(logo, background) ?? (ink !== DARK_INK ? "#fbf8f0" : null);
    if (plate) {
      // A contrasting tile keeps light logos on light signs (and dark on dark) readable.
      c.fillStyle = plate;
      roundRect(c, x0, y0, icon, icon, icon * 0.08);
      c.fill();
      contain(
        c,
        logo,
        x0 + icon * 0.04,
        y0 + icon * 0.04,
        icon * 0.92,
        icon * 0.92,
      );
    } else contain(c, logo, x0, y0, icon, icon);
  } else emblem(c, ad, x0 + icon * 0.03, y0 + icon * 0.03, icon * 0.94);
  const tx = x0 + icon + pad * 0.5,
    tw = W - pad - tx;
  c.textAlign = "left";
  c.fillStyle = ink;
  const size = fit(c, name, tw, tagline ? h * 0.58 : h * 0.72, h * 0.26, "800");
  c.fillText(name, tx, tagline ? y0 + h * 0.5 : y0 + h / 2 + size * 0.36, tw);
  if (tagline) {
    c.globalAlpha = 0.8;
    fit(c, tagline, tw, h * 0.25, h * 0.14, "500", "ui");
    c.fillText(tagline, tx, y0 + h * 0.92, tw);
    c.globalAlpha = 1;
  }
}

/** Advertising image (cover) or, without one, the brand's logo/emblem on its sign colors. */
export function drawSupportImage(
  canvas: HTMLCanvasElement,
  ad: Ad,
  image: Bitmap | null,
  logo: Bitmap | null,
) {
  const c = canvas.getContext("2d")!;
  const W = canvas.width,
    H = canvas.height;
  const { background, accent } = signColors(ad);
  c.clearRect(0, 0, W, H);
  if (image) {
    cover(c, image, 0, 0, W, H);
    return;
  }
  c.fillStyle = background;
  c.fillRect(0, 0, W, H);
  c.fillStyle = accent;
  c.fillRect(0, H * 0.92, W, H * 0.08);
  const box = Math.min(W, H) * 0.7;
  if (logo) contain(c, logo, (W - W * 0.8) / 2, (H - box) / 2, W * 0.8, box);
  else emblem(c, ad, (W - box) / 2, (H - box) / 2, box);
}

/** Vertical banner (lona vertical) for PREMIUM and LANDMARK: brand colour and its emblem. */
export function drawVerticalBanner(
  canvas: HTMLCanvasElement,
  ad: Ad,
  logo: Bitmap | null,
) {
  const c = canvas.getContext("2d")!;
  const W = canvas.width,
    H = canvas.height;
  const { accent } = signColors(ad);
  c.clearRect(0, 0, W, H);
  c.fillStyle = accent;
  c.fillRect(0, 0, W, H);
  const disc = W * 0.62;
  const x = (W - disc) / 2,
    y = W * 0.24;
  c.fillStyle = "#fbf8f1";
  c.beginPath();
  c.arc(W / 2, y + disc / 2, disc / 2, 0, Math.PI * 2);
  c.fill();
  if (logo)
    contain(
      c,
      logo,
      x + disc * 0.16,
      y + disc * 0.16,
      disc * 0.68,
      disc * 0.68,
    );
  else {
    c.fillStyle = accent;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `800 ${disc * 0.56}px ${family("display")}`;
    c.fillText(ad.brand.trim().charAt(0).toUpperCase(), W / 2, y + disc * 0.53);
  }
  c.fillStyle = "rgba(251, 248, 241, 0.55)";
  c.fillRect(W * 0.38, y + disc + W * 0.3, W * 0.24, W * 0.04);
}

/** Facade screen (Distrito de Ocio): a lit panel with the brand emblem. */
export function drawScreen(
  canvas: HTMLCanvasElement,
  ad: Ad,
  logo: Bitmap | null,
) {
  const c = canvas.getContext("2d")!;
  const W = canvas.width,
    H = canvas.height;
  const { accent } = signColors(ad);
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#1c2629");
  g.addColorStop(1, "#2c3438");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.fillStyle = accent;
  c.globalAlpha = 0.85;
  c.fillRect(0, H * 0.86, W, H * 0.14);
  c.globalAlpha = 1;
  const box = H * 0.62;
  if (logo) contain(c, logo, (W - W * 0.6) / 2, H * 0.1, W * 0.6, box);
  else emblem(c, ad, (W - box) / 2, H * 0.1, box);
}

/**
 * Brand panel built into the facade. An uploaded image fills it as a large visual; otherwise
 * the logo (or the brand emblem) sits large on a plate that contrasts with the brand-coloured
 * body, next to the name when the panel is wide, above it when it is tall. A wide logo that
 * already contains the name fills the plate on its own.
 */
export function drawBrandPanel(
  canvas: HTMLCanvasElement,
  ad: Ad,
  colors: { primary: string; secondary: string; deep: string },
  image: Bitmap | null,
  logo: Bitmap | null,
) {
  const c = canvas.getContext("2d")!;
  const W = canvas.width,
    H = canvas.height;
  c.clearRect(0, 0, W, H);
  if (image) {
    // Promotional art fills the panel unless that would crop more than ~20%; then it is shown
    // whole on the brand colour instead of losing its edges (and its text).
    const mismatch = Math.max(
      image.width / image.height / (W / H),
      W / H / (image.width / image.height),
    );
    if (mismatch <= 1.25) cover(c, image, 0, 0, W, H);
    else {
      c.fillStyle = colors.primary;
      c.fillRect(0, 0, W, H);
      contain(c, image, 0, 0, W, H);
    }
    return;
  }
  // The plate contrasts with the logo when there is one, otherwise with the brand body.
  const light = logo ? logoTone(logo) > 0.78 : luminance(colors.primary) > 0.62;
  const plate = light ? "#1c2826" : "#fbf8f1";
  const ink = light
    ? "#fbf8f1"
    : luminance(colors.primary) < 0.5
      ? colors.primary
      : colors.deep;
  c.fillStyle = plate;
  c.fillRect(0, 0, W, H);
  const pad = Math.min(W, H) * 0.12;
  const name = ad.brand.trim();
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = ink;
  if (logo && logo.width / logo.height > 2.2) {
    contain(c, logo, pad, pad, W - pad * 2, H - pad * 2);
    return;
  }
  const symbol = (x: number, y: number, size: number) =>
    logo ? contain(c, logo, x, y, size, size) : emblem(c, ad, x, y, size);
  if (W / H >= 2.6) {
    // Very wide: symbol on the left, the name filling the rest.
    const size = H - pad * 2;
    symbol(pad, pad, size);
    const left = pad * 2 + size,
      room = W - left - pad;
    const font = fit(c, name, room, Math.round(H * 0.5), 18, "800");
    c.textAlign = "left";
    c.fillStyle = ink;
    c.font = `800 ${font}px ${family("display")}`;
    c.fillText(name, left, H / 2 + font * 0.04);
  } else {
    // Otherwise the symbol on top and the name below it, across the full width.
    // Square logos are the panel: as large as the name below still allows.
    const size = Math.min(W - pad * 2, H * (logo ? 0.62 : 0.5));
    symbol((W - size) / 2, pad * 0.9, size);
    const room = H - pad * 1.6 - size;
    const font = fit(c, name, W - pad * 1.2, Math.round(room * 0.8), 16, "800");
    c.fillStyle = ink;
    c.font = `800 ${font}px ${family("display")}`;
    c.fillText(name, W / 2, pad * 0.9 + size + room / 2 + font * 0.04);
  }
}
const luminance = (hex: string) => {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  return (
    (0.2126 * ((n >> 16) & 255) +
      0.7152 * ((n >> 8) & 255) +
      0.0722 * (n & 255)) /
    255
  );
};
