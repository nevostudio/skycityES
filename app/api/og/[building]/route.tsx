import { ImageResponse } from "next/og";
import { readState } from "@/lib/store";
import { citySnapshot } from "@/lib/engine";
import { isDemo } from "@/lib/config";
export const runtime = "nodejs";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ building: string }> },
) {
  const { building } = await params;
  const data = citySnapshot(await readState(), isDemo());
  const p = data.properties.find((p) => p.id === building);
  if (!p) return new Response("Not found", { status: 404 });
  const color = p.ad?.primary || "#92aa81";
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#e9efdf",
        padding: 60,
        color: "#2c4432",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "60%",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 800 }}>
          skycity
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 16,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#80936d",
            }}
          >
            {data.districts.find((d) => d.id === p.districtId)?.name}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 700,
              marginTop: 20,
              lineHeight: 1.05,
            }}
          >
            {p.ad?.brand || p.name}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              marginTop: 24,
              color: "#839575",
            }}
          >
            {p.ad
              ? "I just claimed a building in SkyCity."
              : "A little corner of the internet, made yours."}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 16, letterSpacing: 3 }}>
          SKYCITY / BUILDING #{String(p.number).padStart(3, "0")}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          width: "40%",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="370" height="430" viewBox="0 0 240 280">
          <ellipse cx="120" cy="245" rx="100" ry="20" fill="#ced9be" />
          <path d="M45 80 125 40 198 77 120 117Z" fill="#faf5e5" />
          <path d="M45 80 120 117V252L45 215Z" fill={color} />
          <path d="M120 117 198 77V215L120 252Z" fill="#7c978c" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} fill="#486b5f">
              <path d={`M56 ${98 + i * 23} 76 ${108 + i * 23}v13l-20-10Z`} />
              <path d={`M89 ${114 + i * 23} 108 ${124 + i * 23}v13l-19-10Z`} />
              <path d={`M135 ${124 + i * 23} 155 ${114 + i * 23}v13l-20 10Z`} />
              <path d={`M167 ${108 + i * 23} 188 ${98 + i * 23}v13l-21 10Z`} />
            </g>
          ))}
          <path d="m90 63 34-17 33 16-34 17Z" fill="#c9d4bb" />
          <rect x="93" y="25" width="56" height="24" rx="3" fill="#faf7e9" />
          <path d="M104 32h5v12h-5zM115 28h5v16h-5zM126 30h5v14h-5zM137 34h5v10h-5z" fill="#55744e"/>
        </svg>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=60" },
    },
  );
}
