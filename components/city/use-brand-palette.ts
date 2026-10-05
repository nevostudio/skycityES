"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { Ad } from "@/types";
import { brandPalette } from "@/lib/brand-theme";
import { logoInfo, requestLogoInfo, subscribeLogos } from "@/lib/logo-info";

/** Number of logos analysed so far: changes when any logo finishes loading. */
let analysed = 0;
subscribeLogos(() => analysed++);
const snapshot = () => analysed;

/** Re-renders the caller whenever a logo analysis completes. */
export function useLogosVersion() {
  return useSyncExternalStore(subscribeLogos, snapshot, () => 0);
}

/** The building palette of a brand, refined with its logo (colour and shape) once loaded. */
export function useBrandPalette(ad: Ad | null | undefined) {
  const version = useLogosVersion();
  useEffect(() => requestLogoInfo(ad?.logo || undefined), [ad?.logo]);
  const logo = logoInfo(ad?.logo || undefined) ?? null;
  return useMemo(
    () => ({
      palette: ad ? brandPalette(ad, logo) : null,
      logo,
    }),
    [ad, logo, version],
  );
}
