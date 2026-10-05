"use client";
import * as THREE from "three";
import type { PublicProperty } from "@/types";
import type { BrandPalette } from "@/lib/brand-theme";
import { Block } from "./building";
import { districtStyle } from "./district-style";
import { architectureOf, massing, type Volume } from "@/lib/massing";
import { presenceLevel } from "@/lib/presence";

/** Pitched roof (Casco Antiguo): a shared triangular prism, scaled per building. */
const gable = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0, 1);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
})();
const contactShadow = new THREE.MeshBasicMaterial({
  color: "#17322a",
  transparent: true,
  opacity: 0.12,
  depthWrite: false,
});
const GLASS = { corporate: "#a3b9c0", tech: "#cfe1e0", default: "#bccfd2" };
const MUTED = "#d6d8cf";
const STONE = "#efe9de";

/**
 * The building's form: a set of volumes (base, body, set-back top) with a crown, chosen per
 * tier variant. Branded buildings take their colour according to their pattern:
 * rooftop (body in brand colour), facade (neutral body, dominant front panel), billboard
 * (brand-tinted body) or wrapped (the tower in brand colour). Footprint and height stay those
 * of the plot.
 */
export function BuildingForm({
  p,
  wall,
  brand,
  muted,
}: {
  p: PublicProperty;
  /** Neutral district wall (or the civic colour). */
  wall: string;
  brand: BrandPalette | null;
  muted: boolean;
}) {
  const m = massing(p);
  const arch = architectureOf(p.districtId);
  const district = districtStyle(p.districtId);
  const level = presenceLevel(p.building?.tier);
  const w = p.width,
    d = p.depth,
    h = p.height;
  const glass =
    arch === "corporate"
      ? GLASS.corporate
      : arch === "tech"
        ? GLASS.tech
        : GLASS.default;
  /** Colour of each volume by role and brand pattern. */
  const colorOf = (v: Volume) => {
    if (muted) return MUTED;
    if (!brand) {
      if (v.role === "base" && level >= 4) return STONE;
      return v.role !== "base" && m.glassTop ? glass : wall;
    }
    // Owned buildings are painted almost entirely in the brand colour; only a multi-volume
    // base drops to the darker brand tone, so the body still reads as one brand mass.
    return v.role === "base" && m.volumes.length > 1
      ? brand.deep
      : brand.primary;
  };
  const accent = muted ? MUTED : brand ? brand.deep : district.trim;
  const crownColor = muted
    ? MUTED
    : brand
      ? m.crown === "cap"
        ? brand.primary
        : brand.deep
      : m.roof === "green"
        ? "#a9c68f"
        : district.roof;
  const t = m.top;
  const tw = t.w * w,
    td = t.d * d,
    tx = t.x * w,
    tz = t.z * d;
  const footprint = m.volumes.filter((v) => v.y0 === 0);
  const fw = Math.max(...footprint.map((v) => v.w)) * w,
    fd = Math.max(...footprint.map((v) => v.d)) * d;
  return (
    <group name={`form-${arch}-${p.building?.tier}-v${m.variant}-${m.pattern}`}>
      {/* Grounding: a contact shadow and a plinth separate the building from the street. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
        material={contactShadow}
      >
        <planeGeometry args={[fw + 1.1, fd + 1.1]} />
      </mesh>
      <Block
        position={[0, 0.06, 0]}
        scale={[fw + 0.36, 0.12, fd + 0.36]}
        color={muted ? MUTED : "#d8cfbb"}
      />
      {m.volumes.map((v, i) => (
        <Block
          key={i}
          position={[v.x * w, (v.y0 + v.y1) / 2, v.z * d]}
          scale={[v.w * w, v.y1 - v.y0, v.d * d]}
          color={colorOf(v)}
        />
      ))}
      {/* Ledges where a volume steps back. */}
      {m.volumes
        .filter((v) => v.y0 > 0)
        .map((v, i) => (
          <Block
            key={`ledge${i}`}
            position={[v.x * w, v.y0 + 0.06, v.z * d]}
            scale={[v.w * w + 0.16, 0.12, v.d * d + 0.16]}
            color={accent}
          />
        ))}
      {arch === "corporate" && !brand && (
        <Block
          position={[0, 1, 0]}
          scale={[fw + 0.04, 2, fd + 0.04]}
          color={muted ? MUTED : "#2f4540"}
        />
      )}
      {arch === "tech" && (
        <Block
          position={[0, 2.05, 0]}
          scale={[fw + 0.06, 0.16, fd + 0.06]}
          color={muted ? MUTED : (brand?.primary ?? district.trim)}
        />
      )}
      {/* Wrapped towers: contrasting corner fins frame the brand colour. */}
      {brand &&
        !muted &&
        m.pattern === "wrapped" &&
        [-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <Block
              key={`fin${sx}${sz}`}
              position={[
                tx + sx * (tw / 2),
                (t.y0 + t.y1) / 2,
                tz + sz * (td / 2),
              ]}
              scale={[0.12, t.y1 - t.y0, 0.12]}
              color={brand.deep}
            />
          )),
        )}
      {/* Facade pattern: darker corner pilasters give the brand body a frame. */}
      {brand &&
        !muted &&
        m.pattern === "facade" &&
        m.volumes
          .filter((v) => v.role !== "base" || m.volumes.length === 1)
          .flatMap((v, i) =>
            [-1, 1].map((sx) => (
              <Block
                key={`pil${i}${sx}`}
                position={[
                  v.x * w + sx * ((v.w * w) / 2 - 0.09),
                  (v.y0 + v.y1) / 2,
                  v.z * d + (v.d * d) / 2 - 0.09,
                ]}
                scale={[0.26, v.y1 - v.y0, 0.26]}
                color={brand.deep}
              />
            )),
          )}
      {/* Vertical brand core running up the front. */}
      {brand && !muted && m.core && (
        <Block
          position={[tx + tw * 0.28, (t.y0 + h) / 2 + 0.3, tz + td / 2 + 0.05]}
          scale={[Math.min(0.5, tw * 0.2), h - t.y0 + 0.6, 0.14]}
          color={brand.secondary}
        />
      )}
      {m.roof === "gable" ? (
        <mesh
          geometry={gable}
          position={[tx, h, tz]}
          scale={[tw + 0.34, Math.min(1.5, tw * 0.42), td + 0.3]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={muted ? MUTED : district.roof}
            roughness={0.8}
          />
        </mesh>
      ) : (
        <Crown
          crown={m.crown}
          x={tx}
          z={tz}
          w={tw}
          d={td}
          h={h}
          color={crownColor}
          secondary={accent}
          green={m.roof === "green" && !muted}
        />
      )}
    </group>
  );
}

/** Crowns give each silhouette its own top: parapet, slab, steps, frame, spire, block or cap. */
function Crown({
  crown,
  x,
  z,
  w,
  d,
  h,
  color,
  secondary,
  green,
}: {
  crown: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  secondary: string;
  green: boolean;
}) {
  const roof = green ? "#a9c68f" : color;
  switch (crown) {
    case "parapet":
      return (
        <group>
          <Block
            position={[x, h + 0.04, z]}
            scale={[w, 0.08, d]}
            color={roof}
          />
          {[-1, 1].map((s) => (
            <group key={s}>
              <Block
                position={[x, h + 0.13, z + s * (d / 2 - 0.06)]}
                scale={[w + 0.08, 0.26, 0.12]}
                color={color}
              />
              <Block
                position={[x + s * (w / 2 - 0.06), h + 0.13, z]}
                scale={[0.12, 0.26, d + 0.08]}
                color={color}
              />
            </group>
          ))}
        </group>
      );
    case "slab":
      return (
        <Block
          position={[x, h + 0.08, z]}
          scale={[w + 0.36, 0.16, d + 0.3]}
          color={roof}
        />
      );
    case "stepped":
      return (
        <group>
          <Block
            position={[x, h + 0.25, z]}
            scale={[w * 0.82, 0.5, d * 0.82]}
            color={color}
          />
          <Block
            position={[x, h + 0.7, z]}
            scale={[w * 0.62, 0.4, d * 0.62]}
            color={secondary}
          />
        </group>
      );
    case "frame":
      return (
        <group>
          <Block
            position={[x, h + 0.08, z]}
            scale={[w + 0.12, 0.16, d + 0.12]}
            color={roof}
          />
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => (
              <Block
                key={`${sx}${sz}`}
                position={[x + sx * (w / 2), h + 1.1, z + sz * (d / 2)]}
                scale={[0.1, 2, 0.1]}
                color={secondary}
              />
            )),
          )}
          {[-1, 1].map((s) => (
            <group key={s}>
              <Block
                position={[x, h + 2.1, z + s * (d / 2)]}
                scale={[w + 0.1, 0.1, 0.1]}
                color={secondary}
              />
              <Block
                position={[x + s * (w / 2), h + 2.1, z]}
                scale={[0.1, 0.1, d + 0.1]}
                color={secondary}
              />
            </group>
          ))}
        </group>
      );
    case "spire":
      return (
        <group>
          <Block
            position={[x, h + 0.08, z]}
            scale={[w + 0.1, 0.16, d + 0.1]}
            color={roof}
          />
          <Block
            position={[x - w * 0.2, h + 0.5, z - d * 0.2]}
            scale={[0.5, 0.7, 0.5]}
            color={secondary}
          />
          <Block
            position={[x - w * 0.2, h + 2.2, z - d * 0.2]}
            scale={[0.07, 2.8, 0.07]}
            color="#8a8f88"
          />
        </group>
      );
    case "block":
      return (
        <group>
          <Block
            position={[x, h + 0.08, z]}
            scale={[w + 0.08, 0.16, d + 0.08]}
            color={roof}
          />
          <Block
            position={[x - w * 0.22, h + 0.55, z - d * 0.24]}
            scale={[w * 0.42, 0.8, d * 0.36]}
            color={color}
          />
        </group>
      );
    default:
      return (
        <Block
          position={[x, h + 0.15, z]}
          scale={[w + 0.14, 0.3, d + 0.14]}
          color={color}
        />
      );
  }
}
