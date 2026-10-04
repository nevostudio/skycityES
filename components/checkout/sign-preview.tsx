"use client";
import { useEffect, useRef } from "react";
import type { Ad, BuildingTier } from "@/types";
import { ROOFTOP_SIGN } from "@/lib/branding";
import { drawRooftopSign, loadBitmap } from "@/lib/sign-canvas";

/** Same drawing as the 3D rooftop sign, shown flat while the brand is being edited. */
export function SignPreview({ ad, tier }: { ad: Ad; tier: BuildingTier }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const spec = ROOFTOP_SIGN[tier];
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    let active = true;
    const sample = { ...ad, brand: ad.brand.trim() || "Tu marca" };
    drawRooftopSign(c, sample, null, spec.lit);
    if (ad.logo)
      void loadBitmap(ad.logo).then((logo) => {
        if (active && logo) drawRooftopSign(c, sample, logo, spec.lit);
      });
    return () => {
      active = false;
    };
  }, [ad, spec.lit]);
  const width = 640;
  return (
    <figure className="sign-preview">
      <canvas
        ref={canvas}
        width={width}
        height={Math.round((width * spec.height) / spec.width)}
        role="img"
        aria-label={`Vista previa del cartel de azotea de ${ad.brand || "tu marca"}`}
        style={{
          width: `${Math.round((spec.width / ROOFTOP_SIGN.LANDMARK.width) * 100)}%`,
        }}
      />
      <figcaption>
        Cartel de azotea · tamaño {tier}
        {spec.lit ? " · iluminado" : ""}
      </figcaption>
    </figure>
  );
}
