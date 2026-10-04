"use client";
import { useSyncExternalStore } from "react";

let media: MediaQueryList | undefined;
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  media ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!listeners.size) media.addEventListener("change", notify);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) media?.removeEventListener("change", notify);
  };
}
export function useSceneMotion() {
  return !useSyncExternalStore(
    subscribe,
    () =>
      media?.matches ??
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}
