"use client";
import { useEffect, useState } from "react";
import * as THREE from "three";

type Entry = { texture: THREE.CanvasTexture; refs: number };
/** Shared, reference-counted canvas textures: identical signs reuse one texture, released at 0. */
const cache = new Map<string, Entry>();
export const textureCacheSize = () => cache.size;

/**
 * Creates the texture once per `key` (never per frame). `paint` draws immediately and may
 * call `update()` again when images finish loading.
 */
export function useCanvasTexture(
  key: string | null,
  width: number,
  height: number,
  paint: (canvas: HTMLCanvasElement, update: () => void) => void,
) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    if (!key) {
      setTexture(null);
      return;
    }
    let entry = cache.get(key);
    if (!entry) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width);
      canvas.height = Math.max(8, Math.round(height));
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      entry = { texture: t, refs: 0 };
      cache.set(key, entry);
      paint(canvas, () => {
        t.needsUpdate = true;
      });
      t.needsUpdate = true;
    }
    entry.refs++;
    setTexture(entry.texture);
    return () => {
      const e = cache.get(key);
      if (e && --e.refs <= 0) {
        e.texture.dispose();
        cache.delete(key);
      }
    };
    // `paint` is fully described by `key`: the texture is rebuilt only when the content changes.
  }, [key]);
  return texture;
}
