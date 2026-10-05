import type { BuildingTier } from "@/types";
import { presenceLevel } from "./presence";

/**
 * Branding composition rules, shared by every building. The architecture already wears the
 * brand colour (see BrandPalette); this decides which supports carry the logo or image and how
 * large they are:
 *
 * - STARTER: one brand zone, a facade plate (no rooftop sign).
 * - PLUS: a clear rooftop sign and a wider front panel; base accent.
 * - PRO: rooftop sign and a front panel; a side panel when the image asks for it.
 * - PREMIUM: lit rooftop sign, a large branded facade and a side panel or vertical band.
 * - LANDMARK: everything, at city scale: front, side, vertical band and lit sign.
 *
 * Logos are shown whole (`contain`) on a contrasting plate; promotional images fill their
 * panel (`cover`). A horizontal logo gets a wide, low panel; a square one a large square one.
 */
export type PanelContent = "logo" | "image";
export type PanelPlan = {
  /** Share of the facade width. */
  share: number;
  /** Height / width. */
  ratio: number;
  /** Maximum height in world units. */
  cap: number;
  content: PanelContent;
  /** Sideways shift as a share of the face width (room for a vertical band). */
  offset: number;
};
export type BrandPlan = {
  rooftop: boolean;
  front: PanelPlan;
  side: PanelPlan | null;
  band: boolean;
  /** Contrasting band at the top of the ground floor. */
  baseAccent: boolean;
  /** Contrasting crown (parapet, cap, lantern) at the top of the building. */
  crownAccent: boolean;
};
const FRONT: [share: number, ratio: number, cap: number][] = [
  [0.86, 0.6, 1.55],
  [0.9, 0.72, 2.1],
  [0.94, 0.9, 3.1],
  [0.97, 1.28, 5.2],
  [0.99, 2.05, 9.5],
  [0.99, 2.15, 13],
];
/** Height / width of panels showing promotional art (close to 16:9 artwork). */
const IMAGE_RATIO = 0.64;
/** Logo shape → panel proportions: wide logos get wide panels, square logos large squares. */
function fitLogo(ratio: number, aspect: number | undefined, level: number) {
  if (!aspect) return ratio;
  if (aspect >= 2.2) return Math.min(ratio, Math.max(0.45, 1.5 / aspect));
  if (aspect <= 1.4 && level >= 1) return Math.max(ratio, 0.9);
  return ratio;
}
export function brandPlan({
  tier,
  variant,
  roofless,
  hasImage,
  sideSupport,
  logoAspect,
}: {
  tier: BuildingTier;
  variant: number;
  /** Pitched roofs carry no rooftop sign. */
  roofless: boolean;
  /** An uploaded promotional image. */
  hasImage: boolean;
  /** The brand asked for a side billboard. */
  sideSupport: boolean;
  /** Width / height of the uploaded logo, once known. */
  logoAspect?: number;
}): BrandPlan {
  const level = presenceLevel(tier);
  const [share, baseRatio, cap] = FRONT[Math.min(level, 5)];
  const wantsSide = hasImage && sideSupport;
  // Promotional art goes where it is largest: the front from PREMIUM up, else where asked.
  const frontImage = hasImage && (level >= 3 || !wantsSide);
  // An image takes the whole front; the vertical band only accompanies a logo panel.
  const band =
    !frontImage && (level >= 4 || (level === 3 && variant % 2 === 0));
  const sided =
    level >= 4 || (level === 3 && !band) || (level >= 2 && wantsSide);
  // Promotional art is landscape: a wide panel shows it whole instead of a tall crop.
  const frontRatio = frontImage
    ? Math.min(baseRatio, IMAGE_RATIO)
    : fitLogo(baseRatio, logoAspect, level);
  const sideImage = wantsSide && !frontImage;
  return {
    rooftop: !roofless && level >= 1,
    front: {
      share: band ? Math.min(share, level >= 4 ? 0.76 : 0.7) : share,
      ratio: frontRatio,
      cap,
      content: frontImage ? "image" : "logo",
      offset: band ? 0.115 : 0,
    },
    side: sided
      ? {
          share: level >= 4 ? 0.94 : level >= 3 ? 0.86 : 0.78,
          ratio: sideImage
            ? IMAGE_RATIO
            : level >= 4
              ? 2
              : level >= 3
                ? 1.6
                : 1.1,
          cap: level >= 4 ? 9 : level === 3 ? 5.5 : 3.2,
          content: sideImage ? "image" : "logo",
          offset: 0,
        }
      : null,
    band,
    baseAccent: level >= 1,
    crownAccent: level >= 2,
  };
}
