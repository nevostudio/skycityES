"use client";
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { PublicProperty } from "@/types";
import { Block, SelectionFrame, box } from "./building";
import { WorldLabel as Html } from "./world-label";
import { useSceneMotion } from "./scene-motion";
import { siteNote } from "@/lib/client";

type Matrix = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
};
const corners = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const;
/** Rotates a local offset around the plot center (plots may be rotated in City Hall). */
function local(p: PublicProperty, x: number, z: number) {
  const c = Math.cos(p.rotation),
    s = Math.sin(p.rotation);
  return { x: p.x + x * c + z * s, z: p.z - x * s + z * c };
}
function write(
  mesh: THREE.InstancedMesh | null,
  items: { m: Matrix; c: string; r: number }[],
) {
  if (!mesh) return;
  const o = new THREE.Object3D(),
    color = new THREE.Color();
  items.forEach(({ m, c, r }, i) => {
    o.position.set(m.x, m.y, m.z);
    o.rotation.set(0, r, 0);
    o.scale.set(m.sx, m.sy, m.sz);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    mesh.setColorAt(i, color.set(c));
  });
  mesh.count = items.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}
/**
 * Every empty private plot in four instanced draw calls: curb, soil, survey stakes and the "+".
 * The curb mesh carries the pointer events (instanceId → plot).
 */
export function PlotField({
  plots,
  muted,
  onSelect,
  onHover,
}: {
  plots: PublicProperty[];
  muted: Set<string>;
  onSelect: (p: PublicProperty) => void;
  onHover: (p: PublicProperty | null) => void;
}) {
  const curb = useRef<THREE.InstancedMesh>(null),
    soil = useRef<THREE.InstancedMesh>(null),
    stakes = useRef<THREE.InstancedMesh>(null),
    marks = useRef<THREE.InstancedMesh>(null);
  const capacity = Math.max(1, plots.length);
  useLayoutEffect(() => {
    const curbs: { m: Matrix; c: string; r: number }[] = [],
      soils: typeof curbs = [],
      posts: typeof curbs = [],
      signs: typeof curbs = [];
    for (const p of plots) {
      const off = muted.has(p.id),
        reserved = p.status === "reserved",
        r = p.rotation;
      curbs.push({
        m: {
          x: p.x,
          y: 0.37,
          z: p.z,
          sx: p.width + 0.5,
          sy: 0.1,
          sz: p.depth + 0.5,
        },
        c: off ? "#d6d8ce" : "#e6e1d2",
        r,
      });
      soils.push({
        m: {
          x: p.x,
          y: 0.42,
          z: p.z,
          sx: p.width + 0.1,
          sy: 0.12,
          sz: p.depth + 0.1,
        },
        c: off ? "#cfd2c6" : reserved ? "#ab9670" : "#c9b48c",
        r,
      });
      for (const [cx, cz] of corners) {
        const at = local(p, cx * (p.width / 2 + 0.1), cz * (p.depth / 2 + 0.1));
        posts.push({
          m: { ...at, y: 0.66, sx: 0.07, sy: 0.5, sz: 0.07 },
          c: off ? "#c4c7bd" : reserved ? "#e2bb4f" : "#e28a4f",
          r,
        });
      }
      // Available: a small "+" drawn on the soil. Reserved: foundation footings already laid.
      const bar = reserved ? [p.width * 0.8, 0.14, 0.2] : [0.95, 0.04, 0.22];
      const color = off ? "#c3c7bb" : reserved ? "#a6a499" : "#6f9a6a";
      signs.push(
        {
          m: { x: p.x, y: 0.5, z: p.z, sx: bar[0], sy: bar[1], sz: bar[2] },
          c: color,
          r,
        },
        {
          m: {
            x: p.x,
            y: 0.5,
            z: p.z,
            sx: bar[2],
            sy: bar[1],
            sz: reserved ? p.depth * 0.8 : bar[0],
          },
          c: color,
          r,
        },
      );
    }
    write(curb.current, curbs);
    write(soil.current, soils);
    write(stakes.current, posts);
    write(marks.current, signs);
  }, [plots, muted]);
  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
    e.instanceId === undefined ? undefined : plots[e.instanceId];
  return (
    <group name="plots">
      <instancedMesh
        ref={curb}
        args={[box, undefined, capacity]}
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          const p = pick(e);
          if (!p) return;
          onHover(p);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          const p = pick(e);
          if (p && e.delta < 6) onSelect(p);
        }}
      >
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={soil} args={[box, undefined, capacity]} receiveShadow>
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={stakes}
        args={[box, undefined, capacity * 4]}
        castShadow
      >
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={marks} args={[box, undefined, capacity * 2]}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </group>
  );
}
/** Hover and selection feedback for a single empty plot. */
export function PlotHighlight({
  p,
  selected,
}: {
  p: PublicProperty;
  selected: boolean;
}) {
  return (
    <group position={[p.x, 0.32, p.z]} rotation={[0, p.rotation, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[p.width + 1.5, p.depth + 1.5]} />
        <meshBasicMaterial color={selected ? "#e97e51" : "#f6dba2"} />
      </mesh>
      {selected ? (
        <SelectionFrame w={p.width + 0.4} d={p.depth + 0.4} h={1.1} />
      ) : (
        <lineSegments
          position={[0, 0.4, 0]}
          scale={[p.width + 0.6, 0.6, p.depth + 0.6]}
        >
          <edgesGeometry args={[box]} />
          <lineBasicMaterial color="#94d69a" toneMapped={false} />
        </lineSegments>
      )}
    </group>
  );
}

function useSiteSign(title: string, note: string) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 430;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#223937";
    c.fillRect(0, 0, 1024, 430);
    c.strokeStyle = "#cfb377";
    c.lineWidth = 10;
    c.strokeRect(18, 18, 988, 394);
    c.fillStyle = "#e9d59c";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = "30px sans-serif";
    c.fillText("SKYCITY · PARCELA PREMIUM", 512, 80, 900);
    c.font = "bold 92px Georgia";
    c.fillText(title.toUpperCase(), 512, 205, 920);
    c.fillRect(452, 268, 120, 3);
    c.font = "bold 40px sans-serif";
    c.fillText(note, 512, 335, 920);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [title, note]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
/** Skyscraper plot waiting for a major brand: hoarding, foundations, columns and a crane. */
export const PremiumSite = memo(function PremiumSite({
  p,
  selected,
  muted,
  showAuctionLabel,
  onSelect,
  onHover,
}: {
  p: PublicProperty;
  selected: boolean;
  muted: boolean;
  showAuctionLabel: boolean;
  onSelect: (p: PublicProperty) => void;
  onHover: (p: PublicProperty | null) => void;
}) {
  const [hover, setHover] = useState(false);
  const crane = useRef<THREE.Group>(null),
    elapsed = useRef(p.number),
    motion = useSceneMotion();
  const sign = useSiteSign(p.name, siteNote(p));
  useFrame((_, delta) => {
    if (!motion || !crane.current) return;
    elapsed.current += Math.min(delta, 0.05);
    crane.current.rotation.y = Math.sin(elapsed.current * 0.12) * 0.9;
  });
  const w = p.width,
    d = p.depth;
  const fence = muted ? "#d9dbd1" : "#ebe5d6";
  const gold = muted ? "#cfd1c6" : "#c8af76";
  return (
    <group
      name={`site-${p.id}`}
      position={[p.x, 0.32, p.z]}
      rotation={[0, p.rotation, 0]}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta < 6) onSelect(p);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        onHover(p);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        onHover(null);
        document.body.style.cursor = "auto";
      }}
    >
      {(selected || hover) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <planeGeometry args={[w + 2, d + 2]} />
          <meshBasicMaterial color={selected ? "#e97e51" : "#f6dba2"} />
        </mesh>
      )}
      <Block
        position={[0, 0.08, 0]}
        scale={[w + 0.8, 0.16, d + 0.8]}
        color="#a9a69c"
      />
      {[-1, 0, 1].flatMap((x) =>
        [-1, 0, 1].map((z) => (
          <Block
            key={`${x}:${z}`}
            position={[x * w * 0.32, 0.24, z * d * 0.32]}
            scale={[0.42, 0.16, 0.42]}
            color="#bdbab0"
          />
        )),
      )}
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <Block
            key={`c${x}:${z}`}
            position={[x * w * 0.32, 1.4, z * d * 0.32]}
            scale={[0.24, 2.6, 0.24]}
            color="#d6d2c6"
          />
        )),
      )}
      <Block
        position={[0, 2.75, 0]}
        scale={[w * 0.8, 0.14, d * 0.8]}
        color="#cbc7ba"
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block
            position={[0, 0.65, side * (d / 2 + 0.45)]}
            scale={[w + 0.9, 1, 0.08]}
            color={fence}
          />
          <Block
            position={[side * (w / 2 + 0.45), 0.65, 0]}
            scale={[0.08, 1, d + 0.9]}
            color={fence}
          />
          <Block
            position={[0, 1.17, side * (d / 2 + 0.45)]}
            scale={[w + 0.92, 0.06, 0.1]}
            color={gold}
          />
          <Block
            position={[side * (w / 2 + 0.45), 1.17, 0]}
            scale={[0.1, 0.06, d + 0.92]}
            color={gold}
          />
        </group>
      ))}
      {!muted && (
        <mesh position={[0, 1.2, d / 2 + 0.52]}>
          <planeGeometry args={[w + 0.8, (w + 0.8) * 0.42]} />
          <meshBasicMaterial map={sign} toneMapped={false} />
        </mesh>
      )}
      <group position={[-w * 0.38, 0, -d * 0.38]}>
        <Block
          position={[0, 5.2, 0]}
          scale={[0.26, 10.4, 0.26]}
          color="#e2b54b"
        />
        <group ref={crane} position={[0, 10.5, 0]}>
          <Block
            position={[2.3, 0, 0]}
            scale={[6.4, 0.2, 0.2]}
            color="#e2b54b"
          />
          <Block
            position={[-1.3, 0, 0]}
            scale={[2, 0.22, 0.22]}
            color="#e2b54b"
          />
          <Block
            position={[-2, -0.35, 0]}
            scale={[0.6, 0.5, 0.45]}
            color="#8c8f88"
          />
          <Block
            position={[0.25, -0.3, 0]}
            scale={[0.5, 0.45, 0.45]}
            color="#f1ead8"
          />
          <Block
            position={[4.8, -2.6, 0]}
            scale={[0.03, 5.2, 0.03]}
            color="#5f625c"
          />
          <Block
            position={[4.8, -5.25, 0]}
            scale={[0.3, 0.2, 0.3]}
            color="#d9813f"
          />
        </group>
      </group>
      {(selected || hover) && (
        <lineSegments position={[0, 1.4, 0]} scale={[w + 1, 2.8, d + 1]}>
          <edgesGeometry args={[box]} />
          <lineBasicMaterial
            color={selected ? "#f2a266" : "#94d69a"}
            toneMapped={false}
          />
        </lineSegments>
      )}
      {selected && <SelectionFrame w={w + 0.9} d={d + 0.9} h={3} />}
      {p.auction && !muted && showAuctionLabel && (
        <Html position={[0, 12, 0]} center zIndexRange={[3, 0]}>
          <button
            className="auction-pin"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(p);
            }}
          >
            <span>◆</span> Subasta en directo
          </button>
        </Html>
      )}
    </group>
  );
});
