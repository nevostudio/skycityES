import type { BuildingTier } from "@/types";

/**
 * Isometric building illustrations from the redesign (PDF page 3): if you pay more, your
 * building shows more. Same footprint for every tier; only the form and its branding grow.
 */
type Pt = [number, number];
const COS = Math.cos(Math.PI / 6),
  SIN = 0.5;
const SPEC: Record<
  BuildingTier,
  { floors: number; podium: number; top: number }
> = {
  STARTER: { floors: 2, podium: 2, top: 1 },
  PLUS: { floors: 3, podium: 3, top: 1 },
  PRO: { floors: 5, podium: 5, top: 1 },
  PREMIUM: { floors: 8, podium: 3, top: 0.78 },
  LANDMARK: { floors: 13, podium: 3, top: 0.64 },
  SKYSCRAPER: { floors: 20, podium: 4, top: 0.64 },
};
const FLOOR = 0.42,
  GROUND = 0.62;
const poly = (pts: Pt[]) =>
  pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ");

export function TierArt({
  tier,
  color = "#e8663a",
  initial = "T",
  glass = false,
  roof = "flat",
  scale = 13,
  className = "",
  label,
  fit,
}: {
  tier: BuildingTier;
  color?: string;
  initial?: string;
  /** Glass upper volume (financial and tech districts, towers). */
  glass?: boolean;
  roof?: "flat" | "gable" | "green";
  scale?: number;
  className?: string;
  label?: string;
  /**
   * "row": every tier in the same crop and scale, so a row of cards shows the hierarchy;
   * "single": cropped to this building, for one large preview.
   */
  fit?: "row" | "single";
}) {
  const spec = SPEC[tier];
  const W = 120,
    H = 150;
  const ox = W / 2,
    oy = H - 34;
  const S = scale;
  const P = (x: number, y: number, z: number): Pt => [
    ox + (x - z) * COS * S,
    oy + (x + z) * SIN * S - y * S,
  ];
  const heightOf = (floors: number) => GROUND + (floors - 1) * FLOOR;
  const total = heightOf(spec.floors);
  const podium = spec.top < 1 ? heightOf(spec.podium) : total;
  const half = 1.05;
  const box = (h0: number, h1: number, k: number) => {
    const a = half * k;
    return {
      left: [P(-a, h0, a), P(a, h0, a), P(a, h1, a), P(-a, h1, a)] as Pt[],
      right: [P(a, h0, a), P(a, h0, -a), P(a, h1, -a), P(a, h1, a)] as Pt[],
      top: [P(-a, h1, -a), P(a, h1, -a), P(a, h1, a), P(-a, h1, a)] as Pt[],
      a,
    };
  };
  const base = box(0, podium, 1);
  const upper = spec.top < 1 ? box(podium, total, spec.top) : null;
  const level = [
    "STARTER",
    "PLUS",
    "PRO",
    "PREMIUM",
    "LANDMARK",
    "SKYSCRAPER",
  ].indexOf(tier);
  const towerGlass = glass || level >= 4;
  /** Window rows on a face, one per floor, between two heights. */
  const windows = (
    h0: number,
    h1: number,
    a: number,
    side: "left" | "right",
    tint: string,
  ) => {
    const rows: Pt[][] = [];
    for (let y = Math.max(h0 + 0.18, GROUND); y + 0.24 <= h1 - 0.06; y += FLOOR)
      for (let c = 0; c < 3; c++) {
        const u0 = -a + (2 * a * (c + 0.2)) / 3,
          u1 = -a + (2 * a * (c + 0.8)) / 3;
        rows.push(
          side === "left"
            ? [
                P(u0, y, a + 0.01),
                P(u1, y, a + 0.01),
                P(u1, y + 0.22, a + 0.01),
                P(u0, y + 0.22, a + 0.01),
              ]
            : [
                P(a + 0.01, y, -u0),
                P(a + 0.01, y, -u1),
                P(a + 0.01, y + 0.22, -u1),
                P(a + 0.01, y + 0.22, -u0),
              ],
        );
      }
    return rows.map((r, i) => (
      <polygon key={`${side}${h0}${i}`} points={poly(r)} fill={tint} />
    ));
  };
  const plate = [
    P(-1.9, 0, -1.9),
    P(1.9, 0, -1.9),
    P(1.9, 0, 1.9),
    P(-1.9, 0, 1.9),
  ];
  const plateEdge = [
    P(-1.9, 0, 1.9),
    P(1.9, 0, 1.9),
    P(1.9, -0.16, 1.9),
    P(-1.9, -0.16, 1.9),
  ];
  const plateEdgeR = [
    P(1.9, 0, 1.9),
    P(1.9, 0, -1.9),
    P(1.9, -0.16, -1.9),
    P(1.9, -0.16, 1.9),
  ];
  const roofTop = total;
  const topA = upper ? upper.a : base.a;
  // Rooftop sign with posts, facing the viewer's left face.
  const sw = Math.min(0.8 + level * 0.18, 1.6),
    sh = 0.42 + level * 0.06,
    lift = 0.22 + level * 0.03;
  const signZ = topA * 0.35;
  const sign = [
    P(-sw / 2, roofTop + lift, signZ),
    P(sw / 2, roofTop + lift, signZ),
    P(sw / 2, roofTop + lift + sh, signZ),
    P(-sw / 2, roofTop + lift + sh, signZ),
  ];
  const signCenter = P(-sw / 2 + sh * 0.55, roofTop + lift + sh / 2, signZ);
  const posts = [-sw * 0.3, sw * 0.3].map((x) => [
    P(x, roofTop, signZ),
    P(x, roofTop + lift, signZ),
  ]);
  return (
    <svg
      className={`tier-art ${className}`}
      viewBox={
        fit
          ? `${ox - 3.45 * S} ${oy - (fit === "row" ? 7.6 : total + 2.4) * S} ${6.9 * S} ${(fit === "row" ? 7.6 : total + 2.4) * S + 2.25 * S}`
          : `0 0 ${W} ${H}`
      }
      role="img"
      aria-label={label || `Edificio ${tier}`}
    >
      <ellipse
        cx={ox + 14}
        cy={oy + 8}
        rx={46}
        ry={10}
        fill="#17322a"
        opacity={0.06}
      />
      <polygon points={poly(plateEdge)} fill="#d8cfbd" />
      <polygon points={poly(plateEdgeR)} fill="#cfc5b1" />
      <polygon points={poly(plate)} fill="#ece6d8" />
      {[
        [-1.55, 1.2],
        [1.25, -1.5],
      ].map(([x, z]) => {
        const [cx, cy] = P(x, 0.62, z);
        const [tx, ty] = P(x, 0, z);
        return (
          <g key={`${x}${z}`}>
            <line
              x1={tx}
              y1={ty}
              x2={cx}
              y2={cy + 4}
              stroke="#a8987a"
              strokeWidth={1.4}
            />
            <circle cx={cx} cy={cy} r={4.6} fill="#8fb07d" />
          </g>
        );
      })}
      <polygon
        points={poly(base.left)}
        fill={level >= 4 ? "#efe9de" : "#f1ece2"}
      />
      <polygon
        points={poly(base.right)}
        fill={level >= 4 ? "#d9d0bf" : "#dcd4c4"}
      />
      <polygon points={poly(base.top)} fill="#f7f3ea" />
      {windows(0, podium, base.a, "left", "#5f7d77")}
      {windows(0, podium, base.a, "right", "#4f6b66")}
      {upper && (
        <>
          <polygon
            points={poly(upper.left)}
            fill={towerGlass ? "#b9cdd2" : "#f1ece2"}
          />
          <polygon
            points={poly(upper.right)}
            fill={towerGlass ? "#9fb5bc" : "#dcd4c4"}
          />
          <polygon
            points={poly(upper.top)}
            fill={level >= 4 ? color : "#f7f3ea"}
          />
          {windows(
            podium,
            total,
            upper.a,
            "left",
            towerGlass ? "#dbe7ea" : "#5f7d77",
          )}
          {windows(
            podium,
            total,
            upper.a,
            "right",
            towerGlass ? "#c3d4d8" : "#4f6b66",
          )}
        </>
      )}
      {roof === "gable" && !upper && (
        <polygon
          points={poly([
            P(-half - 0.12, total, half + 0.12),
            P(half + 0.12, total, half + 0.12),
            P(half + 0.12, total + 0.9, 0),
            P(-half - 0.12, total + 0.9, 0),
          ])}
          fill="#b9654a"
        />
      )}
      {roof === "green" && (
        <polygon points={poly(upper ? upper.top : base.top)} fill="#a9c68f" />
      )}
      {/* Awning: the PLUS/PRO secondary element. */}
      {(level === 1 || level === 2) && (
        <polygon
          points={poly([
            P(-half * 0.85, GROUND, half),
            P(half * 0.85, GROUND, half),
            P(half * 0.85, GROUND - 0.22, half + 0.55),
            P(-half * 0.85, GROUND - 0.22, half + 0.55),
          ])}
          fill={color}
        />
      )}
      {/* Vertical banner: the PREMIUM/LANDMARK secondary element. */}
      {upper && (
        <polygon
          points={poly([
            P(upper.a * 0.45, total - 0.25, upper.a + 0.02),
            P(upper.a * 0.92, total - 0.25, upper.a + 0.02),
            P(
              upper.a * 0.92,
              total - 0.25 - Math.min(total - podium - 0.5, 3.6),
              upper.a + 0.02,
            ),
            P(
              upper.a * 0.45,
              total - 0.25 - Math.min(total - podium - 0.5, 3.6),
              upper.a + 0.02,
            ),
          ])}
          fill={color}
        />
      )}
      {roof !== "gable" && (
        <>
          {posts.map(([a, b], i) => (
            <line
              key={i}
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              stroke="#3c4541"
              strokeWidth={1.3}
            />
          ))}
          <polygon
            points={poly(sign)}
            fill="#fbf8f1"
            stroke="#3c4541"
            strokeWidth={0.9}
          />
          <circle
            cx={signCenter[0]}
            cy={signCenter[1]}
            r={sh * S * 0.3}
            fill={color}
          />
          <text
            x={signCenter[0]}
            y={signCenter[1] + sh * S * 0.13}
            textAnchor="middle"
            fontSize={sh * S * 0.38}
            fontWeight={800}
            fill="#fbf8f1"
            fontFamily="var(--font-display), sans-serif"
          >
            {initial.slice(0, 1).toUpperCase()}
          </text>
          <polygon
            points={poly([
              P(-sw / 2 + sh * 1.05, roofTop + lift + sh * 0.6, signZ + 0.01),
              P(sw / 2 - 0.12, roofTop + lift + sh * 0.6, signZ + 0.01),
              P(sw / 2 - 0.12, roofTop + lift + sh * 0.45, signZ + 0.01),
              P(-sw / 2 + sh * 1.05, roofTop + lift + sh * 0.45, signZ + 0.01),
            ])}
            fill="#17322a"
            opacity={0.7}
          />
        </>
      )}
    </svg>
  );
}
