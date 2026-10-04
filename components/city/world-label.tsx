"use client";
import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/** DOM labels follow world coordinates without creating a second scene or raycast layer. */
export function WorldLabel({
  position,
  children,
  zIndexRange = [3, 0],
  style,
}: {
  position: [number, number, number];
  children: ReactNode;
  zIndexRange?: [number, number];
  style?: CSSProperties;
  center?: boolean;
}) {
  const anchor = useRef<THREE.Group>(null);
  const element = useRef<HTMLDivElement | null>(null);
  const root = useRef<Root | null>(null);
  const point = useRef(new THREE.Vector3());
  const { gl, camera, size } = useThree();
  useEffect(() => {
    const node = document.createElement("div");
    node.style.cssText =
      "position:absolute;top:0;left:0;pointer-events:none;will-change:transform;";
    gl.domElement.parentElement!.appendChild(node);
    const content = document.createElement("div");
    content.style.cssText =
      "transform:translate(-50%,-50%);pointer-events:auto";
    node.appendChild(content);
    const reactRoot = createRoot(content);
    element.current = node;
    root.current = reactRoot;
    return () => {
      element.current = null;
      root.current = null;
      node.remove();
      // React may clean up the canvas during another render (including Strict Mode).
      queueMicrotask(() => reactRoot.unmount());
    };
  }, [gl]);
  useEffect(() => {
    root.current?.render(<div style={style}>{children}</div>);
    if (element.current) element.current.style.zIndex = String(zIndexRange[0]);
  }, [children, style, zIndexRange]);
  useFrame(() => {
    if (!anchor.current || !element.current) return;
    anchor.current.getWorldPosition(point.current);
    point.current.project(camera);
    const { x, y, z } = point.current;
    element.current.style.display =
      z < -1 || z > 1 || Math.abs(x) > 1.15 || Math.abs(y) > 1.15
        ? "none"
        : "block";
    element.current.style.transform = `translate3d(${((x + 1) * size.width) / 2}px,${((1 - y) * size.height) / 2}px,0)`;
  });
  return <group ref={anchor} position={position} />;
}
