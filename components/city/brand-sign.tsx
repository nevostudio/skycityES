"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useSceneMotion } from "./scene-motion";
import { useCanvasTexture } from "./sign-texture";
import * as THREE from "three";
import type { Ad, BuildingTier, ImageSupport, PublicProperty } from "@/types";
import { presenceLevel } from "@/lib/presence";
import { brandKind, brandTheme, signColors } from "@/lib/brand-theme";
import { SIGN_YAW, effectiveSupport, signSize } from "@/lib/branding";
import {
  drawRooftopSign,
  drawSupportImage,
  loadBitmap,
} from "@/lib/sign-canvas";

function Piece({
  position,
  size,
  color,
  glow = 0,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  glow?: number;
}) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={glow}
        roughness={0.72}
      />
    </mesh>
  );
}
function Planter({
  position,
  size = 0.55,
}: {
  position: [number, number, number];
  size?: number;
}) {
  return (
    <group position={position}>
      <Piece
        position={[0, 0.12, 0]}
        size={[size, 0.24, size]}
        color="#af9777"
      />
      <mesh position={[0, size * 0.6, 0]} castShadow>
        <icosahedronGeometry args={[size * 0.62, 1]} />
        <meshStandardMaterial color="#6f9147" />
      </mesh>
    </group>
  );
}
const contentKey = (ad: Ad) =>
  [ad.brand, ad.tagline, ad.logo, ad.primary, ad.secondary, ad.description]
    .map((v) => v || "")
    .join("|");

/**
 * The brand's main support: a physical sign standing on the roof (posts, frame and face).
 * Its size follows the building tier and is capped by the room left by its neighbours.
 */
export function RooftopSign({
  p,
  tier,
  maxWidth,
}: {
  p: PublicProperty & { ad: Ad };
  tier: BuildingTier;
  maxWidth?: number;
}) {
  const size = signSize(tier, p.width, maxWidth);
  const px = size.pixels;
  const texture = useCanvasTexture(
    `roof:${px}:${size.width.toFixed(2)}:${size.lit}:${contentKey(p.ad)}`,
    px,
    (px * size.height) / size.width,
    (canvas, update) => {
      drawRooftopSign(canvas, p.ad, null, size.lit);
      if (p.ad.logo)
        void loadBitmap(p.ad.logo).then((logo) => {
          if (!logo) return;
          drawRooftopSign(canvas, p.ad, logo, size.lit);
          update();
        });
    },
  );
  const { accent } = signColors(p.ad);
  const roof = p.height + 0.24;
  const bottom = roof + size.lift;
  const y = bottom + size.height / 2;
  const z = 0;
  const frame = size.lit ? "#1f2623" : "#3c4541";
  return (
    <group
      name={`rooftop-sign-${p.id}`}
      position={[0, 0, p.depth * 0.1]}
      rotation={[0, SIGN_YAW, 0]}
    >
      {[-0.36, 0.36].map((k) => (
        <mesh
          key={k}
          position={[k * size.width, (roof + bottom) / 2 + 0.05, z - 0.02]}
          castShadow
        >
          <boxGeometry args={[0.08, size.lift + 0.1, 0.08]} />
          <meshStandardMaterial color={frame} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, y, z]} castShadow>
        <boxGeometry args={[size.width + 0.1, size.height + 0.1, 0.1]} />
        <meshStandardMaterial color={frame} roughness={0.55} />
      </mesh>
      {texture && (
        <mesh position={[0, y, z + 0.052]}>
          <planeGeometry args={[size.width, size.height]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      )}
      {size.lit &&
        [1, -1].map((side) => (
          <mesh
            key={side}
            position={[0, y + side * (size.height / 2 + 0.06), z + 0.03]}
          >
            <boxGeometry args={[size.width + 0.12, 0.05, 0.14]} />
            <meshStandardMaterial
              color={accent}
              emissive={accent}
              emissiveIntensity={1.1}
              toneMapped={false}
            />
          </mesh>
        ))}
      {size.lit &&
        [-0.3, 0, 0.3].map((k) => (
          <mesh key={k} position={[k * size.width, bottom - 0.02, z + 0.22]}>
            <boxGeometry args={[0.16, 0.06, 0.12]} />
            <meshBasicMaterial color="#fff3cf" toneMapped={false} />
          </mesh>
        ))}
    </group>
  );
}

type Spot = {
  position: [number, number, number];
  size: [number, number];
  side: boolean;
  glow: boolean;
};
/** Advertising image placements, prepared for every support; the first three are prioritised. */
function placement(
  support: ImageSupport,
  w: number,
  h: number,
  d: number,
): Spot | null {
  if (support === "SIDE_BILLBOARD") {
    const sw = Math.min(d * 0.85, 2.6),
      sh = sw * 0.6;
    if (h < sh + 1.2) return null;
    const y = Math.max(h - sh / 2 - 0.35, sh / 2 + 0.6);
    return {
      position: [w / 2 + 0.17, y, 0],
      size: [sw, sh],
      side: true,
      glow: false,
    };
  }
  if (support === "PARTIAL_FACADE") {
    const pw = w * 0.78,
      ph = Math.min(pw * 0.62, h - 2.6);
    if (ph < 0.8) return null;
    return {
      position: [0, h - 0.35 - ph / 2, d / 2 + 0.07],
      size: [pw, ph],
      side: false,
      glow: false,
    };
  }
  if (support === "FULL_FACADE") {
    const ph = h - 2.5;
    if (ph < 1.5) return null;
    return {
      position: [0, 2.25 + ph / 2, d / 2 + 0.07],
      size: [w * 0.94, ph],
      side: false,
      glow: false,
    };
  }
  const sh = Math.min(h * 0.72, 9);
  if (sh < 3) return null;
  return {
    position: [w / 2 + 0.15, h - sh / 2 - 0.4, d * 0.18],
    size: [0.95, sh],
    side: true,
    glow: true,
  };
}
export function ImageSupportView({
  p,
  support,
}: {
  p: PublicProperty & { ad: Ad };
  support: ImageSupport;
}) {
  const spot = placement(support, p.width, p.height, p.depth);
  const [sw, sh] = spot?.size ?? [1, 1];
  const px = Math.round(Math.min(1024, 380 * Math.max(sw, sh)));
  const texture = useCanvasTexture(
    spot
      ? `support:${support}:${sw.toFixed(2)}x${sh.toFixed(2)}:${p.ad.banner}:${contentKey(p.ad)}`
      : null,
    sw >= sh ? px : (px * sw) / sh,
    sw >= sh ? (px * sh) / sw : px,
    (canvas, update) => {
      drawSupportImage(canvas, p.ad, null, null);
      void Promise.all([
        p.ad.banner ? loadBitmap(p.ad.banner, 1024) : null,
        p.ad.logo ? loadBitmap(p.ad.logo) : null,
      ]).then(([banner, logo]) => {
        if (!banner && !logo) return;
        drawSupportImage(canvas, p.ad, banner, logo);
        update();
      });
    },
  );
  if (!spot) return null;
  const { accent } = signColors(p.ad);
  return (
    <group
      name={`support-${support}-${p.id}`}
      position={spot.position}
      rotation={[0, spot.side ? Math.PI / 2 : 0, 0]}
    >
      <mesh position={[0, 0, -0.04]} castShadow>
        <boxGeometry args={[sw + 0.12, sh + 0.12, 0.06]} />
        <meshStandardMaterial
          color={spot.glow ? accent : "#3c4541"}
          emissive={spot.glow ? accent : "#000000"}
          emissiveIntensity={spot.glow ? 0.6 : 0}
          roughness={0.6}
        />
      </mesh>
      {texture && (
        <mesh>
          <planeGeometry args={[sw, sh]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Branding of a building: one rooftop sign with the name, one image support, and the
 * accent in the architecture. The name is never repeated across the facades.
 */
export function BrandSign({
  p,
  maxSignWidth,
}: {
  p: PublicProperty & { ad: Ad };
  maxSignWidth?: number;
}) {
  const theme = brandTheme(p.ad),
    kind = brandKind(p.ad);
  const motion = useSceneMotion(),
    time = useRef(0),
    neon = useRef<THREE.MeshStandardMaterial>(null);
  const tier = p.building?.tier ?? "STARTER";
  const h = p.height,
    w = p.width,
    d = p.depth;
  const cafe = kind === "cafe",
    garden = kind === "garden",
    club = kind === "nightlife";
  const level = presenceLevel(tier);
  // Without an advertising image only the side billboard shows the logo (never the name).
  const support = p.ad.banner
    ? effectiveSupport(p.ad, tier)
    : level >= 1
      ? effectiveSupport({ support: "SIDE_BILLBOARD" }, tier)
      : null;
  useFrame((_, delta) => {
    if (!motion || !neon.current) return;
    time.current += Math.min(delta, 0.05);
    neon.current.emissiveIntensity = 0.8 + Math.sin(time.current * 0.55) * 0.12;
  });
  return (
    <group name={"branding-" + p.id}>
      <RooftopSign p={p} tier={tier} maxWidth={maxSignWidth} />
      {support && <ImageSupportView p={p} support={support} />}
      <Piece
        position={[0, h + 0.25, 0]}
        size={[w + 0.18, 0.14, d + 0.18]}
        color={theme.accent}
        glow={level >= 3 ? 0.65 : club ? 0.3 : 0.05}
      />
      {cafe && (
        <>
          <Piece
            position={[0, 0.85, d / 2 + 0.12]}
            size={[w * 0.86, 1.32, 0.13]}
            color="#e8b571"
            glow={0.45}
          />
          {[-1, 0, 1].map((x) => (
            <Piece
              key={x}
              position={[x * w * 0.28, 0.85, d / 2 + 0.22]}
              size={[0.08, 1.45, 0.08]}
              color="#694d36"
            />
          ))}
          <Piece
            position={[0, 1.62, d / 2 + 0.42]}
            size={[w * 1.12, 0.15, 0.8]}
            color="#c59a6b"
          />
          {[-1, 1].map((side) => (
            <group key={side} position={[side * w * 0.32, 0, d / 2 + 0.87]}>
              <mesh position={[0, 0.48, 0]} castShadow>
                <cylinderGeometry args={[0.26, 0.26, 0.06, 12]} />
                <meshStandardMaterial color="#b78b59" />
              </mesh>
              <Piece
                position={[0, 0.24, 0]}
                size={[0.06, 0.48, 0.06]}
                color="#624b35"
              />
              <Piece
                position={[0.38, 0.23, 0]}
                size={[0.23, 0.4, 0.25]}
                color="#8e7151"
              />
            </group>
          ))}
          <Piece
            position={[0, 1.78, d / 2 + 0.32]}
            size={[w * 0.9, 0.055, 0.08]}
            color="#ffcf89"
            glow={0.6}
          />
        </>
      )}
      {garden && (
        <>
          <Piece
            position={[0, h + 0.38, -d * 0.12]}
            size={[w * 0.85, 0.22, d * 0.56]}
            color="#7a9755"
          />
          {[-1, 1].map((x) => (
            <Planter key={x} position={[x * w * 0.32, h + 0.45, -d * 0.28]} />
          ))}
          <Piece
            position={[0, 1.5, d / 2 + 0.43]}
            size={[w * 1.15, 0.2, 0.9]}
            color="#4b7546"
          />
          {[-2, -1, 0, 1, 2].map((i) => (
            <Piece
              key={i}
              position={[i * w * 0.2, 1.61, d / 2 + 0.45]}
              size={[w * 0.07, 0.025, 0.85]}
              color="#d4dfb6"
            />
          ))}
          <Planter position={[-w * 0.36, 0.05, d / 2 + 0.8]} size={0.65} />
          <Planter position={[w * 0.36, 0.05, d / 2 + 0.8]} size={0.65} />
          <Piece
            position={[0, 0.4, d / 2 + 0.64]}
            size={[w * 0.42, 0.45, 0.45]}
            color="#b99565"
          />
          <Piece
            position={[0, 0.65, d / 2 + 0.64]}
            size={[w * 0.36, 0.12, 0.37]}
            color="#9eb64f"
          />
        </>
      )}
      {club && (
        <>
          <mesh position={[w / 2 + 0.28, h * 0.54, -d * 0.38]}>
            <boxGeometry args={[0.09, h * 0.84, 0.09]} />
            <meshStandardMaterial
              ref={neon}
              color="#ad62ed"
              emissive="#b465ff"
              emissiveIntensity={0.8}
              toneMapped={false}
            />
          </mesh>
          <Piece
            position={[0, 1.8, d / 2 + 0.42]}
            size={[w * 1.15, 0.1, 0.85]}
            color="#ae66df"
            glow={0.7}
          />
          <Piece
            position={[0, 0.75, d / 2 + 0.12]}
            size={[w * 0.55, 1.5, 0.09]}
            color="#653869"
            glow={0.2}
          />
          {[-1, 1].map((side) => (
            <Piece
              key={side}
              position={[side * w * 0.3, 1, d / 2 + 0.25]}
              size={[0.055, 1.8, 0.06]}
              color="#f08fe0"
              glow={0.7}
            />
          ))}
        </>
      )}
      {kind === "lab" && (
        <>
          <Piece
            position={[-w * 0.45, h * 0.5, d / 2 + 0.13]}
            size={[0.2, h, 0.2]}
            color={theme.accent}
          />
          <Piece
            position={[0, 1.65, d / 2 + 0.38]}
            size={[w * 0.88, 0.14, 0.7]}
            color={theme.accent}
          />
        </>
      )}
      {kind === "studio" && (
        <Piece
          position={[0, 1.8, d / 2 + 0.42]}
          size={[w * 1.1, 0.13, 0.8]}
          color="#cfb89c"
        />
      )}
      {(kind === "digital" || kind === "custom") && (
        <Piece
          position={[0, 1.7, d / 2 + 0.32]}
          size={[w * 1.08, 0.12, 0.65]}
          color={theme.accent}
          glow={0.12}
        />
      )}
    </group>
  );
}
