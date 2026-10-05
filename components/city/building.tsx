"use client";
import { useState, useEffect, useMemo, useRef, memo } from "react";
import { useFrame } from "@react-three/fiber";
import { BrandSign } from "./brand-sign";
import { brandKind, brandTheme, tint } from "@/lib/brand-theme";
import { districtStyle, districtWall } from "./district-style";
import { BuildingForm } from "./architecture";
import { architectureOf } from "@/lib/massing";
import { presenceLevel } from "@/lib/presence";
import { signSize } from "@/lib/branding";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Ad, PublicProperty } from "@/types";
export const box = new THREE.BoxGeometry(1, 1, 1);
const cone = new THREE.ConeGeometry(1, 1, 4);
export const outline = new THREE.EdgesGeometry(box);
export const leaf = new THREE.IcosahedronGeometry(1, 1);
/** PDF diorama palette: cream board, light warm roads, calm river. */
export const palette = {
  road: "#d4cec2",
  line: "#fbf8f1",
  ground: "#e7e0cf",
  water: "#a6c9c5",
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
            <boxGeometry args={[0.04, h, 0.04]} />
            <meshBasicMaterial color="#e8663a" toneMapped={false} />
          </mesh>
        )),
      )}
      {[0.08, h].map((y) => (
        <group key={y} position={[0, y, 0]}>
          {[-1, 1].map((side) => (
            <group key={side}>
              <mesh position={[0, 0, side * (d / 2 + 0.11)]}>
                <boxGeometry args={[w + 0.3, 0.045, 0.045]} />
                <meshBasicMaterial color="#e8663a" toneMapped={false} />
              </mesh>
              <mesh position={[side * (w / 2 + 0.11), 0, 0]}>
                <boxGeometry args={[0.045, 0.045, d + 0.3]} />
                <meshBasicMaterial color="#e8663a" toneMapped={false} />
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
  signWidth,
  onBuilt,
  onSelect,
  onHover,
}: {
  p: PublicProperty;
  selected: boolean;
  muted: boolean;
  faded?: boolean;
  construction?: Construction;
  /** Room left by neighbours for the rooftop sign. */
  signWidth?: number;
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
  const highlightHeight =
    h +
    (p.ad
      ? (() => {
          const sign = signSize(p.building?.tier ?? "STARTER", w, signWidth);
          return 0.34 + sign.lift + sign.height;
        })()
      : sky
        ? 4.2
        : level >= 3
          ? 3
          : civic
            ? 2.6
            : p.type === "house" && level <= 1
              ? 1.3
              : 0.9);
  // PDF page 3: the district sets the material; the brand shows through its sign and one
  // secondary element. Only leisure facades and curated demo brands take the brand colour.
  const arch = architectureOf(p.districtId);
  const curated = !!p.ad && brandKind(p.ad) !== "custom";
  const color = muted
    ? "#d6d8cf"
    : civic
      ? p.color
      : curated
        ? brandTheme(p.ad!).background
        : arch === "leisure" && p.ad
          ? tint(p.ad.primary, 0.32)
          : districtWall(p);
  const accent = p.ad?.primary ?? district.trim;
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
          <planeGeometry args={[w + 1.2, d + 1.2]} />
          <meshBasicMaterial
            color={selected ? "#e8663a" : "#fbf8f1"}
            transparent
            opacity={selected ? 0.35 : 0.8}
          />
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
        <BuildingForm p={p} wall={color} accent={accent} muted={muted} />
        {(selected || hover) && (
          <lineSegments
            geometry={outline}
            position={[0, h / 2, 0]}
            scale={[w + 0.12, h + 0.14, d + 0.12]}
          >
            <lineBasicMaterial
              color={selected ? "#e8663a" : "#7fa36f"}
              linewidth={2}
              toneMapped={false}
            />
          </lineSegments>
        )}
        {civic && !p.ad && <CivicDetails p={p} />}
        {p.ad && !faded && (
          <BrandSign
            p={p as PublicProperty & { ad: Ad }}
            maxSignWidth={signWidth}
          />
        )}
      </group>
      {selected && !building && (
        <SelectionFrame w={w} d={d} h={highlightHeight} />
      )}
    </group>
  );
});
