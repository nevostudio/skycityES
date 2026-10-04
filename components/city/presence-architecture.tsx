"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { PublicProperty } from "@/types";
import { presenceLevel } from "@/lib/presence";

function ReservedSign({ p }: { p: PublicProperty }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 768;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#223937";
    c.fillRect(0, 0, 512, 768);
    c.strokeStyle = "#cfb377";
    c.lineWidth = 8;
    c.strokeRect(20, 20, 472, 728);
    c.fillStyle = "#e9d59c";
    c.textAlign = "center";
    c.font = "32px sans-serif";
    c.fillText("SKYCITY", 256, 160);
    c.font = "bold 58px sans-serif";
    c.fillText("RESERVED", 256, 352, 445);
    c.font = "32px sans-serif";
    c.fillText("FOR MAJOR", 256, 435);
    c.fillText("BRANDS", 256, 484);
    c.fillRect(216, 572, 80, 3);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, p.height * 0.65, p.depth / 2 + 0.09]}>
      <planeGeometry args={[p.width * 0.93, p.width * 1.4]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

/** Three reusable roof languages, shared across property types, inside the existing plot. */
export function PresenceArchitecture({ p }: { p: PublicProperty }) {
  const sky = p.inventory === "skyscraper";
  const level = sky ? 5 : presenceLevel(p.presenceTier);
  const h = p.height,
    w = p.width,
    d = p.depth;
  const accent = p.ad?.primary || (sky ? "#c8af76" : "#78958a");
  return (
    <group name={`presence-${p.presenceTier || "STARTER"}-${p.id}`}>
      {level >= 3 && (
        <>
          {(p.model % 3 === 0 ? [0, 1] : [0]).map((i) => (
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
          {p.model % 3 === 1 && (
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
          {p.model % 3 === 2 &&
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
      {sky && (
        <mesh position={[0, h + 2.6, 0]}>
          <boxGeometry args={[0.12, 3, 0.12]} />
          <meshStandardMaterial
            color="#c8af76"
            metalness={0.6}
            roughness={0.35}
          />
        </mesh>
      )}
      {sky && p.reservedForBrands && p.status === "reserved" && (
        <ReservedSign p={p} />
      )}
    </group>
  );
}
