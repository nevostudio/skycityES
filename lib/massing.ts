import type { BuildingTier } from "@/types";
import { GROUND_FLOOR_HEIGHT, presenceLevel } from "./presence";

/**
 * Building silhouettes. Each tier has several variants (STARTER 4, PLUS 4, PRO 5, PREMIUM 5,
 * LANDMARK 6) that change width, proportions, set-backs, base volume and crown, so buildings
 * no longer come out of one template. The total height of a tier never changes, and every
 * volume stays inside the plot footprint. Shared by the 3D city, its windows and the signs.
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

/** One box of the building, in plot-relative units (w/d/x/z are shares of the footprint). */
export type Volume = {
  y0: number;
  y1: number;
  w: number;
  d: number;
  x: number;
  z: number;
  role: "base" | "body" | "top";
};
export type Crown =
  "parapet" | "slab" | "stepped" | "frame" | "spire" | "block" | "cap";
/**
 * How the brand takes over the building:
 * - rooftop: the whole body in the brand colour, large rooftop sign;
 * - facade: neutral body, a dominant brand panel on the front;
 * - billboard: brand-tinted body and a large framed billboard;
 * - wrapped: the tower wrapped in the brand colour.
 */
export type BrandPattern = "rooftop" | "facade" | "billboard" | "wrapped";
export type Massing = {
  volumes: Volume[];
  /** The highest volume: the rooftop sign and crown stand on it. */
  top: Volume;
  crown: Crown;
  roof: "flat" | "gable" | "green";
  /** Non-brand towers in glass (financial and tech districts). */
  glassTop: boolean;
  pattern: BrandPattern;
  /** A vertical brand core running up the front. */
  core: boolean;
  variant: number;
  /** Height the rooftop sign starts at (top of the crown it stands on). */
  roofY: number;
};
export const VARIANTS: Record<BuildingTier, number> = {
  STARTER: 4,
  PLUS: 4,
  PRO: 5,
  PREMIUM: 5,
  LANDMARK: 6,
  SKYSCRAPER: 1,
};
const V = (
  y0: number,
  y1: number,
  w: number,
  d: number,
  role: Volume["role"],
  x = 0,
  z = 0,
): Volume => ({ y0, y1, w, d, x, z, role });
type Shape = {
  volumes: Volume[];
  crown: Crown;
  pattern: BrandPattern;
  core?: boolean;
};
/** Silhouette catalogue. `h` is the tier height, `g` the ground floor height. */
const SHAPES: Record<BuildingTier, ((h: number, g: number) => Shape)[]> = {
  STARTER: [
    (h) => ({
      volumes: [V(0, h, 0.92, 0.9, "body")],
      crown: "parapet",
      pattern: "rooftop",
    }),
    (h) => ({
      volumes: [V(0, h, 1, 0.84, "body")],
      crown: "slab",
      pattern: "facade",
    }),
    (h) => ({
      volumes: [V(0, h, 0.8, 0.94, "body")],
      crown: "block",
      pattern: "rooftop",
    }),
    (h) => ({
      volumes: [V(0, 1, 1, 1, "base"), V(1, h, 0.86, 0.86, "body")],
      crown: "parapet",
      pattern: "billboard",
    }),
  ],
  PLUS: [
    (h) => ({
      volumes: [V(0, h, 0.94, 0.9, "body")],
      crown: "parapet",
      pattern: "rooftop",
    }),
    (h, g) => ({
      volumes: [V(0, g, 1, 1, "base"), V(g, h, 0.84, 0.8, "body", 0, -0.06)],
      crown: "slab",
      pattern: "facade",
    }),
    (h) => ({
      volumes: [V(0, h, 0.82, 1, "body")],
      crown: "frame",
      pattern: "rooftop",
    }),
    (h) => ({
      volumes: [V(0, h - 1, 1, 0.86, "body"), V(h - 1, h, 0.8, 0.8, "top")],
      crown: "parapet",
      pattern: "billboard",
    }),
  ],
  PRO: [
    (h) => ({
      volumes: [V(0, h, 0.94, 0.9, "body")],
      crown: "parapet",
      pattern: "rooftop",
    }),
    (h, g) => ({
      volumes: [V(0, g, 1, 1, "base"), V(g, h, 0.82, 0.84, "body")],
      crown: "slab",
      pattern: "facade",
    }),
    (h) => ({
      volumes: [V(0, h, 0.8, 0.86, "body")],
      crown: "spire",
      pattern: "rooftop",
      core: true,
    }),
    (h) => ({
      volumes: [V(0, h - 1, 1, 0.82, "body"), V(h - 1, h, 0.78, 0.8, "top")],
      crown: "stepped",
      pattern: "billboard",
    }),
    (h) => ({
      volumes: [V(0, h, 0.92, 0.92, "body")],
      crown: "block",
      pattern: "facade",
    }),
  ],
  PREMIUM: [
    (h, g) => ({
      volumes: [V(0, g + 1, 1, 1, "base"), V(g + 1, h, 0.8, 0.8, "top")],
      crown: "parapet",
      pattern: "wrapped",
    }),
    (h, g) => ({
      volumes: [V(0, g, 1, 1, "base"), V(g, h, 0.74, 0.72, "top", 0, -0.1)],
      crown: "slab",
      pattern: "billboard",
    }),
    (h) => ({
      volumes: [
        V(0, h - 2, 0.94, 0.92, "body"),
        V(h - 2, h, 0.76, 0.74, "top"),
      ],
      crown: "stepped",
      pattern: "facade",
    }),
    (h, g) => ({
      volumes: [V(0, g + 1, 0.96, 0.96, "base"), V(g + 1, h, 0.9, 0.66, "top")],
      crown: "frame",
      pattern: "facade",
    }),
    (h) => ({
      volumes: [V(0, h, 0.82, 0.82, "body")],
      crown: "parapet",
      pattern: "rooftop",
      core: true,
    }),
  ],
  LANDMARK: [
    (h, g) => ({
      volumes: [V(0, g + 2, 1, 1, "base"), V(g + 2, h, 0.66, 0.66, "top")],
      crown: "cap",
      pattern: "wrapped",
    }),
    (h, g) => ({
      volumes: [
        V(0, g + 1, 1, 1, "base"),
        V(g + 1, h - 2, 0.74, 0.74, "body"),
        V(h - 2, h, 0.6, 0.6, "top"),
      ],
      crown: "stepped",
      pattern: "wrapped",
    }),
    (h, g) => ({
      volumes: [V(0, g + 2, 1, 1, "base"), V(g + 2, h, 0.6, 0.6, "top")],
      crown: "spire",
      pattern: "wrapped",
      core: true,
    }),
    (h) => ({
      volumes: [V(0, h, 0.84, 0.8, "top")],
      crown: "frame",
      pattern: "wrapped",
    }),
    (h, g) => ({
      volumes: [
        V(0, g + 1, 1, 1, "base"),
        V(g + 1, h * 0.62, 0.32, 0.62, "body", 0.32, 0),
        V(g + 1, h, 0.62, 0.62, "top", -0.16, 0),
      ],
      crown: "slab",
      pattern: "billboard",
    }),
    (h, g) => ({
      volumes: [V(0, g, 1, 1, "base"), V(g, h, 0.78, 0.74, "top")],
      crown: "slab",
      pattern: "facade",
    }),
  ],
  SKYSCRAPER: [
    (h, g) => ({
      volumes: [V(0, g + 3, 1, 1, "base"), V(g + 3, h, 0.66, 0.66, "top")],
      crown: "cap",
      pattern: "wrapped",
    }),
  ],
};
const CROWN_HEIGHT: Record<Crown, number> = {
  parapet: 0.26,
  slab: 0.16,
  stepped: 0.9,
  frame: 0.16,
  spire: 0.16,
  block: 0.16,
  cap: 0.3,
};
/** Stable variant per plot, so a building keeps its silhouette across reloads and upgrades. */
export const variantOf = (number: number, tier: BuildingTier) =>
  (number * 7 + 3) % VARIANTS[tier];

export function massing(p: {
  height: number;
  districtId: string;
  number?: number;
  building?: { tier: BuildingTier; kind?: "private" | "public" } | null;
}): Massing {
  const tier = p.building?.tier ?? "STARTER";
  const level = presenceLevel(tier);
  const arch = architectureOf(p.districtId);
  // City-owned buildings keep the calm first silhouette of their tier.
  const variant =
    p.building?.kind === "public" ? 0 : variantOf(p.number ?? 0, tier);
  const shape = SHAPES[tier][variant](p.height, GROUND_FLOOR_HEIGHT);
  const roof =
    arch === "historic" && level <= 2
      ? "gable"
      : arch === "riverside"
        ? "green"
        : "flat";
  const crown = roof === "gable" ? "slab" : shape.crown;
  const volumes = shape.volumes.map((v) => ({
    ...v,
    y1: Math.min(v.y1, p.height),
  }));
  const top = volumes.reduce((a, b) => (b.y1 >= a.y1 ? b : a));
  return {
    volumes,
    top,
    crown,
    roof,
    glassTop: (arch === "corporate" || arch === "tech") && level >= 3,
    pattern: shape.pattern,
    core: !!shape.core,
    variant,
    roofY: p.height + (roof === "gable" ? 0 : CROWN_HEIGHT[crown]),
  };
}
