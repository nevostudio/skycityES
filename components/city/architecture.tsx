"use client";
import * as THREE from "three";
import type { PublicProperty } from "@/types";
import { Block } from "./building";
import { districtStyle } from "./district-style";
import { architectureOf, massing } from "@/lib/massing";
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
const GLASS = {
  corporate: "#a3b9c0",
  tech: "#cfe1e0",
  default: "#bccfd2",
};
const MUTED = "#d6d8cf";

/**
 * The building's form from the redesign: tier sets the silhouette (box, stepped, base + tower),
 * the district sets materials and details. Footprint and height stay those of the plot.
 */
export function BuildingForm({
  p,
  wall,
  accent,
  muted,
}: {
  p: PublicProperty;
  wall: string;
  accent: string;
  muted: boolean;
}) {
  const m = massing(p);
  const arch = architectureOf(p.districtId);
  const district = districtStyle(p.districtId);
  const level = presenceLevel(p.building?.tier);
  const h = p.height,
    w = p.width,
    d = p.depth;
  const tw = w * m.top,
    td = d * m.top;
  const tower = m.top < 1;
  const glass = muted
    ? MUTED
    : arch === "corporate"
      ? GLASS.corporate
      : arch === "tech"
        ? GLASS.tech
        : GLASS.default;
  const stone = muted ? MUTED : "#efe9de";
  const base = level >= 4 && tower ? stone : wall;
  // LANDMARK roofs carry the brand colour under the sign (PDF page 3); others stay quiet.
  const cap = muted
    ? MUTED
    : level >= 4 && p.ad
      ? accent
      : m.roof === "green"
        ? "#a9c68f"
        : district.roof;
  return (
    <group name={`form-${arch}-${p.building?.tier}`}>
      <Block
        position={[0, m.podium / 2, 0]}
        scale={[w, m.podium, d]}
        color={base}
      />
      {tower && (
        <>
          <Block
            position={[0, m.podium + 0.07, 0]}
            scale={[w + 0.12, 0.14, d + 0.12]}
            color={muted ? MUTED : "#f6f2ea"}
          />
          <Block
            position={[0, m.podium + (h - m.podium) / 2, 0]}
            scale={[tw, h - m.podium, td]}
            color={m.glassTop ? glass : wall}
          />
        </>
      )}
      {arch === "corporate" && (
        <Block
          position={[0, 1, 0]}
          scale={[w + 0.04, 2, d + 0.04]}
          color={muted ? MUTED : "#2f4540"}
        />
      )}
      {arch === "tech" && (
        <Block
          position={[0, 2.05, 0]}
          scale={[w + 0.06, 0.16, d + 0.06]}
          color={muted ? MUTED : accent}
        />
      )}
      {m.roof === "gable" ? (
        <mesh
          geometry={gable}
          position={[0, h, 0]}
          scale={[w + 0.34, Math.min(1.5, w * 0.42), d + 0.3]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={muted ? MUTED : cap} roughness={0.8} />
        </mesh>
      ) : (
        <Block
          position={[0, h + 0.08, 0]}
          scale={[tw + 0.12, m.roof === "green" ? 0.24 : 0.16, td + 0.12]}
          color={cap}
        />
      )}
      {m.roof === "green" &&
        [-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * tw * 0.28, h + 0.42, -td * 0.25]}
            castShadow
          >
            <icosahedronGeometry args={[0.32, 1]} />
            <meshStandardMaterial color={muted ? MUTED : "#7fa36f"} />
          </mesh>
        ))}
      {m.roof !== "gable" && (
        // Plant room at the back-left corner, clear of the rooftop sign.
        <Block
          position={[-tw * 0.28, h + 0.38, -td * 0.28]}
          scale={[tw * 0.26, 0.5, td * 0.24]}
          color={muted ? MUTED : "#e4ded1"}
        />
      )}
    </group>
  );
}
