import type { Ad, BuildingTier, ImageSupport } from "@/types";
import { presenceLevel } from "./presence";

export const TAGLINE_MAX = 60;
export const IMAGE_SUPPORTS = [
  "SIDE_BILLBOARD",
  "PARTIAL_FACADE",
  "FULL_FACADE",
  "VERTICAL_SCREEN",
] as const satisfies readonly ImageSupport[];
export const SUPPORT_LABELS: Record<ImageSupport, string> = {
  SIDE_BILLBOARD: "Valla lateral",
  PARTIAL_FACADE: "Fachada parcial",
  FULL_FACADE: "Fachada completa",
  VERTICAL_SCREEN: "Pantalla vertical",
};
/** Smallest building that can carry each advertising image support. */
export const SUPPORT_MIN_TIER: Record<ImageSupport, BuildingTier> = {
  SIDE_BILLBOARD: "PLUS",
  PARTIAL_FACADE: "PRO",
  FULL_FACADE: "PREMIUM",
  VERTICAL_SCREEN: "LANDMARK",
};
export const supportAllowed = (support: ImageSupport, tier: BuildingTier) =>
  presenceLevel(tier) >= presenceLevel(SUPPORT_MIN_TIER[support]);
/** The owner's chosen support, or the closest one this building can carry. */
export function effectiveSupport(
  ad: Pick<Ad, "support">,
  tier: BuildingTier,
): ImageSupport | null {
  if (ad.support && supportAllowed(ad.support, tier)) return ad.support;
  const fallback = [...IMAGE_SUPPORTS]
    .slice(0, IMAGE_SUPPORTS.indexOf(ad.support || "SIDE_BILLBOARD") + 1)
    .reverse()
    .find((s) => supportAllowed(s, tier));
  return fallback ?? null;
}

export type SignSpec = {
  width: number;
  height: number;
  /** Clearance between roof and sign. */
  lift: number;
  /** Texture width in pixels. */
  pixels: number;
  lit: boolean;
};
/**
 * Clear progression from a readable base sign to a city-scale landmark sign. These are
 * deliberately broad: the facade does the primary branding work, while the roof sign acts as
 * a large second read above the skyline.
 */
export const ROOFTOP_SIGN: Record<BuildingTier, SignSpec> = {
  STARTER: { width: 2.8, height: 1.12, lift: 0.28, pixels: 768, lit: false },
  PLUS: { width: 3.35, height: 1.38, lift: 0.32, pixels: 896, lit: false },
  PRO: { width: 3.9, height: 1.68, lift: 0.36, pixels: 1024, lit: false },
  PREMIUM: { width: 4.55, height: 2.05, lift: 0.42, pixels: 1280, lit: true },
  LANDMARK: { width: 5.2, height: 2.45, lift: 0.5, pixels: 1280, lit: true },
  SKYSCRAPER: { width: 6, height: 2.8, lift: 0.58, pixels: 1536, lit: true },
};
/**
 * Rooftop signs turn towards the city's default viewpoint (the camera's azimuth), so names
 * read from a medium distance instead of being foreshortened.
 */
export const SIGN_YAW = 0.55;
/** Signs never exceed this much of the roof width, nor the room left by neighbours. */
export const SIGN_ROOF_RATIO = 1.85;
export function signSize(
  tier: BuildingTier,
  roofWidth: number,
  maxWidth = Infinity,
): SignSpec {
  const spec = ROOFTOP_SIGN[tier];
  const width = Math.min(spec.width, roofWidth * SIGN_ROOF_RATIO, maxWidth);
  const k = width / spec.width;
  return { ...spec, width, height: spec.height * Math.max(k, 0.75) };
}
/**
 * Basic overlap prevention: a sign may only use half of the gap to the nearest built neighbour
 * in its row, so two adjacent signs can never touch.
 */
export function signLimits(
  buildings: { id: string; x: number; z: number; depth: number }[],
  margin = 0.3,
) {
  const limits: Record<string, number> = {};
  // A turned sign spans cos(yaw) of its width across the row.
  const across = Math.cos(SIGN_YAW);
  for (const a of buildings) {
    let nearest = Infinity;
    for (const b of buildings) {
      if (a.id === b.id || Math.abs(a.z - b.z) > (a.depth + b.depth) / 2)
        continue;
      nearest = Math.min(nearest, Math.abs(a.x - b.x));
    }
    limits[a.id] = Math.max(0.8, (nearest - margin) / across);
  }
  return limits;
}
