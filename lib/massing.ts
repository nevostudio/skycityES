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
/** Silhouette families shared by every tier (scaled to the tier's height). */
export type Archetype =
  "wide" | "block" | "slender" | "stepped" | "crowned" | "singular";
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
  archetype: Archetype;
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
  archetype: Archetype;
  volumes: Volume[];
  crown: Crown;
  pattern: BrandPattern;
  core?: boolean;
};
type Make = (h: number, g: number) => Shape;
/**
 * Reusable silhouettes. `h` is the tier height, `g` the ground floor height. Every volume stays
 * inside the plot footprint (|x| + w/2 <= 0.5, same for z/d).
 */
const ARCHETYPES = {
  /** Wide and low: the whole footprint under a deep overhanging roof slab. */
  wide: (): Make => (h) => ({
    archetype: "wide",
    volumes: [V(0, h, 1, 0.92, "body")],
    crown: "slab",
    pattern: "rooftop",
  }),
  /** Medium block with a parapet; a shopfront podium when `podium` is set. */
  block:
    (podium = false, pattern: BrandPattern = "facade"): Make =>
    (h, g) => ({
      archetype: "block",
      volumes: podium
        ? [
            V(0, Math.min(g, h - 1), 1, 1, "base"),
            V(Math.min(g, h - 1), h, 0.86, 0.84, "body"),
          ]
        : [V(0, h, 0.9, 0.88, "body")],
      crown: "parapet",
      pattern,
    }),
  /** Slender tower on a full-footprint podium. */
  slender:
    (crown: Crown = "cap", core = false): Make =>
    (h, g) => ({
      archetype: "slender",
      volumes: [
        V(0, g, 1, 1, "base"),
        V(g, h, 0.72, 0.74, "top", -0.04, -0.03),
      ],
      crown,
      pattern: "wrapped",
      core,
    }),
  /** Set-backs: two or three receding steps. */
  stepped:
    (steps: 2 | 3 = 3): Make =>
    (h, g) => {
      const a = Math.max(g, h * (steps === 3 ? 0.46 : 0.6));
      const b = steps === 3 ? Math.max(a + 1, h * 0.76) : h;
      return {
        archetype: "stepped",
        volumes:
          steps === 3 && b < h
            ? [
                V(0, a, 1, 1, "base"),
                V(a, b, 0.8, 0.8, "body"),
                V(b, h, 0.58, 0.6, "top"),
              ]
            : [V(0, a, 1, 0.96, "base"), V(a, h, 0.76, 0.76, "top")],
        crown: "parapet",
        pattern: "rooftop",
      };
    },
  /** A lantern block on the roof with a pronounced crown (cap or spire). */
  crowned:
    (crown: Crown = "cap"): Make =>
    (h) => {
      const lantern = Math.min(1.2, Math.max(0.8, h * 0.16));
      return {
        archetype: "crowned",
        volumes: [
          V(0, h - lantern, 0.92, 0.9, "body"),
          V(h - lantern, h, 0.62, 0.62, "top"),
        ],
        crown,
        pattern: "facade",
      };
    },
  /** Premium forms: twin towers, a cantilevered upper block, or a tower with a side wing. */
  singular:
    (form: "twin" | "cantilever" | "wing"): Make =>
    (h, g) => {
      if (form === "twin")
        return {
          archetype: "singular",
          volumes: [
            V(0, g + 1, 1, 1, "base"),
            V(g + 1, h, 0.42, 0.7, "top", -0.27, 0),
            V(g + 1, Math.max(g + 2, h * 0.78), 0.42, 0.7, "body", 0.27, 0),
          ],
          crown: "cap",
          pattern: "wrapped",
        };
      if (form === "cantilever")
        return {
          archetype: "singular",
          volumes: [
            V(0, h * 0.56, 0.66, 0.8, "body", -0.17, 0),
            V(h * 0.56, h, 1, 0.86, "top"),
          ],
          crown: "slab",
          pattern: "rooftop",
        };
      return {
        archetype: "singular",
        volumes: [
          V(0, g + 1, 1, 1, "base"),
          V(g + 1, h * 0.62, 0.32, 0.62, "body", 0.32, 0),
          V(g + 1, h, 0.62, 0.62, "top", -0.16, 0),
        ],
        crown: "slab",
        pattern: "facade",
      };
    },
};
const A = ARCHETYPES;
/**
 * Silhouette catalogue per tier: STARTER small and simple, PLUS gains height and a clear
 * top, PRO a proper tower, PREMIUM special volumes, LANDMARK iconic forms.
 */
const SHAPES: Record<BuildingTier, Make[]> = {
  STARTER: [
    A.wide(),
    A.block(),
    A.block(true, "rooftop"),
    A.crowned("parapet"),
  ],
  PLUS: [A.block(true), A.wide(), A.stepped(2), A.crowned("cap")],
  PRO: [
    A.slender("cap"),
    A.block(true),
    A.stepped(3),
    A.crowned("stepped"),
    A.wide(),
  ],
  PREMIUM: [
    A.stepped(3),
    A.singular("twin"),
    A.crowned("spire"),
    A.singular("cantilever"),
    A.slender("frame", true),
  ],
  LANDMARK: [
    A.slender("cap", true),
    A.stepped(3),
    A.singular("twin"),
    A.crowned("spire"),
    A.singular("cantilever"),
    A.singular("wing"),
  ],
  SKYSCRAPER: [
    (h, g) => ({
      archetype: "slender",
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
  const top = volumes.reduce((a, b) => (b.y1 > a.y1 ? b : a));
  return {
    volumes,
    top,
    crown,
    roof,
    glassTop: (arch === "corporate" || arch === "tech") && level >= 3,
    pattern: shape.pattern,
    core: !!shape.core,
    variant,
    archetype: shape.archetype,
    roofY: p.height + (roof === "gable" ? 0 : CROWN_HEIGHT[crown]),
  };
}
