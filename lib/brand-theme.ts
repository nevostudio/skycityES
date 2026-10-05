import type { Ad } from "@/types";
import { isShowcaseAd } from "./plots";

/** Darkens a #rrggbb color (factor < 1). */
export function scale(hex: string, factor: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(Math.min(255, v * factor)),
  );
  return `rgb(${c.join(",")})`;
}
/** Mixes a #rrggbb color into the city's warm off-white (amount = share of the color). */
export function tint(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16),
    base = [243, 239, 229];
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v, i) =>
    Math.round(base[i] + (v - base[i]) * amount),
  );
  return `rgb(${c.join(",")})`;
}
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Readable text color on top of a background. */
export const DARK_INK = "#14211c";
export const contrastInk = (background: string) =>
  luminance(background) > 0.36 ? DARK_INK : "#fbf8f0";

export function brandKind(ad: Ad) {
  const kinds: Record<string, string> = {
    "Pixel Coffee": "cafe",
    "Moonlight Club": "nightlife",
    "Green Market": "garden",
    "Nova Labs": "lab",
    "Orbit Studio": "studio",
    Hyperbyte: "digital",
  };
  return isShowcaseAd(ad) ? kinds[ad.brand] || "custom" : "custom";
}
export function brandTheme(ad: Ad) {
  const demo = isShowcaseAd(ad);
  const palette: Record<
    string,
    { accent: string; background: string; ink: string }
  > = {
    "Nova Labs": { accent: "#e87940", background: "#f5f1e7", ink: "#20342e" },
    "Pixel Coffee": {
      accent: "#c59059",
      background: "#614836",
      ink: "#fff1d9",
    },
    "Moonlight Club": {
      accent: "#aa63e6",
      background: "#2b263d",
      ink: "#ecd6ff",
    },
    "Green Market": {
      accent: "#78994f",
      background: "#d1ddba",
      ink: "#345337",
    },
    "Orbit Studio": {
      accent: "#d1a582",
      background: "#38393b",
      ink: "#faf3e5",
    },
    Hyperbyte: { accent: "#6daabd", background: "#253e49", ink: "#e9f6f7" },
  };
  const originalColors: Record<string, string> = {
    "Nova Labs": "#648688",
    "Pixel Coffee": "#895f48",
    "Orbit Studio": "#81719f",
    "Green Market": "#73966f",
    "Moonlight Club": "#b08499",
    Hyperbyte: "#6481a3",
  };
  return demo &&
    palette[ad.brand] &&
    ad.primary === originalColors[ad.brand] &&
    ad.secondary === "#fcf5e9"
    ? palette[ad.brand]
    : {
        accent: ad.primary,
        // Walls take a light tint of the brand color; the pure color goes to the accents.
        background: tint(ad.primary, 0.45),
        ink: ad.secondary,
      };
}
export function mark(
  c: CanvasRenderingContext2D,
  brand: string,
  color: string,
  x: number,
  y: number,
  size: number,
) {
  c.save();
  c.translate(x, y);
  c.scale(size / 100, size / 100);
  c.fillStyle = color;
  c.strokeStyle = color;
  c.lineWidth = 5;
  if (brand === "Nova Labs") {
    c.beginPath();
    c.moveTo(0, -43);
    c.lineTo(39, -20);
    c.lineTo(0, 3);
    c.lineTo(-39, -20);
    c.closePath();
    c.fill();
    c.globalAlpha = 0.85;
    c.beginPath();
    c.moveTo(-39, -15);
    c.lineTo(-3, 8);
    c.lineTo(-3, 48);
    c.lineTo(-39, 25);
    c.closePath();
    c.fill();
    c.globalAlpha = 0.6;
    c.beginPath();
    c.moveTo(3, 8);
    c.lineTo(39, -15);
    c.lineTo(39, 25);
    c.lineTo(3, 48);
    c.closePath();
    c.fill();
  } else if (brand === "Pixel Coffee") {
    c.beginPath();
    c.moveTo(-31, -14);
    c.lineTo(-27, 15);
    c.quadraticCurveTo(0, 42, 26, 15);
    c.lineTo(31, -14);
    c.closePath();
    c.stroke();
    c.beginPath();
    c.ellipse(36, -1, 13, 12, 0, -1.7, 1.7);
    c.stroke();
    c.beginPath();
    c.moveTo(-38, 35);
    c.lineTo(36, 35);
    c.stroke();
    for (const dx of [-13, 7]) {
      c.beginPath();
      c.moveTo(dx, -27);
      c.bezierCurveTo(dx - 17, -40, dx + 15, -40, dx, -56);
      c.stroke();
    }
  } else if (brand === "Orbit Studio") {
    c.beginPath();
    c.ellipse(0, 0, 28, 43, 0.45, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.ellipse(0, 0, 50, 20, -0.4, 0, Math.PI * 2);
    c.stroke();
  } else if (brand === "Green Market") {
    c.beginPath();
    c.ellipse(-17, -5, 17, 35, -0.5, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(20, 6, 17, 31, 0.55, 0, Math.PI * 2);
    c.fill();
  } else if (brand === "Moonlight Club") {
    c.beginPath();
    c.arc(0, 0, 39, 0.45, 5.35);
    c.stroke();
    c.beginPath();
    c.arc(14, -4, 29, 1.25, 4.45);
    c.stroke();
  } else {
    c.font = "bold 92px sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(brand.slice(0, 1).toUpperCase(), 0, 0);
  }
  c.restore();
}

/** Rooftop sign colors: the owner's "sign background" + accent, with automatic text contrast. */
export function signColors(ad: Ad) {
  if (isShowcaseAd(ad) && brandTheme(ad).accent !== ad.primary)
    return brandTheme(ad);
  const background = /^#[0-9a-f]{6}$/i.test(ad.secondary)
    ? ad.secondary
    : "#fcf5e9";
  return {
    background,
    accent: ad.primary,
    ink: contrastInk(background),
  };
}

const toRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const toHex = (rgb: number[]) =>
  "#" +
  rgb
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
/** Slightly richer brand colour for façades, kept away from neon and from pure black. */
export function saturate(hex: string, amount = 1.18) {
  const [r, g, b] = toRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h =
      max === r
        ? (g - b) / d + (g < b ? 6 : 0)
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
    h /= 6;
  }
  s = Math.min(1, s * amount);
  // Neutral light brands (white) stay near-white; coloured ones keep enough depth to read.
  const L = Math.min(s < 0.08 ? 0.92 : 0.66, Math.max(0.2, l));
  const q = L < 0.5 ? L * (1 + s) : L + s - L * s,
    pp = 2 * L - q;
  const hue = (t: number) => {
    t = (t + 1) % 1;
    return t < 1 / 6
      ? pp + (q - pp) * 6 * t
      : t < 1 / 2
        ? q
        : t < 2 / 3
          ? pp + (q - pp) * (2 / 3 - t) * 6
          : pp;
  };
  return s === 0
    ? toHex([L * 255, L * 255, L * 255])
    : toHex([hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255]);
}
export type BrandPalette = {
  /** Dominant brand colour on the architecture. */
  primary: string;
  /** Contrasting neutral: frames, plinths, crowns, awnings, bands. */
  secondary: string;
  /** Darker brand tone for bases and shaded accents. */
  deep: string;
  /** Light brand tint for billboard-style bodies. */
  tint: string;
  /** Window glass that reads on the brand colour. */
  window: string;
};
/** Colour every new ad starts with (the brand form's default). */
export const DEFAULT_BRAND_PRIMARY = "#e77d59";
/** What the logo tells about the brand once it has loaded (see lib/logo-info). */
export type LogoInfo = {
  /** Dominant saturated colour of the logo, or null when it is monochrome. */
  color: string | null;
  /** Width / height. */
  aspect: number;
};
const isNeutral = (hex: string) => {
  const [r, g, b] = toRgb(hex);
  return Math.max(r, g, b) - Math.min(r, g, b) < 24;
};
/**
 * Brands that left the default colour, or chose white/grey/black, take their building colour
 * from their logo instead (IKEA's blue rather than a white box), so neighbours stay distinct.
 */
export const borrowsLogoColor = (ad: Ad) => {
  if (!ad.logo) return false;
  const primary = normalize(ad.primary).toLowerCase();
  return primary === DEFAULT_BRAND_PRIMARY || isNeutral(primary);
};
/**
 * Brand palette for the architecture: the dominant primary, a contrasting secondary for
 * bands, bases and crowns, a deep tone for frames and glass that reads on the body. Very dark
 * brands get lighter frames and glass so the volume keeps its edges.
 */
export function brandPalette(ad: Ad, logo?: LogoInfo | null): BrandPalette {
  const source =
    logo?.color && borrowsLogoColor(ad) ? logo.color : normalize(ad.primary);
  const primary = saturate(source);
  const own = /^#[0-9a-f]{6}$/i.test(ad.secondary) ? ad.secondary : "#fcf5e9";
  const secondary =
    Math.abs(luminance(own) - luminance(primary)) > 0.3
      ? own
      : luminance(primary) > 0.4
        ? "#17322a"
        : "#f3eee3";
  const lum = luminance(primary);
  const rgb = toRgb(primary);
  return {
    primary,
    secondary,
    deep:
      lum < 0.05
        ? toHex(rgb.map((v) => v + (255 - v) * 0.3))
        : toHex(rgb.map((v) => v * (lum > 0.8 ? 0.8 : 0.62))),
    tint: toHex(rgb.map((v, i) => v + ([243, 239, 229][i] - v) * 0.24)),
    window: lum < 0.12 ? "#c3d3d4" : lum > 0.5 ? "#2a4540" : "#1d3330",
  };
}
/** Accepts #rrggbb or rgb(r,g,b) and returns #rrggbb. */
function normalize(color: string) {
  if (color.startsWith("#")) return color;
  const m = color.match(/\d+/g);
  return m ? toHex(m.slice(0, 3).map(Number)) : "#888888";
}
