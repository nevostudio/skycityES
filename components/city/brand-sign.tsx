"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useSceneMotion } from "./scene-motion";
import * as THREE from "three";
import type { Ad, PublicProperty } from "@/types";
import { presenceLevel } from "@/lib/presence";

export function brandKind(ad: Ad) {
  const kinds: Record<string, string> = {
    "Pixel Coffee": "cafe",
    "Moonlight Club": "nightlife",
    "Green Market": "garden",
    "Nova Labs": "lab",
    "Orbit Studio": "studio",
    Hyperbyte: "digital",
  };
  return ad.description.includes("fictional demo")
    ? kinds[ad.brand] || "custom"
    : "custom";
}
export function brandTheme(ad: Ad) {
  const demo = ad.description.includes("fictional demo");
  const palette: Record<
    string,
    { accent: string; background: string; ink: string }
  > = {
    "Nova Labs": { accent: "#e87940", background: "#f5f1e7", ink: "#20342e" },
    "Pixel Coffee": {
      accent: "#c59059",
      background: "#614836",
      ink: "#fff1d9",
    },
    "Moonlight Club": {
      accent: "#aa63e6",
      background: "#2b263d",
      ink: "#ecd6ff",
    },
    "Green Market": {
      accent: "#78994f",
      background: "#d1ddba",
      ink: "#345337",
    },
    "Orbit Studio": {
      accent: "#d1a582",
      background: "#38393b",
      ink: "#faf3e5",
    },
    Hyperbyte: { accent: "#6daabd", background: "#253e49", ink: "#e9f6f7" },
  };
  const originalColors: Record<string, string> = {
    "Nova Labs": "#648688",
    "Pixel Coffee": "#895f48",
    "Orbit Studio": "#81719f",
    "Green Market": "#73966f",
    "Moonlight Club": "#b08499",
    Hyperbyte: "#6481a3",
  };
  return demo &&
    palette[ad.brand] &&
    ad.primary === originalColors[ad.brand] &&
    ad.secondary === "#fcf5e9"
    ? palette[ad.brand]
    : {
        accent: ad.primary,
        background: new THREE.Color(ad.primary).multiplyScalar(0.22).getStyle(),
        ink: ad.secondary,
      };
}
function mark(
  c: CanvasRenderingContext2D,
  brand: string,
  color: string,
  x: number,
  y: number,
  size: number,
) {
  c.save();
  c.translate(x, y);
  c.scale(size / 100, size / 100);
  c.fillStyle = color;
  c.strokeStyle = color;
  c.lineWidth = 5;
  if (brand === "Nova Labs") {
    c.beginPath();
    c.moveTo(0, -43);
    c.lineTo(39, -20);
    c.lineTo(0, 3);
    c.lineTo(-39, -20);
    c.closePath();
    c.fill();
    c.globalAlpha = 0.85;
    c.beginPath();
    c.moveTo(-39, -15);
    c.lineTo(-3, 8);
    c.lineTo(-3, 48);
    c.lineTo(-39, 25);
    c.closePath();
    c.fill();
    c.globalAlpha = 0.6;
    c.beginPath();
    c.moveTo(3, 8);
    c.lineTo(39, -15);
    c.lineTo(39, 25);
    c.lineTo(3, 48);
    c.closePath();
    c.fill();
  } else if (brand === "Pixel Coffee") {
    c.beginPath();
    c.moveTo(-31, -14);
    c.lineTo(-27, 15);
    c.quadraticCurveTo(0, 42, 26, 15);
    c.lineTo(31, -14);
    c.closePath();
    c.stroke();
    c.beginPath();
    c.ellipse(36, -1, 13, 12, 0, -1.7, 1.7);
    c.stroke();
    c.beginPath();
    c.moveTo(-38, 35);
    c.lineTo(36, 35);
    c.stroke();
    for (const dx of [-13, 7]) {
      c.beginPath();
      c.moveTo(dx, -27);
      c.bezierCurveTo(dx - 17, -40, dx + 15, -40, dx, -56);
      c.stroke();
    }
  } else if (brand === "Orbit Studio") {
    c.beginPath();
    c.ellipse(0, 0, 28, 43, 0.45, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.ellipse(0, 0, 50, 20, -0.4, 0, Math.PI * 2);
    c.stroke();
  } else if (brand === "Green Market") {
    c.beginPath();
    c.ellipse(-17, -5, 17, 35, -0.5, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(20, 6, 17, 31, 0.55, 0, Math.PI * 2);
    c.fill();
  } else if (brand === "Moonlight Club") {
    c.beginPath();
    c.arc(0, 0, 39, 0.45, 5.35);
    c.stroke();
    c.beginPath();
    c.arc(14, -4, 29, 1.25, 4.45);
    c.stroke();
  } else {
    c.font = "bold 92px sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(brand.slice(0, 1).toUpperCase(), 0, 0);
  }
  c.restore();
}

function useSign(ad: Ad, symbol = false) {
  const theme = brandTheme(ad),
    kind = brandKind(ad);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = symbol ? 1024 : 512;
    const c = canvas.getContext("2d")!;
    c.fillStyle = theme.background;
    c.fillRect(0, 0, 1024, canvas.height);
    if (symbol) {
      mark(c, ad.brand, theme.accent, 512, 480, 520);
      if (kind === "garden") {
        c.strokeStyle = theme.accent;
        c.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
          c.beginPath();
          c.arc(512, 500, 340 + i * 22, 0, Math.PI * 2);
          c.stroke();
        }
      }
      if (kind === "lab" || kind === "digital") {
        c.strokeStyle = theme.accent;
        c.lineWidth = 4;
        for (let i = 0; i < 5; i++) {
          c.beginPath();
          c.moveTo(80, 850 + i * 22);
          c.lineTo(410, 770 + i * 22);
          c.lineTo(944, 900 + i * 22);
          c.stroke();
        }
      }
    } else {
      mark(c, ad.brand, theme.accent, 150, 250, 170);
      c.fillStyle = theme.ink;
      c.textAlign = "left";
      c.font =
        kind === "cafe"
          ? "bold 170px Georgia"
          : kind === "nightlife"
            ? "italic bold 170px Georgia"
            : kind === "garden"
              ? "bold 162px Georgia"
              : "bold 168px sans-serif";
      if (kind === "nightlife") {
        c.shadowColor = theme.accent;
        c.shadowBlur = 16;
      }
      const words = ad.brand.trim().split(/\s+/);
      if (words.length > 1) {
        c.fillText(words.slice(0, -1).join(" "), 280, 224, 700);
        c.fillText(words.at(-1)!, 280, 410, 700);
      } else c.fillText(ad.brand, 280, 312, 700);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [
    ad.brand,
    ad.logo,
    ad.banner,
    theme.background,
    theme.ink,
    theme.accent,
    kind,
    symbol,
  ]);
  useEffect(() => {
    let active = true;
    const url = symbol ? ad.banner || ad.logo : ad.logo;
    if (url) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (!active) return;
        const c = (texture.image as HTMLCanvasElement).getContext("2d")!;
        const x = symbol ? 212 : 65,
          y = symbol ? 212 : 165,
          side = symbol ? 600 : 170;
        c.fillStyle = theme.background;
        c.fillRect(x - 15, y - 15, side + 30, side + 30);
        const ratio = Math.min(side / img.width, side / img.height),
          width = img.width * ratio,
          height = img.height * ratio;
        c.drawImage(
          img,
          x + (side - width) / 2,
          y + (side - height) / 2,
          width,
          height,
        );
        texture.needsUpdate = true;
      };
      img.src = url;
    }
    return () => {
      active = false;
      texture.dispose();
    };
  }, [texture, ad.logo, ad.banner, theme.background, symbol]);
  return texture;
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
export function BrandSign({ p }: { p: PublicProperty & { ad: Ad } }) {
  const name = useSign(p.ad),
    symbol = useSign(p.ad, true),
    theme = brandTheme(p.ad),
    kind = brandKind(p.ad);
  const motion = useSceneMotion(),
    time = useRef(0),
    neon = useRef<THREE.MeshStandardMaterial>(null);
  const h = p.height,
    w = p.width,
    d = p.depth;
  const cafe = kind === "cafe",
    garden = kind === "garden",
    club = kind === "nightlife";
  const level =
    p.inventory === "skyscraper" ? 5 : presenceLevel(p.presenceTier);
  const rooftop = level >= 3;
  const signWidth = w * (level === 0 ? 0.82 : 1.03);
  const signY = rooftop
    ? h + (p.type === "house" ? 1.9 : 1.05)
    : cafe || garden
      ? Math.max(h - 0.55, 2.35)
      : Math.max(h * 0.74, h - 1.05);
  const signH = rooftop ? 1.75 : level === 0 ? 0.9 : Math.min(1.6, h * 0.48);
  const sideSize = Math.min(d * 0.86, h * 0.7);
  useFrame((_, delta) => {
    if (!motion || !neon.current) return;
    time.current += Math.min(delta, 0.05);
    neon.current.emissiveIntensity = 0.8 + Math.sin(time.current * 0.55) * 0.12;
  });
  return (
    <group name={"branding-" + p.id}>
      {/* One primary name and one secondary symbol: ownership without wallpapering the facade. */}
      <mesh position={[0, signY, d / 2 + 0.19]} castShadow>
        <boxGeometry args={[signWidth + 0.12, signH + 0.12, 0.2]} />
        <meshStandardMaterial color={cafe ? "#aa855e" : theme.background} />
      </mesh>
      <mesh position={[0, signY, d / 2 + 0.3]}>
        <planeGeometry args={[signWidth, signH]} />
        <meshBasicMaterial map={name} toneMapped={false} />
      </mesh>
      {level >= 2 && (
        <mesh
          position={[w / 2 + 0.24, h * 0.53, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <planeGeometry args={[sideSize, sideSize * (level >= 4 ? 1.7 : 1)]} />
          <meshBasicMaterial map={symbol} toneMapped={false} />
        </mesh>
      )}
      {rooftop &&
        [-1, 1].map((side) => (
          <Piece
            key={side}
            position={[side * w * 0.32, h + 0.42, d / 2 + 0.18]}
            size={[0.1, 0.85, 0.14]}
            color={theme.accent}
          />
        ))}
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
            position={[0, signY + signH * 0.5 + 0.12, d / 2 + 0.32]}
            size={[w * 0.9, 0.055, 0.08]}
            color="#ffcf89"
            glow={0.6}
          />
        </>
      )}
      {garden && (
        <>
          <Piece
            position={[0, h + 0.38, 0]}
            size={[w * 0.85, 0.22, d * 0.76]}
            color="#7a9755"
          />
          {[-1, 1].flatMap((x) =>
            [-1, 1].map((z) => (
              <Planter
                key={x + ":" + z}
                position={[x * w * 0.32, h + 0.45, z * d * 0.28]}
              />
            )),
          )}
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
            position={[w / 2 + 0.28, h * 0.54, d * 0.38]}
            size={[0.09, h * 0.84, 0.09]}
            color="#c267e9"
            glow={0.7}
          />
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
          {[-1, 1].map((side) => (
            <Piece
              key={side}
              position={[side * w * 0.22, h + 0.42, 0]}
              size={[w * 0.32, 0.12, d * 0.5]}
              color="#526a70"
            />
          ))}
        </>
      )}
      {kind === "studio" && (
        <>
          <Piece
            position={[0, 1.8, d / 2 + 0.42]}
            size={[w * 1.1, 0.13, 0.8]}
            color="#cfb89c"
          />
          <mesh
            position={[w / 2 + 0.32, h * 0.8, 0]}
            rotation={[0, Math.PI / 2, 0.3]}
          >
            <torusGeometry args={[0.48, 0.025, 6, 32]} />
            <meshStandardMaterial
              color="#e5d7ba"
              emissive="#e5d7ba"
              emissiveIntensity={0.2}
            />
          </mesh>
        </>
      )}
      {(kind === "digital" || kind === "custom") && (
        <>
          <Piece
            position={[0, 1.7, d / 2 + 0.32]}
            size={[w * 1.08, 0.12, 0.65]}
            color={theme.accent}
            glow={0.12}
          />
          <Piece
            position={[w / 2 + 0.12, h * 0.7, 0]}
            size={[0.11, 0.07, d * 0.88]}
            color={theme.accent}
            glow={0.25}
          />
        </>
      )}
    </group>
  );
}
