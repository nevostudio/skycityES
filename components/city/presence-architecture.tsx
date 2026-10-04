"use client";
import type { PublicProperty } from "@/types";
import { presenceLevel } from "@/lib/presence";

/** Three reusable roof languages, shared across property types, inside the existing plot. */
export function PresenceArchitecture({ p }: { p: PublicProperty }) {
  const sky = p.building?.tier === "SKYSCRAPER";
  const level = presenceLevel(p.building?.tier);
  const h = p.height,
    w = p.width,
    d = p.depth;
  const accent = p.ad?.primary || (sky ? "#c8af76" : "#78958a");
  return (
    <group name={`presence-${p.building?.tier || "EMPTY"}-${p.id}`}>
      {level >= 3 && (
        <>
          {/* A branded roof carries its rooftop sign instead of a sculpted crown. */}
          {(p.ad ? [] : p.model % 3 === 0 ? [0, 1] : [0]).map((i) => (
            <mesh
              key={i}
              position={[0, h + 0.6 + i * 0.8, -d * 0.12]}
              castShadow
            >
              <boxGeometry
                args={[w * (0.67 - i * 0.18), 0.8, d * (0.65 - i * 0.12)]}
              />
              <meshStandardMaterial
                color={p.color}
                metalness={0.2}
                roughness={0.5}
              />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * w * 0.44, h / 2, d / 2 + 0.08]}>
              <boxGeometry args={[0.065, h * 0.95, 0.07]} />
              <meshStandardMaterial
                color={accent}
                emissive={accent}
                emissiveIntensity={level >= 4 ? 0.7 : 0.3}
                toneMapped={false}
              />
            </mesh>
          ))}
          {!p.ad && p.model % 3 === 1 && (
            <mesh
              position={[0, h + 1.5, -d * 0.15]}
              scale={[w * 0.4, 0.8, d * 0.36]}
            >
              <coneGeometry args={[1, 1, 4]} />
              <meshStandardMaterial
                color={accent}
                metalness={0.45}
                roughness={0.4}
              />
            </mesh>
          )}
          {!p.ad &&
            p.model % 3 === 2 &&
            [-1, 1].map((side) => (
              <mesh key={side} position={[side * w * 0.32, h + 0.7, 0]}>
                <boxGeometry args={[0.08, 1.4, d * 0.8]} />
                <meshStandardMaterial
                  color={accent}
                  emissive={accent}
                  emissiveIntensity={0.35}
                />
              </mesh>
            ))}
        </>
      )}
      {level >= 4 &&
        [0.3, 0.65, 1].map((y) => (
          <mesh key={y} position={[0, h * y, 0]}>
            <boxGeometry args={[w + 0.12, 0.08, d + 0.12]} />
            <meshStandardMaterial
              color={accent}
              emissive={accent}
              emissiveIntensity={0.25}
            />
          </mesh>
        ))}
      {sky && !p.ad && (
        <mesh position={[0, h + 2.6, 0]}>
          <boxGeometry args={[0.12, 3, 0.12]} />
          <meshStandardMaterial
            color="#c8af76"
            metalness={0.6}
            roughness={0.35}
          />
        </mesh>
      )}
    </group>
  );
}
