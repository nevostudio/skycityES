"use client";
import { useState, useEffect, useMemo, useRef, memo } from "react";
import { useFrame } from "@react-three/fiber";
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
/** Plot → foundations → structure → growth → finished building. */
export const BUILD_ANIMATION_MS = 1600;
/** `from`: height ratio the building grows from (0 for a new building). */
export type Construction = { from: number; start: number };
const scaffoldMaterial = new THREE.LineBasicMaterial({
  color: "#e39a4f",
  transparent: true,
});
const dustMaterial = new THREE.MeshBasicMaterial({
  color: "#d9cdb4",
  transparent: true,
});
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
/** Golden frame around the selected plot or building. */
export function SelectionFrame({
  w,
  d,
  h,
}: {
  w: number;
  d: number;
  h: number;
}) {
  return (
    <group name="selection-highlight">
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <mesh
            key={`${x}:${z}`}
            position={[x * (w / 2 + 0.11), h / 2, z * (d / 2 + 0.11)]}
          >
            <boxGeometry args={[0.055, h, 0.055]} />
            <meshBasicMaterial color="#ffc060" toneMapped={false} />
          </mesh>
        )),
      )}
      {[0.08, h].map((y) => (
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
  );
}
function useCivicTexture(name: string, accent: string) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#f6f1e4";
    c.fillRect(0, 0, 1024, 256);
    c.fillStyle = accent;
    c.fillRect(0, 214, 1024, 42);
    c.fillStyle = "#2f453c";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = "bold 112px Georgia";
    c.fillText(name.toUpperCase(), 512, 112, 940);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [name, accent]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
/** City-owned buildings: name plate, portico and a flag. No advertising. */
function CivicDetails({ p }: { p: PublicProperty }) {
  const h = p.height,
    w = p.width,
    d = p.depth;
  const accent = p.number === 3 ? "#e77d59" : districtStyle(p.districtId).trim;
  const sign = useCivicTexture(p.name, accent);
  return (
    <group name={`civic-${p.id}`}>
      <mesh position={[0, 1.72, d / 2 + 0.27]}>
        <planeGeometry args={[w * 0.92, w * 0.23]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      <Block
        position={[0, 1.72, d / 2 + 0.2]}
        scale={[w * 0.98, w * 0.27, 0.12]}
        color="#e8e1d0"
      />
      <Block
        position={[0, 1.25, d / 2 + 0.5]}
        scale={[w * 1.05, 0.14, 1]}
        color="#efe9da"
      />
      {[-0.4, -0.13, 0.13, 0.4].map((x) => (
        <Block
          key={x}
          position={[x * w, 0.62, d / 2 + 0.85]}
          scale={[0.13, 1.2, 0.13]}
          color="#f3eee2"
        />
      ))}
      <Block
        position={[w * 0.32, h + 1.3, -d * 0.3]}
        scale={[0.05, 2.4, 0.05]}
        color="#8a8f88"
      />
      <Block
        position={[w * 0.32 + 0.33, h + 2.25, -d * 0.3]}
        scale={[0.6, 0.38, 0.03]}
        color={accent}
      />
    </group>
  );
}
function Scaffold({ w, d, h }: { w: number; d: number; h: number }) {
  return (
    <group name="scaffold">
      <lineSegments
        geometry={outline}
        material={scaffoldMaterial}
        position={[0, h / 2, 0]}
        scale={[w + 0.3, h, d + 0.3]}
      />
      {Array.from({ length: Math.min(12, Math.floor(h)) }, (_, i) => (
        <lineSegments
          key={i}
          geometry={outline}
          material={scaffoldMaterial}
          position={[0, 1 + i, 0]}
          scale={[w + 0.32, 0.01, d + 0.32]}
        />
      ))}
    </group>
  );
}
const dust = Array.from({ length: 10 }, (_, i) => ({
  angle: (i / 10) * Math.PI * 2,
  speed: 0.7 + (i % 3) * 0.25,
  rise: 0.6 + (i % 4) * 0.35,
}));
export const Building = memo(function Building({
  p,
  selected,
  muted,
  faded = false,
  construction,
  onBuilt,
  onSelect,
  onHover,
}: {
  p: PublicProperty;
  selected: boolean;
  muted: boolean;
  faded?: boolean;
  construction?: Construction;
  onBuilt?: (id: string) => void;
  onSelect: (p: PublicProperty) => void;
  onHover: (p: PublicProperty | null) => void;
}) {
  const [hover, setHover] = useState(false);
  const group = useRef<THREE.Group>(null);
  const growth = useRef<THREE.Group>(null);
  const site = useRef<THREE.Group>(null);
  const particles = useRef<(THREE.Mesh | null)[]>([]);
  const [building, setBuilding] = useState(!!construction);
  // The clock starts on the first rendered frame, so a lazily loaded scene still shows the whole build.
  const started = useRef<number | null>(null);
  useEffect(() => {
    setBuilding(!!construction);
    started.current = null;
  }, [construction]);
  useFrame(() => {
    if (!construction || !growth.current) return;
    started.current ??= performance.now();
    const t = Math.min(
      1,
      (performance.now() - started.current) / BUILD_ANIMATION_MS,
    );
    // Foundations first, then the structure rises with a soft landing.
    const g = t < 0.2 ? 0 : (t - 0.2) / 0.8;
    const eased = 1 - Math.pow(1 - g, 3);
    growth.current.scale.y = Math.max(
      0.002,
      construction.from + (1 - construction.from) * eased,
    );
    scaffoldMaterial.opacity = t < 0.85 ? 0.9 : (1 - t) / 0.15;
    particles.current.forEach((m, i) => {
      if (!m) return;
      const k = dust[i],
        r = 0.4 + t * k.speed * 2;
      m.position.set(
        Math.cos(k.angle) * (p.width / 2 + r),
        0.2 + t * k.rise,
        Math.sin(k.angle) * (p.depth / 2 + r),
      );
      m.scale.setScalar(Math.max(0.001, 0.32 * (1 - t)));
    });
    dustMaterial.opacity = 0.8 * (1 - t);
    if (t === 1 && building) {
      growth.current.scale.y = 1;
      setBuilding(false);
      onBuilt?.(p.id);
    }
  });
  useEffect(() => {
    group.current?.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.material) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => {
        if (material === dustMaterial) return;
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
  const level = presenceLevel(p.building?.tier);
  const civic = p.building?.kind === "public";
  const sky = p.building?.tier === "SKYSCRAPER";
  const district = districtStyle(p.districtId);
  const kind = p.ad ? brandKind(p.ad) : "";
  const highlightHeight =
    h +
    (sky
      ? 4.2
      : level >= 3
        ? 3
        : civic
          ? 2.6
          : p.ad && ["cafe", "garden", "lab"].includes(kind)
            ? 0.8
            : p.type === "house" && level <= 1
              ? 1.3
              : p.ad
                ? 2.05
                : 0.9);
  const color = muted
    ? "#c8cebf"
    : p.ad
      ? brandTheme(p.ad).background
      : civic
        ? p.color
        : districtWall(p);
  const plain = !p.ad && !civic;
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
      {building && (
        <group ref={site} name="construction-site">
          <Block
            position={[0, 0.05, 0]}
            scale={[w + 0.4, 0.1, d + 0.4]}
            color="#b9b4a6"
          />
          <Scaffold w={w} d={d} h={h} />
          {dust.map((_, i) => (
            <mesh
              key={i}
              ref={(m) => {
                particles.current[i] = m;
              }}
              geometry={box}
              material={dustMaterial}
              scale={0.001}
            />
          ))}
        </group>
      )}
      <group ref={growth} scale={[1, construction ? 0.002 : 1, 1]}>
        <Block position={[0, h / 2, 0]} scale={[w, h, d]} color={color} />
        <PresenceArchitecture p={p} />
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
        <Block
          position={[0, h + 0.12, 0]}
          scale={[w + 0.15, 0.24, d + 0.15]}
          color={p.ad ? brandTheme(p.ad).accent : district.roof}
        />
        {p.type === "house" && level <= 1 && !civic ? (
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
            {h > 10 && plain && (
              <Block
                position={[0, h + 1.8, 0]}
                scale={[0.15, 3, 0.15]}
                color="#778c86"
              />
            )}
          </>
        )}
        {plain &&
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
        {plain && p.model % 4 === 0 && h > 5 && (
          <Block
            position={[w / 2 + 0.09, h / 2, 0]}
            scale={[0.2, h, d * 0.76]}
            color="#e5e4d9"
          />
        )}
        {plain && p.type !== "house" && p.model % 5 === 1 && (
          <Block
            position={[0, h + 0.8, 0]}
            scale={[w * 0.75, 1.4, d * 0.75]}
            color={color}
          />
        )}
        {plain && p.type !== "house" && p.model % 5 === 2 && (
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
        {plain && p.type !== "house" && p.model % 5 === 3 && (
          <Block
            position={[0, h + 0.35, 0]}
            scale={[w * 0.8, 0.5, d * 0.8]}
            color="#91a981"
          />
        )}
        {plain && p.type !== "house" && p.model % 5 === 4 && (
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
        {(plain || civic) &&
          p.model >= 5 &&
          p.model < 10 &&
          h > 5 &&
          [0.3, 0.6, 0.9].map((y) => (
            <Block
              key={y}
              position={[0, h * y, 0]}
              scale={[w + 0.12, 0.15, d + 0.12]}
              color="#e9e8da"
            />
          ))}
        {plain && p.model >= 10 && p.model < 15 && (
          <Block
            position={[0, h * 0.5, d / 2 + 0.06]}
            scale={[w * 0.18, h * 0.8, 0.12]}
            color="#779597"
          />
        )}
        {(plain || civic) && p.model >= 15 && (
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
        {civic && <CivicDetails p={p} />}
        {p.ad && !faded && <BrandSign p={p as PublicProperty & { ad: Ad }} />}
      </group>
      {selected && !building && (
        <SelectionFrame w={w} d={d} h={highlightHeight} />
      )}
    </group>
  );
});
