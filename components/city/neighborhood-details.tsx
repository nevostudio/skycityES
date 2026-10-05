"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { District, PublicProperty } from "@/types";
import { districtStyle } from "./district-style";
import { useSceneMotion } from "./scene-motion";

const cube = new THREE.BoxGeometry(1, 1, 1);
type Furniture = {
  p: [number, number, number];
  s: [number, number, number];
  c: string;
};

export function NeighborhoodDetails({
  districts,
  properties,
}: {
  districts: District[];
  properties: PublicProperty[];
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => {
    const pieces: Furniture[] = [];
    const add = (p: Furniture["p"], s: Furniture["s"], c: string) =>
      pieces.push({ p, s, c });
    districts.forEach((d, districtIndex) => {
      const style = districtStyle(d.id),
        old = d.id === "old-town",
        business = d.id === "business-district",
        tech = d.id === "tech-district",
        night = d.id === "entertainment-district",
        residential = d.id === "residential-district";
      for (const side of [-1, 1]) {
        for (const x of [-10, 0, 10]) {
          const z = d.z + side * 14.8;
          add(
            [d.x + x, 1.85, z],
            [0.1, 3.15, 0.1],
            old ? "#645e4e" : "#7d8e87",
          );
          add(
            [d.x + x, 3.48, z],
            [old ? 0.32 : 0.5, 0.14, 0.28],
            night ? "#f1d9c8" : business ? "#e3ecec" : "#f5e6c4",
          );
          add(
            [d.x + x + 1, 0.55, z],
            [1.2, 0.14, 0.4],
            old ? "#a7805a" : "#c9ab84",
          );
          add([d.x + x + 0.65, 0.35, z], [0.1, 0.4, 0.35], "#758376");
          add([d.x + x + 1.35, 0.35, z], [0.1, 0.4, 0.35], "#758376");
        }
        if (residential)
          for (let x = -13; x < 14; x += 3)
            add([d.x + x, 0.65, d.z + side * 13.5], [1.9, 0.7, 0.5], "#a3be8c");
        if (night)
          for (let x = -12; x < 13; x += 4)
            add(
              [d.x + x, 0.36, d.z + side * 13.7],
              [2.2, 0.04, 0.13],
              x % 8 ? "#ece2dc" : "#c6dad6",
            );
        if (old)
          for (let x = -13; x < 14; x += 1.3)
            add(
              [d.x + x, 0.355, d.z + side * 12.9],
              [0.035, 0.015, 1.7],
              "#e3d6bd",
            );
      }
      if (business) {
        add([d.x + 14.5, 0.45, d.z + 8], [1.5, 0.3, 2.3], "#b5c2c5");
        add([d.x + 14.5, 1.8, d.z + 8], [0.55, 2.6, 0.65], "#8ba6ac");
        add([d.x + 14.5, 3.1, d.z + 8], [1.3, 0.25, 1.3], "#d1dde0");
      }
      if (tech) {
        add([d.x, 2.9, d.z - 14.5], [7, 0.12, 1.3], "#658d98");
        for (const x of [-3, 3])
          add([d.x + x, 1.65, d.z - 14.5], [0.12, 2.7, 0.12], "#afc9bd");
        for (let x = -3; x <= 3; x++)
          add([d.x + x, 2.98, d.z - 14.5], [0.03, 0.025, 1.3], "#afcecd");
      }
      // Turn part of the released grid into low, instanced urban infill. Active plots always
      // win, including locations restored later from City Hall or protected by migration.
      for (let i = 0; i < 30; i++) {
        const x = d.x + ((i % 6) - 2.5) * 4.8;
        const z = d.z + (Math.floor(i / 6) - 2) * 5.3;
        if (
          properties.some(
            (p) => p.districtId === d.id && Math.hypot(p.x - x, p.z - z) < 1.2,
          ) ||
          (i + districtIndex) % 2
        )
          continue;
        const variant = (i + districtIndex) % 3;
        if (variant === 0) {
          add([x, 0.39, z], [3.5, 0.08, 3.9], "#c9d8b3");
          add([x - 1.15, 0.72, z - 1.3], [0.7, 0.58, 0.7], style.trees);
          add([x + 1.05, 0.66, z + 1.15], [0.8, 0.48, 0.8], style.trees);
          add([x, 0.55, z], [1.4, 0.14, 0.42], "#c9ab84");
        } else if (variant === 1) {
          add([x, 0.39, z], [3.55, 0.08, 3.95], "#ddd8cd");
          for (const side of [-1, 0, 1])
            add([x + side * 1.05, 0.445, z], [0.055, 0.018, 3.1], "#fbf8f1");
          add([x, 0.58, z - 1.6], [2.6, 0.28, 0.35], "#a9c08f");
        } else {
          add([x, 0.4, z], [3.5, 0.1, 3.9], "#ece5d4");
          add([x, 0.53, z], [2.5, 0.08, 0.45], style.trim);
          add([x - 1.25, 0.68, z + 1.25], [0.55, 0.52, 0.55], style.trees);
          add([x + 1.25, 0.68, z - 1.25], [0.55, 0.52, 0.55], style.trees);
        }
      }
    });
    // Timber promenade runs beside the existing river, clear of the parcels.
    for (let z = -54; z < 64; z += 1.2)
      add(
        [50.4, 0.42, z],
        [1.7, 0.12, 1.12],
        Math.round(z) % 2 ? "#c4ad87" : "#d2bb96",
      );
    for (let z = -50; z < 60; z += 8) {
      add([51.3, 1, z], [0.12, 1.2, 0.12], "#b3ae93");
      add([51.3, 1.4, z + 4], [0.06, 0.06, 8], "#d3d6c2");
    }
    return pieces;
  }, [districts, properties]);
  useEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D();
    items.forEach((v, i) => {
      dummy.position.set(...v.p);
      dummy.scale.set(...v.s);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
      mesh.current!.setColorAt(i, new THREE.Color(v.c));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor)
      mesh.current.instanceColor.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh
      ref={mesh}
      args={[cube, undefined, items.length]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial roughness={0.85} />
    </instancedMesh>
  );
}

export function RiverLife() {
  const boat = useRef<THREE.Group>(null),
    ripples = useRef<THREE.Group>(null),
    elapsed = useRef(0),
    motion = useSceneMotion();
  useFrame((_, delta) => {
    if (!motion) return;
    elapsed.current += Math.min(delta, 0.05);
    if (boat.current) {
      boat.current.position.z = 6 + Math.sin(elapsed.current * 0.025) * 9;
      boat.current.position.y = 0.62 + Math.sin(elapsed.current * 0.7) * 0.035;
    }
    if (ripples.current)
      ripples.current.position.z = Math.sin(elapsed.current * 0.15) * 0.35;
  });
  return (
    <>
      <group ref={boat} position={[55, 0.62, 8]}>
        <mesh castShadow>
          <boxGeometry args={[1.15, 0.36, 2.7]} />
          <meshStandardMaterial color="#eee8d6" />
        </mesh>
        <mesh position={[0, 0.45, -0.15]}>
          <boxGeometry args={[0.72, 0.6, 1.1]} />
          <meshStandardMaterial color="#c0d0c8" />
        </mesh>
        <mesh position={[0, 0.8, -0.15]}>
          <boxGeometry args={[0.84, 0.08, 1.3]} />
          <meshStandardMaterial color="#ac8d64" />
        </mesh>
      </group>
      <group ref={ripples}>
        {Array.from({ length: 22 }, (_, i) => (
          <mesh
            key={i}
            position={[51 + (i % 3) * 3.1, 0.23, -47 + i * 5]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[1.1 + (i % 3) * 0.5, 0.045]} />
            <meshBasicMaterial color="#cbe4dd" transparent opacity={0.32} />
          </mesh>
        ))}
      </group>
    </>
  );
}
