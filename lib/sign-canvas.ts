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
  const strip = H * 0.085;
  c.fillStyle = accent;
  c.fillRect(0, H - strip, W, strip);
  if (lit) {
    c.strokeStyle = accent;
    c.lineWidth = H * 0.025;
    roundRect(
      c,
      H * 0.03,
      H * 0.03,
      W - H * 0.06,
      H - strip - H * 0.04,
      H * 0.05,
    );
    c.stroke();
  }
  const pad = H * 0.13;
  const x0 = pad,
    y0 = pad,
    w = W - pad * 2,
    h = H - strip - pad * 1.7;
  const tagline = ad.tagline?.trim() || "";
  const name = ad.brand.trim().toUpperCase();
  c.textBaseline = "alphabetic";
  if (logo && logo.width / logo.height >= 2.2) {
    const logoH = tagline ? h * 0.6 : h;
    contain(c, logo, x0, y0, w, logoH);
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
    if (ink !== DARK_INK) {
      // Light tile behind logos on dark signs keeps transparent dark logos readable.
      c.fillStyle = "#fbf8f0";
      roundRect(c, x0, y0, icon, icon, icon * 0.14);
      c.fill();
      contain(
        c,
        logo,
        x0 + icon * 0.08,
        y0 + icon * 0.08,
        icon * 0.84,
        icon * 0.84,
      );
    } else contain(c, logo, x0, y0, icon, icon);
  } else emblem(c, ad, x0 + icon * 0.06, y0 + icon * 0.06, icon * 0.88);
  const tx = x0 + icon + pad * 0.75,
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
 * Dominant brand panel (front or side): the advertising image when there is one, otherwise
 * the logo (or initial) large on the brand colour, readable at normal zoom.
 */
export function drawBrandPanel(
  canvas: HTMLCanvasElement,
  ad: Ad,
  colors: { primary: string; secondary: string },
  image: Bitmap | null,
  logo: Bitmap | null,
) {
  const c = canvas.getContext("2d")!;
  const W = canvas.width,
    H = canvas.height;
  c.clearRect(0, 0, W, H);
  if (image) {
    cover(c, image, 0, 0, W, H);
    return;
  }
  c.fillStyle = colors.primary;
  c.fillRect(0, 0, W, H);
  const tile = Math.min(W, H) * 0.7;
  const x = (W - tile) / 2,
    y = (H - tile) / 2;
  c.fillStyle = "#fbf8f1";
  roundRect(c, x, y, tile, tile, tile * 0.2);
  c.fill();
  if (logo)
    contain(
      c,
      logo,
      x + tile * 0.12,
      y + tile * 0.12,
      tile * 0.76,
      tile * 0.76,
    );
  else {
    c.fillStyle = colors.primary;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `800 ${tile * 0.6}px ${family("display")}`;
    c.fillText(ad.brand.trim().charAt(0).toUpperCase(), W / 2, y + tile * 0.54);
  }
  c.strokeStyle = colors.secondary;
  c.lineWidth = Math.min(W, H) * 0.04;
  c.strokeRect(
    c.lineWidth / 2,
    c.lineWidth / 2,
    W - c.lineWidth,
    H - c.lineWidth,
  );
}
