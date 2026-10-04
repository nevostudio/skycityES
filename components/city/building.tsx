"use client";
import { useState, useEffect, useRef, memo } from "react";
import { WorldLabel as Html } from "./world-label";
import { BrandSign, brandTheme, brandKind } from "./brand-sign";
import { districtStyle, districtWall } from "./district-style";
import { PresenceArchitecture } from "./presence-architecture";
import { presenceLevel } from "@/lib/presence";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Ad, PublicProperty } from "@/types";
export const box = new THREE.BoxGeometry(1, 1, 1);
const cone = new THREE.ConeGeometry(1, 1, 4);
export const outline = new THREE.EdgesGeometry(box);
export const leaf = new THREE.IcosahedronGeometry(1, 0);
export const palette = {
  road: "#737e78",
  line: "#e6e4d7",
  ground: "#adbc9c",
  water: "#74acae",
};
export function Block({
  position,
  scale,
  color,
  rotation = 0,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  rotation?: number;
}) {
  return (
    <mesh
      geometry={box}
      position={position}
      scale={scale}
      rotation={[0, rotation, 0]}
      receiveShadow
      castShadow
    >
      <meshStandardMaterial color={color} roughness={0.86} />
    </mesh>
  );
}
export const Building = memo(function Building({
  p,
  selected,
  muted,
  faded = false,
  showAuctionLabel = true,
  onSelect,
  onHover,
}: {
  p: PublicProperty;
  selected: boolean;
  muted: boolean;
  faded?: boolean;
  showAuctionLabel?: boolean;
  onSelect: (p: PublicProperty) => void;
  onHover: (p: PublicProperty | null) => void;
}) {
  const [hover, setHover] = useState(false);
  const group = useRef<THREE.Group>(null);
  useEffect(() => {
    group.current?.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.material) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => {
        material.userData.baseOpacity ??= material.opacity;
        material.userData.baseTransparent ??= material.transparent;
        material.userData.baseDepthWrite ??= material.depthWrite;
        material.opacity = faded ? 0.1 : material.userData.baseOpacity;
        material.transparent = faded || material.userData.baseTransparent;
        material.depthWrite = faded ? false : material.userData.baseDepthWrite;
      });
    });
  }, [faded, p.ad]);
  const h = p.height;
  const w = p.width;
  const d = p.depth;
  const district = districtStyle(p.districtId);
  const kind = p.ad ? brandKind(p.ad) : "";
  const highlightHeight =
    h +
    (p.inventory === "skyscraper"
      ? 4.2
      : presenceLevel(p.presenceTier) >= 3
        ? 3
        : p.ad && ["cafe", "garden", "lab"].includes(kind)
          ? 0.8
          : p.type === "house"
            ? 1.3
            : p.ad
              ? 2.05
              : h > 10
                ? 2
                : 0.9);
  const color =
    hover && !selected && p.status === "available"
      ? "#cadcbd"
      : muted
        ? "#c8cebf"
        : p.ad
          ? brandTheme(p.ad).background
          : p.status === "auction"
            ? "#536275"
            : districtWall(p);
  function enter(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    setHover(true);
    onHover(p);
    document.body.style.cursor = "pointer";
  }
  return (
    <group
      ref={group}
      name={`building-${p.id}`}
      position={[p.x, 0.32, p.z]}
      rotation={[0, p.rotation, 0]}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta < 6) onSelect(p);
      }}
      onPointerOver={enter}
      onPointerOut={() => {
        setHover(false);
        onHover(null);
        document.body.style.cursor = "auto";
      }}
    >
      {(selected || hover) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <planeGeometry args={[w + 1.5, d + 1.5]} />
          <meshBasicMaterial color={selected ? "#e97e51" : "#f6dba2"} />
        </mesh>
      )}
      <Block position={[0, h / 2, 0]} scale={[w, h, d]} color={color} />
      <PresenceArchitecture p={p} />
      {p.status === "available" && !muted && !selected && !hover && (
        <lineSegments
          geometry={outline}
          position={[0, 0.08, 0]}
          scale={[w + 0.45, 0.02, d + 0.45]}
        >
          <lineBasicMaterial color="#799877" transparent opacity={0.48} />
        </lineSegments>
      )}
      {(selected || hover) && (
        <lineSegments
          geometry={outline}
          position={[0, h / 2, 0]}
          scale={[w + 0.12, h + 0.14, d + 0.12]}
        >
          <lineBasicMaterial
            color={selected ? "#f2a266" : "#94d69a"}
            linewidth={2}
            toneMapped={false}
          />
        </lineSegments>
      )}
      {selected && (
        <group name="selection-highlight">
          {[-1, 1].flatMap((x) =>
            [-1, 1].map((z) => (
              <mesh
                key={`${x}:${z}`}
                position={[
                  x * (w / 2 + 0.11),
                  highlightHeight / 2,
                  z * (d / 2 + 0.11),
                ]}
              >
                <boxGeometry args={[0.055, highlightHeight, 0.055]} />
                <meshBasicMaterial color="#ffc060" toneMapped={false} />
              </mesh>
            )),
          )}
          {[0.08, highlightHeight].map((y) => (
            <group key={y} position={[0, y, 0]}>
              {[-1, 1].map((side) => (
                <group key={side}>
                  <mesh position={[0, 0, side * (d / 2 + 0.11)]}>
                    <boxGeometry args={[w + 0.3, 0.075, 0.075]} />
                    <meshBasicMaterial color="#ffc060" toneMapped={false} />
                  </mesh>
                  <mesh position={[side * (w / 2 + 0.11), 0, 0]}>
                    <boxGeometry args={[0.075, 0.075, d + 0.3]} />
                    <meshBasicMaterial color="#ffc060" toneMapped={false} />
                  </mesh>
                </group>
              ))}
            </group>
          ))}
        </group>
      )}
      {p.status === "available" && !muted && (
        <group
          position={[-w * 0.31, h + 0.58, d / 2 + 0.12]}
          rotation={[0, Math.PI / 4, 0]}
        >
          <mesh>
            <boxGeometry args={[0.42, 0.1, 0.06]} />
            <meshBasicMaterial color="#71946c" />
          </mesh>
          <mesh>
            <boxGeometry args={[0.1, 0.42, 0.06]} />
            <meshBasicMaterial color="#71946c" />
          </mesh>
        </group>
      )}
      {p.auction && !muted && showAuctionLabel && (
        <Html position={[0, h + 4, 0]} center zIndexRange={[3, 0]}>
          <button
            className="auction-pin"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(p);
            }}
          >
            <span>◆</span> Auction live
          </button>
        </Html>
      )}
      {p.tier === "PREMIUM" && (
        <Block
          position={[0, h + 0.22, 0]}
          scale={[w + 0.22, 0.15, d + 0.22]}
          color="#d5b77e"
        />
      )}
      <Block
        position={[0, h + 0.12, 0]}
        scale={[w + 0.15, 0.24, d + 0.15]}
        color={p.ad ? brandTheme(p.ad).accent : district.roof}
      />
      {p.type === "house" ? (
        <mesh
          geometry={cone}
          position={[0, h + 0.65, 0]}
          scale={[w * 0.78, 1.25, d * 0.76]}
          rotation={[0, Math.PI / 4, 0]}
          castShadow
        >
          <meshStandardMaterial color={district.roof} />
        </mesh>
      ) : (
        <>
          <Block
            position={[-w * 0.14, h + 0.45, 0]}
            scale={[w * 0.45, 0.7, d * 0.45]}
            color="#c3c5b8"
          />
          {h > 10 && !p.ad && (
            <Block
              position={[0, h + 1.8, 0]}
              scale={[0.15, 3, 0.15]}
              color="#778c86"
            />
          )}
        </>
      )}
      {!p.ad &&
      (p.type === "shop" ||
        p.type === "restaurant" ||
        p.type === "nightclub") ? (
        <>
          <Block
            position={[0, 1, d / 2 + 0.02]}
            scale={[w * 0.8, 1.65, 0.1]}
            color="#5d7d71"
          />
          <Block
            position={[0, 1.9, d / 2 + 0.3]}
            scale={[w + 0.15, 0.27, 0.7]}
            color={district.trim}
          />
        </>
      ) : null}
      {!p.ad && p.model % 4 === 0 && h > 5 && (
        <Block
          position={[w / 2 + 0.09, h / 2, 0]}
          scale={[0.2, h, d * 0.76]}
          color="#e5e4d9"
        />
      )}
      {!p.ad && p.type !== "house" && p.model % 5 === 1 && (
        <Block
          position={[0, h + 0.8, 0]}
          scale={[w * 0.75, 1.4, d * 0.75]}
          color={color}
        />
      )}
      {!p.ad && p.type !== "house" && p.model % 5 === 2 && (
        <>
          <Block
            position={[-w * 0.25, h + 0.5, 0]}
            scale={[w * 0.35, 0.8, d * 0.8]}
            color="#719198"
          />
          <Block
            position={[w * 0.25, h + 0.5, 0]}
            scale={[w * 0.35, 0.8, d * 0.8]}
            color="#719198"
          />
        </>
      )}
      {!p.ad && p.type !== "house" && p.model % 5 === 3 && (
        <Block
          position={[0, h + 0.35, 0]}
          scale={[w * 0.8, 0.5, d * 0.8]}
          color="#91a981"
        />
      )}
      {!p.ad && p.type !== "house" && p.model % 5 === 4 && (
        <mesh
          geometry={cone}
          position={[0, h + 1, 0]}
          scale={[w * 0.7, 2, d * 0.7]}
          rotation={[0, Math.PI / 4, 0]}
          castShadow
        >
          <meshStandardMaterial color="#9fae9b" />
        </mesh>
      )}
      {!p.ad &&
        p.model >= 5 &&
        p.model < 10 &&
        h > 5 &&
        [0.3, 0.6, 0.9].map((level) => (
          <Block
            key={level}
            position={[0, h * level, 0]}
            scale={[w + 0.12, 0.15, d + 0.12]}
            color="#e9e8da"
          />
        ))}
      {!p.ad && p.model >= 10 && p.model < 15 && (
        <Block
          position={[0, h * 0.5, d / 2 + 0.06]}
          scale={[w * 0.18, h * 0.8, 0.12]}
          color="#779597"
        />
      )}
      {!p.ad && p.model >= 15 && (
        <>
          <Block
            position={[-w * 0.44, h * 0.5, d / 2 + 0.08]}
            scale={[0.17, h, 0.18]}
            color="#e9e6d5"
          />
          <Block
            position={[w * 0.44, h * 0.5, d / 2 + 0.08]}
            scale={[0.17, h, 0.18]}
            color="#e9e6d5"
          />
        </>
      )}
      {p.ad && !faded && <BrandSign p={p as PublicProperty & { ad: Ad }} />}
      {p.status === "auction" && (
        <group>
          <Block
            position={[0, h + 0.55, 0]}
            scale={[w * 0.55, 0.75, d * 0.55]}
            color="#b79858"
          />
          {[0.35, 0.7, 1].map((level) => (
            <Block
              key={level}
              position={[0, h * level, 0]}
              scale={[w + 0.24, 0.14, d + 0.24]}
              color="#d8b67b"
            />
          ))}
          {[-1, 1].map((side) => (
            <group key={side}>
              <mesh position={[side * w * 0.44, h * 0.5, d / 2 + 0.13]}>
                <boxGeometry args={[0.09, h, 0.1]} />
                <meshStandardMaterial
                  color="#e4bb73"
                  emissive="#e4bb73"
                  emissiveIntensity={0.25}
                />
              </mesh>
              <mesh position={[w / 2 + 0.13, h * 0.5, side * d * 0.44]}>
                <boxGeometry args={[0.1, h, 0.09]} />
                <meshStandardMaterial
                  color="#e4bb73"
                  emissive="#e4bb73"
                  emissiveIntensity={0.25}
                />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
});
