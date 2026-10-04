"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { WorldLabel as Html } from "./world-label";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import type { District, PublicProperty } from "@/types";
import { euro, offerPrice, offerDays } from "@/lib/client";

import { Building, Block, box, leaf, palette } from "./building";
import { brandKind } from "./brand-sign";
import { districtStyle } from "./district-style";
import { useSceneMotion } from "./scene-motion";
import { NeighborhoodDetails, RiverLife } from "./neighborhood-details";
function Instances({
  items,
  geometry = box,
}: {
  items: {
    p: [number, number, number];
    s: [number, number, number];
    c: string;
    r?: number;
  }[];
  geometry?: THREE.BufferGeometry;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Object3D();
    items.forEach((v, i) => {
      m.position.set(...v.p);
      m.scale.set(...v.s);
      m.rotation.set(0, v.r || 0, 0);
      m.updateMatrix();
      ref.current!.setMatrixAt(i, m.matrix);
      ref.current!.setColorAt(i, new THREE.Color(v.c));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, items.length]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  );
}
function Details({
  properties,
  districts,
  faded,
}: {
  properties: PublicProperty[];
  districts: District[];
  faded: Set<string>;
}) {
  const windows = useMemo(
    () =>
      properties.flatMap((p) => {
        if (faded.has(p.id)) return [];
        const a: {
          p: [number, number, number];
          s: [number, number, number];
          c: string;
          r?: number;
        }[] = [];
        for (let y = 1.2; y < p.height - 0.6; y += 1.5)
          for (let j = -1; j <= 1; j++) {
            a.push({
              p: [p.x + j * 0.72, y + 0.32, p.z + p.depth / 2 + 0.025],
              s: [0.42, 0.7, 0.045],
              c: windowColor(p),
            });
            a.push({
              p: [p.x + p.width / 2 + 0.025, y + 0.32, p.z + j * 0.82],
              s: [0.045, 0.7, 0.46],
              c: windowColor(p),
            });
          }
        return a.map((item) => {
          const x = item.p[0] - p.x,
            z = item.p[2] - p.z;
          return {
            ...item,
            p: [
              p.x + x * Math.cos(p.rotation) + z * Math.sin(p.rotation),
              item.p[1],
              p.z - x * Math.sin(p.rotation) + z * Math.cos(p.rotation),
            ] as [number, number, number],
            r: p.rotation,
          };
        });
      }),
    [properties, faded],
  );
  const trees = useMemo(() => {
    const a: {
      p: [number, number, number];
      s: [number, number, number];
      c: string;
    }[] = [];
    districts.forEach((d) => {
      for (let i = 0; i < 14; i++) {
        const x = d.x - 15 + (i % 7) * 5;
        const z = d.z + (i < 7 ? -14 : 14);
        a.push({
          p: [x, 2, z],
          s: [1.1, 1.7, 1.1],
          c: districtStyle(d.id).trees,
        });
      }
    });
    for (let i = 0; i < 38; i++)
      a.push({
        p: [-48 + (i % 8) * 3, 1.8, 32 + Math.floor(i / 8) * 4],
        s: [1.2, 1.8, 1.2],
        c: i % 2 ? "#8eab7b" : "#789969",
      });
    return a;
  }, [districts, properties, faded]);
  const trunks = useMemo(
    () =>
      trees.map((t) => ({
        p: [t.p[0], t.p[1] - 1.1, t.p[2]] as [number, number, number],
        s: [0.18, t.p[1] > 3 ? 0.5 : 1.5, 0.18] as [number, number, number],
        c: "#9a8c6d",
      })),
    [trees],
  );
  const crossings = useMemo(
    () =>
      [-54, -18, 18, 54].flatMap((x) =>
        [-48, -12, 24, 60].flatMap((z) =>
          [-1, 1].flatMap((side) =>
            Array.from({ length: 6 }, (_, i) => [
              {
                p: [x - 1.5 + i * 0.6, 0.28, z + side * 3] as [
                  number,
                  number,
                  number,
                ],
                s: [0.3, 0.025, 1.1] as [number, number, number],
                c: "#e9e8d9",
              },
              {
                p: [x + side * 3, 0.28, z - 1.5 + i * 0.6] as [
                  number,
                  number,
                  number,
                ],
                s: [1.1, 0.025, 0.3] as [number, number, number],
                c: "#e9e8d9",
              },
            ]).flat(),
          ),
        ),
      ),
    [],
  );
  return (
    <>
      <Instances items={windows} />
      <Instances items={trunks} />
      <Instances geometry={leaf} items={trees} />
      <Instances items={crossings} />
    </>
  );
}
function windowColor(p: PublicProperty) {
  const kind = p.ad ? brandKind(p.ad) : "";
  return kind === "cafe"
    ? "#cdb080"
    : kind === "nightlife"
      ? "#81608f"
      : kind === "garden"
        ? "#93aa76"
        : p.status === "auction"
          ? "#bbac87"
          : districtStyle(p.districtId).glass;
}
function Car({
  offset,
  color,
  axis = "x",
  lane = -12.8,
  speed = 0.85,
}: {
  offset: number;
  color: string;
  axis?: "x" | "z";
  lane?: number;
  speed?: number;
}) {
  const ref = useRef<THREE.Group>(null),
    elapsed = useRef(offset),
    motion = useSceneMotion();
  useFrame((_, delta) => {
    if (!ref.current || !motion) return;
    elapsed.current += Math.min(delta, 0.05) * speed;
    ref.current.position[axis] = (((elapsed.current % 108) + 108) % 108) - 54;
  });
  return (
    <group
      ref={ref}
      position={
        axis === "x" ? [offset - 54, 0.55, lane] : [lane, 0.55, offset - 54]
      }
      rotation={[0, axis === "z" ? Math.PI / 2 : 0, 0]}
    >
      <Block position={[0, 0, 0]} scale={[1.45, 0.4, 0.68]} color={color} />
      <Block
        position={[-0.05, 0.3, 0]}
        scale={[0.72, 0.3, 0.6]}
        color="#b3c8c8"
      />
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <mesh
            key={x + ":" + z}
            position={[x * 0.44, -0.15, z * 0.33]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.14, 0.14, 0.09, 8]} />
            <meshStandardMaterial color="#4e5554" />
          </mesh>
        )),
      )}
    </group>
  );
}
function Camera({
  focus,
  selected,
  zoomAction,
  resetKey,
}: {
  focus: District | null;
  selected: PublicProperty | undefined;
  zoomAction: number;
  resetKey: number;
}) {
  const controls = useRef<OrbitControlsType>(null);
  const { camera, size } = useThree();
  const previous = useRef(0),
    motion = useSceneMotion();
  const previousNavigation = useRef({
    selected: undefined as string | undefined,
    focus: undefined as string | undefined,
    reset: -1,
  });
  const destination = useRef<{
    from: THREE.Vector3;
    to: THREE.Vector3;
    zoomFrom: number;
    zoomTo: number;
    elapsed: number;
  } | null>(null);
  const x = selected?.x ?? focus?.x ?? -17,
    z = selected?.z ?? focus?.z ?? 14,
    h = selected?.height ?? 0,
    id = selected?.id;
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const old = previousNavigation.current;
    previousNavigation.current = {
      selected: id,
      focus: focus?.id,
      reset: resetKey,
    };
    if (
      old.selected &&
      !id &&
      old.focus === focus?.id &&
      old.reset === resetKey
    ) {
      destination.current = null;
      return;
    }
    destination.current = {
      from: c.target.clone(),
      to: new THREE.Vector3(x, id ? h * 0.48 : 2, z),
      zoomFrom: camera.zoom,
      zoomTo: id
        ? size.width < 600
          ? 26
          : Math.min(41, size.height / (h * 0.9 + 8))
        : size.width < 600
          ? 17
          : focus
            ? 29
            : 27,
      elapsed: 0,
    };
  }, [x, z, h, id, focus?.id, resetKey, size.width, size.height, camera]);
  useEffect(() => {
    const change = zoomAction - previous.current;
    previous.current = zoomAction;
    if (!change) return;
    destination.current = null;
    camera.zoom = THREE.MathUtils.clamp(camera.zoom + change * 3, 5, 64);
    camera.updateProjectionMatrix();
  }, [zoomAction, camera]);
  const next = useRef(new THREE.Vector3()),
    step = useRef(new THREE.Vector3());
  useFrame((_, delta) => {
    const goal = destination.current,
      c = controls.current;
    if (!goal || !c) return;
    goal.elapsed += Math.min(delta, 0.06);
    const t = motion ? Math.min(goal.elapsed / 0.95, 1) : 1;
    const eased = t * t * (3 - 2 * t);
    next.current.lerpVectors(goal.from, goal.to, eased);
    step.current.copy(next.current).sub(c.target);
    camera.position.add(step.current);
    c.target.copy(next.current);
    camera.zoom = THREE.MathUtils.lerp(goal.zoomFrom, goal.zoomTo, eased);
    camera.updateProjectionMatrix();
    c.update();
    if (t === 1) destination.current = null;
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      minZoom={5}
      maxZoom={64}
      maxPolarAngle={Math.PI / 2.6}
      minPolarAngle={Math.PI / 7}
      onStart={() => {
        destination.current = null;
      }}
      mouseButtons={{
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
      touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }}
    />
  );
}
export default function CityScene({
  properties,
  districts,
  selected,
  onSelect,
  matching,
  focus,
  zoomAction,
  resetKey,
}: {
  properties: PublicProperty[];
  districts: District[];
  selected: string | null;
  onSelect: (p: PublicProperty) => void;
  matching: string[];
  focus: District | null;
  zoomAction: number;
  resetKey: number;
}) {
  const [hover, setHover] = useState<PublicProperty | null>(null);
  const selectedProperty = properties.find((p) => p.id === selected);
  const faded = useMemo(
    () =>
      new Set(
        properties
          .filter((p) => {
            if (!selectedProperty || p.id === selectedProperty.id) return false;
            const dx = p.x - selectedProperty.x,
              dz = p.z - selectedProperty.z;
            return (
              Math.hypot(dx, dz) < 10 &&
              p.height > selectedProperty.height * 0.6
            );
          })
          .map((p) => p.id),
      ),
    [properties, selectedProperty],
  );
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      orthographic
      camera={{ position: [93, 107, 139], zoom: 27, near: 0.1, far: 650 }}
      dpr={[1, 1.6]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      onPointerMissed={() => setHover(null)}
    >
      <color attach="background" args={["#e7e9df"]} />
      <fog attach="fog" args={["#e7e9df", 210, 380]} />
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#f4f6e6", "#72886a", 1]} />
      <directionalLight
        position={[-45, 90, 30]}
        intensity={3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-95}
        shadow-camera-right={95}
        shadow-camera-top={95}
        shadow-camera-bottom={-95}
        shadow-bias={-0.001}
      />
      <Block position={[0, -1.1, 5]} scale={[124, 2, 126]} color="#b4c4aa" />
      <Block
        position={[0, -0.04, 5]}
        scale={[124, 0.3, 126]}
        color={palette.ground}
      />
      <Block
        position={[56, 0.14, 6]}
        scale={[12, 0.12, 126]}
        color={palette.water}
      />
      <Block position={[47, 0.17, 5]} scale={[3, 0.15, 126]} color="#ded8c3" />
      {[-54, -18, 18, 54].map((x) => (
        <group key={`v${x}`}>
          <Block
            position={[x, 0.18, 5]}
            scale={[4, 0.13, 126]}
            color={palette.road}
          />
          {Array.from({ length: 24 }, (_, i) => (
            <Block
              key={i}
              position={[x, 0.26, -53 + i * 5]}
              scale={[0.12, 0.025, 2]}
              color={palette.line}
            />
          ))}
        </group>
      ))}
      {[-48, -12, 24, 60].map((z) => (
        <group key={`h${z}`}>
          <Block
            position={[0, 0.19, z]}
            scale={[124, 0.13, 4]}
            color={palette.road}
          />
          {Array.from({ length: 24 }, (_, i) => (
            <Block
              key={i}
              position={[-58 + i * 5, 0.27, z]}
              scale={[2, 0.025, 0.12]}
              color={palette.line}
            />
          ))}
        </group>
      ))}
      {districts.map((d) => (
        <group key={d.id}>
          <Block
            position={[d.x, 0.19, d.z]}
            scale={[31, 0.3, 29]}
            color={districtStyle(d.id).paving}
          />
          <Block
            position={[d.x, 0.37, d.z]}
            scale={[28.5, 0.08, 0.65]}
            color={districtStyle(d.id).trim}
          />
        </group>
      ))}
      <Block position={[-36, 0.2, 42]} scale={[30, 0.3, 29]} color="#b5c7a0" />
      <Block position={[-36, 0.4, 42]} scale={[25, 0.1, 2]} color="#dcd8bd" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-36, 0.5, 42]}>
        <circleGeometry args={[5, 32]} />
        <meshStandardMaterial color="#8ebbb5" />
      </mesh>
      <Block position={[52, 0.5, 24]} scale={[21, 0.5, 4]} color="#e2dcc7" />
      <Details properties={properties} districts={districts} faded={faded} />
      <NeighborhoodDetails districts={districts} />
      <RiverLife />
      {properties.map((p) => (
        <Building
          key={p.id}
          p={p}
          selected={selected === p.id}
          muted={!matching.includes(p.id)}
          faded={faded.has(p.id)}
          showAuctionLabel={!selected || selected === p.id}
          onSelect={onSelect}
          onHover={setHover}
        />
      ))}
      <Car offset={5} color="#e4a178" />
      <Car offset={39} color="#f1eee3" lane={-11.2} speed={-0.7} />
      <Car offset={71} color="#7b9698" axis="z" lane={-18.8} speed={0.72} />
      <Car offset={99} color="#d2b76f" lane={23.2} speed={0.6} />
      <Car offset={30} color="#96af95" lane={24.8} speed={-0.8} />
      <Car offset={67} color="#dbc5ab" axis="z" lane={18.8} speed={-0.65} />
      {hover && hover.id !== selected && (
        <Html
          position={[hover.x, hover.height + 4, hover.z]}
          center
          zIndexRange={[8, 5]}
          style={{ pointerEvents: "none" }}
        >
          <div className="map-tooltip">
            <span className={`status-dot ${hover.status}`} />
            {hover.ad?.logo && <img src={hover.ad.logo} alt="" />}
            <strong>{hover.ad?.brand || hover.name}</strong>
            <small>
              {hover.status === "available"
                ? `${euro(offerPrice(hover))} / ${offerDays(hover)} days`
                : hover.ad
                  ? "View building ↗"
                  : hover.status.toUpperCase()}
            </small>
            {hover.status === "available" && <em>CLAIM THIS SPOT ↗</em>}
          </div>
        </Html>
      )}
      <Camera
        focus={focus}
        selected={properties.find((p) => p.id === selected)}
        zoomAction={zoomAction}
        resetKey={resetKey}
      />
    </Canvas>
  );
}
