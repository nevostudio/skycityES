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
  drawScreen,
  drawSupportImage,
  drawVerticalBanner,
  loadBitmap,
  signFontsReady,
  type Bitmap,
} from "@/lib/sign-canvas";
import { architectureOf, massing } from "@/lib/massing";

/** Draw now with fallbacks, then again once the sign fonts and the logo are ready. */
function paintBrand(
  ad: Ad,
  draw: (logo: Bitmap | null) => void,
  update: () => void,
) {
  draw(null);
  void Promise.all([
    signFontsReady(),
    ad.logo ? loadBitmap(ad.logo) : Promise.resolve(null),
  ]).then(([, logo]) => {
    draw(logo);
    update();
  });
}

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
  const m = massing(p);
  const size = signSize(tier, p.width * m.top, maxWidth);
  const px = size.pixels;
  const texture = useCanvasTexture(
    `roof:${px}:${size.width.toFixed(2)}:${size.lit}:${contentKey(p.ad)}`,
    px,
    (px * size.height) / size.width,
    (canvas, update) =>
      paintBrand(
        p.ad,
        (logo) => drawRooftopSign(canvas, p.ad, logo, size.lit),
        update,
      ),
  );
  const { accent } = signColors(p.ad);
  const roof = p.height + (m.roof === "green" ? 0.2 : 0.16);
  const bottom = roof + size.lift;
  const y = bottom + size.height / 2;
  const z = 0;
  const frame = size.lit ? "#1f2623" : "#3c4541";
  return (
    <group
      name={`rooftop-sign-${p.id}`}
      position={[0, 0, p.depth * m.top * 0.1]}
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

/** Casco Antiguo: the main sign hangs on the facade, above the ground floor (PDF page 3). */
function FacadeSign({ p }: { p: PublicProperty & { ad: Ad } }) {
  const width = Math.min(p.width * 0.86, 3),
    height = width * 0.34;
  const texture = useCanvasTexture(
    `facade:${width.toFixed(2)}:${contentKey(p.ad)}`,
    768,
    (768 * height) / width,
    (canvas, update) =>
      paintBrand(p.ad, (logo) => drawRooftopSign(canvas, p.ad, logo), update),
  );
  return (
    <group
      name={`facade-sign-${p.id}`}
      position={[0, 2.45, p.depth / 2 + 0.09]}
    >
      <mesh castShadow>
        <boxGeometry args={[width + 0.1, height + 0.1, 0.08]} />
        <meshStandardMaterial color="#3c4541" roughness={0.6} />
      </mesh>
      {texture && (
        <mesh position={[0, 0, 0.045]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}
/** Secondary element for PREMIUM and LANDMARK: a brand-coloured vertical banner. */
function VerticalBanner({ p }: { p: PublicProperty & { ad: Ad } }) {
  const m = massing(p);
  const tower = p.height - m.podium;
  const height = Math.min(Math.max(tower * 0.78, 2.2), 8),
    width = Math.min(0.75, p.width * 0.24);
  const texture = useCanvasTexture(
    `banner:${height.toFixed(1)}:${contentKey(p.ad)}`,
    160,
    (160 * height) / width,
    (canvas, update) =>
      paintBrand(
        p.ad,
        (logo) => drawVerticalBanner(canvas, p.ad, logo),
        update,
      ),
  );
  const tw = p.width * m.top,
    td = p.depth * m.top;
  const y = tower > 1 ? p.height - 0.35 - height / 2 : p.height * 0.6;
  return (
    <group
      name={`vertical-banner-${p.id}`}
      position={[tw / 2 - width / 2 - 0.12, y, td / 2 + 0.05]}
    >
      {texture && (
        <mesh>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      )}
      <mesh position={[0, height / 2 + 0.03, -0.02]}>
        <boxGeometry args={[width + 0.1, 0.06, 0.06]} />
        <meshStandardMaterial color="#3c4541" />
      </mesh>
    </group>
  );
}
/** Secondary element for Distrito de Ocio: a lit facade screen. */
function FacadeScreen({ p }: { p: PublicProperty & { ad: Ad } }) {
  const width = p.width * 0.62,
    height = Math.min(1.2, Math.max(0.8, (p.height - 2.4) * 0.5));
  const texture = useCanvasTexture(
    `screen:${width.toFixed(2)}:${contentKey(p.ad)}`,
    512,
    (512 * height) / width,
    (canvas, update) =>
      paintBrand(p.ad, (logo) => drawScreen(canvas, p.ad, logo), update),
  );
  if (p.height < 3) return null;
  return (
    <group
      name={`screen-${p.id}`}
      position={[0, p.height - 0.45 - height / 2, p.depth / 2 + 0.06]}
    >
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[width + 0.12, height + 0.12, 0.05]} />
        <meshStandardMaterial color="#20292b" />
      </mesh>
      {texture && (
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}
/** Secondary element for PLUS and PRO: an awning over the shopfront (striped in Casco Antiguo). */
function Awning({
  p,
  color,
  striped,
}: {
  p: PublicProperty;
  color: string;
  striped: boolean;
}) {
  const width = p.width * 0.88;
  const stripes = striped ? 7 : 1;
  return (
    <group
      name={`awning-${p.id}`}
      position={[0, 1.92, p.depth / 2 + 0.38]}
      rotation={[0.38, 0, 0]}
    >
      {Array.from({ length: stripes }, (_, i) => (
        <mesh
          key={i}
          position={[-width / 2 + (width / stripes) * (i + 0.5), 0, 0]}
          castShadow
        >
          <boxGeometry args={[width / stripes, 0.07, 0.86]} />
          <meshStandardMaterial
            color={striped && i % 2 ? "#fbf8f1" : color}
            roughness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Branding of a building (PDF page 2): one main element (rooftop sign with posts, or a
 * facade sign on pitched roofs) and one optional secondary element chosen by tier and
 * district: advertising image, vertical banner, screen or awning. Never the name twice.
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
  const arch = architectureOf(p.districtId);
  const m = massing(p);
  // One secondary element: the owner's advertising image wins; curated demo brands keep
  // their own storefronts; otherwise tier and district choose.
  const support = p.ad.banner ? effectiveSupport(p.ad, tier) : null;
  const secondary = support
    ? "image"
    : kind !== "custom"
      ? "curated"
      : level >= 3
        ? "banner"
        : arch === "leisure" && level >= 1
          ? "screen"
          : arch === "tech"
            ? "stripe"
            : level >= 1
              ? "awning"
              : null;
  useFrame((_, delta) => {
    if (!motion || !neon.current) return;
    time.current += Math.min(delta, 0.05);
    neon.current.emissiveIntensity = 0.8 + Math.sin(time.current * 0.55) * 0.12;
  });
  return (
    <group name={"branding-" + p.id}>
      {m.roof === "gable" ? (
        <FacadeSign p={p} />
      ) : (
        <RooftopSign p={p} tier={tier} maxWidth={maxSignWidth} />
      )}
      {support && <ImageSupportView p={p} support={support} />}
      {secondary === "banner" && <VerticalBanner p={p} />}
      {secondary === "screen" && <FacadeScreen p={p} />}
      {secondary === "awning" && (
        <Awning p={p} color={theme.accent} striped={arch === "historic"} />
      )}
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
      {kind === "digital" && (
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
