"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useSceneMotion } from "./scene-motion";
import { useCanvasTexture } from "./sign-texture";
import * as THREE from "three";
import type { Ad, BuildingTier, PublicProperty } from "@/types";
import { presenceLevel } from "@/lib/presence";
import {
  brandKind,
  brandPalette,
  brandTheme,
  type BrandPalette,
} from "@/lib/brand-theme";
import { SIGN_YAW, signSize } from "@/lib/branding";
import {
  drawBrandPanel,
  drawRooftopSign,
  drawScreen,
  drawVerticalBanner,
  loadBitmap,
  signFontsReady,
  type Bitmap,
} from "@/lib/sign-canvas";
import {
  architectureOf,
  massing,
  type Massing,
  type Volume,
} from "@/lib/massing";

/** Draw now with fallbacks, then again once the sign fonts, the logo and the image are ready. */
function paintBrand(
  ad: Ad,
  draw: (logo: Bitmap | null, image: Bitmap | null) => void,
  update: () => void,
  withImage = false,
) {
  draw(null, null);
  void Promise.all([
    signFontsReady(),
    ad.logo ? loadBitmap(ad.logo) : Promise.resolve(null),
    withImage && ad.banner
      ? loadBitmap(ad.banner, 1024)
      : Promise.resolve(null),
  ]).then(([, logo, image]) => {
    draw(logo, image);
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
  [
    ad.brand,
    ad.tagline,
    ad.logo,
    ad.banner,
    ad.primary,
    ad.secondary,
    ad.description,
  ]
    .map((v) => v || "")
    .join("|");
/** Volume dimensions in world units. */
const dims = (v: Volume, p: PublicProperty) => ({
  w: v.w * p.width,
  d: v.d * p.depth,
  x: v.x * p.width,
  z: v.z * p.depth,
  y0: v.y0,
  y1: v.y1,
});
const groundVolume = (m: Massing) =>
  m.volumes
    .filter((v) => v.y0 === 0)
    .reduce((a, b) => (b.w * b.d > a.w * a.d ? b : a));

/**
 * Complementary rooftop sign with posts on the crown of the top volume. The facade carries
 * the brand; this sign is compact and only stands on some silhouettes.
 */
export function RooftopSign({
  p,
  tier,
  palette,
  maxWidth,
  compact = false,
}: {
  p: PublicProperty & { ad: Ad };
  tier: BuildingTier;
  palette: BrandPalette;
  maxWidth?: number;
  /** Secondary sign next to a strong facade: smaller and lower. */
  compact?: boolean;
}) {
  const m = massing(p);
  const top = dims(m.top, p);
  const full = signSize(tier, top.w, maxWidth);
  const k = compact ? 0.62 : 1;
  const size = {
    ...full,
    width: full.width * k,
    height: full.height * k,
    lift: full.lift * k,
    pixels: compact ? Math.min(full.pixels, 512) : full.pixels,
  };
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
  const roof = m.roofY;
  const bottom = roof + size.lift;
  const y = bottom + size.height / 2;
  const posts = "#2c3a35";
  return (
    <group
      name={`rooftop-sign-${p.id}`}
      position={[top.x, 0, top.z + top.d * 0.1]}
      rotation={[0, SIGN_YAW, 0]}
    >
      {[-0.36, 0.36].map((k) => (
        <mesh
          key={k}
          position={[k * size.width, (roof + bottom) / 2 + 0.05, -0.02]}
          castShadow
        >
          <boxGeometry args={[0.08, size.lift + 0.1, 0.08]} />
          <meshStandardMaterial color={posts} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, y, 0]} castShadow>
        <boxGeometry args={[size.width + 0.14, size.height + 0.14, 0.1]} />
        <meshStandardMaterial color={palette.primary} roughness={0.5} />
      </mesh>
      {texture && (
        <mesh position={[0, y, 0.052]}>
          <planeGeometry args={[size.width, size.height]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      )}
      {size.lit &&
        [-0.3, 0, 0.3].map((k) => (
          <mesh key={k} position={[k * size.width, bottom - 0.02, 0.22]}>
            <boxGeometry args={[0.16, 0.06, 0.12]} />
            <meshBasicMaterial color="#fff3cf" toneMapped={false} />
          </mesh>
        ))}
    </group>
  );
}

/**
 * Dominant brand panel on a facade: the advertising image, or the logo large on the brand
 * colour, framed in the contrasting neutral. Front panels face the street; side panels
 * cover the tall side of PREMIUM and LANDMARK towers.
 */
function BrandPanel({
  p,
  palette,
  v,
  side,
  share,
  ratio,
  cap,
  screen = false,
  image = false,
  low,
  roofless,
  offset = 0,
}: {
  p: PublicProperty & { ad: Ad };
  palette: BrandPalette;
  v: Volume;
  side: boolean;
  /** Share of the facade width it covers. */
  share: number;
  /** Height / width of the panel. */
  ratio: number;
  /** Maximum height. */
  cap: number;
  screen?: boolean;
  image?: boolean;
  /** Lowest point it may reach (keeps shopfront details clear). */
  low: number;
  /** Pitched roofs: the panel must stay below the eaves. */
  roofless: boolean;
  /** Sideways shift, as a share of the face width (leaves room for a vertical band). */
  offset?: number;
}) {
  const b = dims(v, p);
  const faceW = side ? b.d : b.w;
  const lo = Math.max(b.y0, low);
  const span = b.y1 - 0.3 - lo;
  const width = faceW * share;
  // Low buildings let the panel rise above the roof line like a shop fascia.
  const height = Math.min(width * ratio, cap, span + (roofless ? 0 : 0.85));
  const ok = height >= 0.6;
  const pxW = width >= height ? 768 : Math.round((768 * width) / height);
  const pxH = width >= height ? Math.round((768 * height) / width) : 768;
  const texture = useCanvasTexture(
    ok
      ? `panel:${screen}:${image}:${width.toFixed(2)}x${height.toFixed(2)}:${palette.primary}:${contentKey(p.ad)}`
      : null,
    pxW,
    pxH,
    (canvas, update) =>
      paintBrand(
        p.ad,
        (logo, img) =>
          screen && !img
            ? drawScreen(canvas, p.ad, logo)
            : drawBrandPanel(canvas, p.ad, palette, img, logo),
        update,
        image,
      ),
  );
  if (!ok) return null;
  const top = Math.max(b.y1 - 0.3, lo + height);
  const y = top - height / 2;
  return (
    <group
      name={`brand-panel-${side ? "side" : "front"}-${p.id}`}
      position={
        side
          ? [b.x + b.w / 2 + 0.07, y, b.z - offset * faceW]
          : [b.x + offset * faceW, y, b.z + b.d / 2 + 0.07]
      }
      rotation={[0, side ? Math.PI / 2 : 0, 0]}
    >
      <mesh position={[0, 0, -0.04]} castShadow>
        <boxGeometry args={[width + 0.14, height + 0.14, 0.08]} />
        <meshStandardMaterial
          color={screen ? "#20292b" : palette.deep}
          roughness={0.55}
        />
      </mesh>
      {texture && (
        <mesh position={[0, 0, 0.005]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/** Vertical banner (lona) down the tower front, in the brand colour with its emblem. */
function VerticalBanner({
  p,
  palette,
}: {
  p: PublicProperty & { ad: Ad };
  palette: BrandPalette;
}) {
  const t = dims(massing(p).top, p);
  const tower = t.y1 - Math.max(t.y0, 2.2);
  const height = Math.min(Math.max(tower * 0.8, 2.2), 8),
    width = Math.min(0.85, t.w * 0.26);
  const texture = useCanvasTexture(
    `banner:${height.toFixed(1)}:${width.toFixed(2)}:${contentKey(p.ad)}`,
    180,
    (180 * height) / width,
    (canvas, update) =>
      paintBrand(
        p.ad,
        (logo) => drawVerticalBanner(canvas, p.ad, logo),
        update,
      ),
  );
  return (
    <group
      name={`vertical-banner-${p.id}`}
      position={[
        t.x - t.w / 2 + width / 2 + 0.14,
        t.y1 - 0.4 - height / 2,
        t.z + t.d / 2 + 0.06,
      ]}
    >
      {texture && (
        <mesh>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      )}
      <mesh position={[0, height / 2 + 0.04, -0.02]}>
        <boxGeometry args={[width + 0.12, 0.08, 0.08]} />
        <meshStandardMaterial color={palette.secondary} />
      </mesh>
    </group>
  );
}

/**
 * Brand identity of a building, on top of the brand-coloured architecture (see
 * BuildingForm). The logo or image is built into the facade so it reads from the city
 * overview; rooftop signs only complement some silhouettes.
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
  const palette = useMemo(() => brandPalette(p.ad), [p.ad]);
  const motion = useSceneMotion(),
    time = useRef(0),
    neon = useRef<THREE.MeshStandardMaterial>(null);
  const tier = p.building?.tier ?? "STARTER";
  const level = presenceLevel(tier);
  const m = massing(p);
  const arch = architectureOf(p.districtId);
  const t = dims(m.top, p);
  const g = dims(groundVolume(m), p);
  const h = p.height;
  const cafe = kind === "cafe",
    garden = kind === "garden",
    club = kind === "nightlife";
  // The tallest volume that rises above the ground floor carries the panels.
  const panelVolume =
    m.volumes
      .filter((v) => v.y1 - Math.max(v.y0, 1.95) >= 1)
      .sort((a, b) => b.y1 - b.y0 - (a.y1 - a.y0))[0] ?? m.top;
  const banner = !!p.ad.banner;
  const wantsSide = banner && p.ad.support === "SIDE_BILLBOARD";
  const roofless = m.roof === "gable";
  // The facade carries the brand. Panel per tier (share of the face, height/width, cap):
  // STARTER a small logo plate, PLUS a visible front panel, PRO a clear front panel with an
  // optional side one, PREMIUM a large front plus side panel or vertical band, LANDMARK all.
  const FRONT: [number, number, number][] = [
    [0.64, 0.5, 1.2],
    [0.82, 0.52, 1.7],
    [0.88, 0.62, 2.4],
    [0.9, 0.86, 3.6],
    [0.92, 0.9, 4.4],
    [0.92, 0.9, 4.4],
  ];
  const [share, ratio, cap] = FRONT[Math.min(level, 5)];
  const side =
    level >= 4 ||
    (level === 3 && (m.variant % 2 === 1 || wantsSide)) ||
    (level === 2 && (m.variant % 2 === 1 || wantsSide));
  const band = level >= 4 || (level === 3 && !side);
  // The rooftop sign is a complement: only on rooftop/wrapped silhouettes, compact, and
  // always on landmarks as their lit crown.
  const rooftop =
    !roofless &&
    (level >= 4 || m.pattern === "rooftop" || m.pattern === "wrapped");
  const panel = {
    p,
    palette,
    v: panelVolume,
    low: roofless ? 1 : 1.95,
    roofless,
  };
  useFrame((_, delta) => {
    if (!motion || !neon.current) return;
    time.current += Math.min(delta, 0.05);
    neon.current.emissiveIntensity = 0.8 + Math.sin(time.current * 0.55) * 0.12;
  });
  return (
    <group name={"branding-" + p.id}>
      {rooftop && (
        <RooftopSign
          p={p}
          tier={tier}
          palette={palette}
          maxWidth={maxSignWidth}
          compact={level < 4}
        />
      )}
      <BrandPanel
        {...panel}
        side={false}
        share={band ? Math.min(share, 0.64) : share}
        offset={band ? 0.15 : 0}
        ratio={banner && !wantsSide ? Math.min(ratio, 0.56) : ratio}
        cap={cap}
        screen={arch === "leisure"}
        image={banner && !wantsSide}
      />
      {side && (
        <BrandPanel
          {...panel}
          side
          share={level >= 4 ? 0.82 : 0.74}
          ratio={level >= 3 ? 1.6 : 1}
          cap={level >= 4 ? 7 : level === 3 ? 5 : 2.6}
          image={wantsSide}
        />
      )}
      {band && <VerticalBanner p={p} palette={palette} />}
      {cafe && (
        <>
          <Piece
            position={[g.x, 0.85, g.z + g.d / 2 + 0.12]}
            size={[g.w * 0.86, 1.32, 0.13]}
            color="#e8b571"
            glow={0.45}
          />
          {[-1, 0, 1].map((x) => (
            <Piece
              key={x}
              position={[g.x + x * g.w * 0.28, 0.85, g.z + g.d / 2 + 0.22]}
              size={[0.08, 1.45, 0.08]}
              color="#694d36"
            />
          ))}
          <Piece
            position={[g.x, 1.62, g.z + g.d / 2 + 0.42]}
            size={[g.w * 1.12, 0.15, 0.8]}
            color="#c59a6b"
          />
          {[-1, 1].map((s) => (
            <group
              key={s}
              position={[g.x + s * g.w * 0.32, 0, g.z + g.d / 2 + 0.87]}
            >
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
        </>
      )}
      {garden && (
        <>
          <Piece
            position={[t.x, h + 0.38, t.z - t.d * 0.12]}
            size={[t.w * 0.85, 0.22, t.d * 0.56]}
            color="#7a9755"
          />
          {[-1, 1].map((x) => (
            <Planter
              key={x}
              position={[t.x + x * t.w * 0.32, h + 0.45, t.z - t.d * 0.28]}
            />
          ))}
          <Piece
            position={[g.x, 1.5, g.z + g.d / 2 + 0.43]}
            size={[g.w * 1.15, 0.2, 0.9]}
            color="#4b7546"
          />
          {[-2, -1, 0, 1, 2].map((i) => (
            <Piece
              key={i}
              position={[g.x + i * g.w * 0.2, 1.61, g.z + g.d / 2 + 0.45]}
              size={[g.w * 0.07, 0.025, 0.85]}
              color="#d4dfb6"
            />
          ))}
          <Planter
            position={[g.x - g.w * 0.36, 0.05, g.z + g.d / 2 + 0.8]}
            size={0.65}
          />
          <Planter
            position={[g.x + g.w * 0.36, 0.05, g.z + g.d / 2 + 0.8]}
            size={0.65}
          />
        </>
      )}
      {club && (
        <>
          <mesh position={[t.x + t.w / 2 + 0.06, h * 0.54, t.z - t.d * 0.38]}>
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
            position={[g.x, 1.8, g.z + g.d / 2 + 0.42]}
            size={[g.w * 1.15, 0.1, 0.85]}
            color="#ae66df"
            glow={0.7}
          />
          <Piece
            position={[g.x, 0.75, g.z + g.d / 2 + 0.12]}
            size={[g.w * 0.55, 1.5, 0.09]}
            color="#653869"
            glow={0.2}
          />
        </>
      )}
      {kind === "lab" && (
        <Piece
          position={[g.x, 1.65, g.z + g.d / 2 + 0.38]}
          size={[g.w * 0.88, 0.14, 0.7]}
          color={theme.accent}
        />
      )}
      {kind === "studio" && (
        <Piece
          position={[g.x, 1.8, g.z + g.d / 2 + 0.42]}
          size={[g.w * 1.1, 0.13, 0.8]}
          color="#cfb89c"
        />
      )}
      {kind === "digital" && (
        <Piece
          position={[g.x, 1.7, g.z + g.d / 2 + 0.32]}
          size={[g.w * 1.08, 0.12, 0.65]}
          color={theme.accent}
          glow={0.12}
        />
      )}
    </group>
  );
}
