import type { BuildingTier } from "@/types";
import { GROUND_FLOOR_HEIGHT, FLOOR_HEIGHT, presenceLevel } from "./presence";

/**
 * Building silhouettes from the redesign (PDF page 3), shared by the 3D city, its windows and
 * the rooftop sign. Footprint and total height never change; only the form does.
 */
export type Architecture =
  | "commercial"
  | "corporate"
  | "tech"
  | "leisure"
  | "historic"
  | "riverside"
  | "residential";
export const ARCHITECTURE: Record<string, Architecture> = {
  downtown: "commercial",
  "business-district": "corporate",
  "tech-district": "tech",
  "entertainment-district": "leisure",
  "old-town": "historic",
  riverside: "riverside",
  "residential-district": "residential",
};
export const architectureOf = (districtId: string): Architecture =>
  ARCHITECTURE[districtId] || "commercial";

export type Massing = {
  /** Height of the full-footprint base (equals the total height without setback). */
  podium: number;
  /** Footprint share of the upper volume. */
  top: number;
  roof: "flat" | "gable" | "green";
  /** Upper volume rendered as glass (towers). */
  glassTop: boolean;
};
export function massing(p: {
  height: number;
  districtId: string;
  building?: { tier: BuildingTier } | null;
}): Massing {
  const tier = p.building?.tier ?? "STARTER";
  const level = presenceLevel(tier);
  const arch = architectureOf(p.districtId);
  const roof =
    arch === "historic" && level <= 2
      ? "gable"
      : arch === "riverside"
        ? "green"
        : "flat";
  // PREMIUM: two-floor base and a set-back body. LANDMARK and towers: stone base + glass tower.
  if (tier === "LANDMARK" || tier === "SKYSCRAPER")
    return {
      podium: GROUND_FLOOR_HEIGHT + 2 * FLOOR_HEIGHT,
      top: 0.66,
      roof: roof === "gable" ? "flat" : roof,
      glassTop: true,
    };
  if (tier === "PREMIUM")
    return {
      podium: GROUND_FLOOR_HEIGHT + FLOOR_HEIGHT,
      top: 0.8,
      roof: roof === "gable" ? "flat" : roof,
      glassTop: arch === "corporate" || arch === "tech",
    };
  return { podium: p.height, top: 1, roof, glassTop: false };
}
/** Width of the roof the rooftop sign stands on. */
export const roofWidth = (
  p: Parameters<typeof massing>[0] & { width: number },
) => p.width * massing(p).top;
