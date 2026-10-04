import type { Property, PublicProperty } from "@/types";
export function BuildingArt({
  property,
  brand,
  className = "",
}: {
  property: Pick<Property, "type" | "color" | "height" | "number">;
  brand?: string;
  className?: string;
}) {
  const tall = property.height > 9;
  const h = Math.min(110, 42 + property.height * 5);
  const y = 132 - h;
  const color = property.color;
  return (
    <svg
      className={`building-art ${className}`}
      viewBox="0 0 240 180"
      role="img"
      aria-label={`Ilustración del edificio #${property.number}`}
    >
      <ellipse cx="123" cy="150" rx="73" ry="15" fill="#24463b" opacity=".09" />
      <path d="M29 139 119 94 212 139 122 177Z" fill="#b9c6ae" />
      <path d="m29 139 93 37v-7l-93-37Z" fill="#a2b298" />
      <path
        d={`M75 ${y + 20} 125 ${y} 169 ${y + 20} 119 ${y + 42}Z`}
        fill="#faf3e5"
      />
      <path d={`M75 ${y + 20} 119 ${y + 42}V153L75 131Z`} fill={color} />
      <path d={`M119 ${y + 42} 169 ${y + 20}V131L119 153Z`} fill="#91a7a1" />
      {Array.from(
        { length: Math.max(2, Math.floor((h - 25) / 13)) },
        (_, i) => (
          <g key={i} fill="#486861" opacity=".73">
            <path d={`m83 ${y + 32 + i * 13} 9 4v7l-9-4Z`} />
            <path d={`m101 ${y + 40 + i * 13} 9 4v7l-9-4Z`} />
            <path d={`m130 ${y + 46 + i * 13} 10-4v7l-10 4Z`} />
            <path d={`m149 ${y + 38 + i * 13} 10-4v7l-10 4Z`} />
          </g>
        ),
      )}
      <path d={`m103 ${y + 11} 24-10 16 7-24 10Z`} fill="#d6d8cc" />
      {!tall && (
        <>
          <path d="m72 102 47 22 53-24-2-9-51 21-44-20Z" fill="#dc8969" />
          <path d="m80 108 33 15v27l-33-16Z" fill="#59756d" />
          <path d="m126 125 36-17v23l-36 17Z" fill="#5e7e73" />
        </>
      )}
      <path d="M48 138v-18m143 20v-20" stroke="#847664" strokeWidth="3" />
      <circle cx="48" cy="116" r="11" fill="#7d9c6a" />
      <circle cx="191" cy="115" r="14" fill="#8eaa79" />
      {brand && (
        <g>
          <rect x="83" y={y + 4} width="80" height="18" rx="3" fill="#f9f4e9" />
          <text
            x="123"
            y={y + 16}
            textAnchor="middle"
            fontSize="8"
            fontWeight="700"
            fill="#344c40"
          >
            {brand.slice(0, 20)}
          </text>
        </g>
      )}
    </svg>
  );
}
/** An empty, buildable plot: curb, soil, survey stakes and a "+". */
export function PlotArt({
  premium = false,
  reserved = false,
  className = "",
}: {
  premium?: boolean;
  reserved?: boolean;
  className?: string;
}) {
  const stake = reserved ? "#e2bb4f" : "#e28a4f";
  return (
    <svg
      className={`building-art plot-art ${className}`}
      viewBox="0 0 240 180"
      role="img"
      aria-label={premium ? "Parcela premium en obras" : "Solar vacío"}
    >
      <ellipse cx="121" cy="146" rx="86" ry="18" fill="#24463b" opacity=".08" />
      <path d="M22 118 120 70 220 118 122 166Z" fill="#b9c6ae" />
      <path d="M44 117 120 80 198 117 122 154Z" fill="#e6e1d2" />
      <path d="m44 117 78 37v6l-78-37Z" fill="#cfc9b8" />
      <path d="m122 154 76-37v6l-76 37Z" fill="#d9d3c2" />
      <path d="M58 116 120 87 184 116 122 146Z" fill="#c9b48c" />
      {[
        [58, 116],
        [120, 87],
        [184, 116],
        [122, 146],
      ].map(([x, y]) => (
        <path
          key={`${x}${y}`}
          d={`M${x} ${y}v-17`}
          stroke={stake}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      ))}
      {premium ? (
        <>
          <path d="M98 104h6v-62h-6Z" fill="#e2b54b" />
          <path d="M70 44h92v5H70Z" fill="#e2b54b" />
          <path d="M148 49v26" stroke="#5f625c" strokeWidth="1.5" />
          <path d="M144 75h8v6h-8Z" fill="#d9813f" />
          <path d="M108 112h28v-20h-28Z" fill="#d6d2c6" />
        </>
      ) : reserved ? (
        <path
          d="m86 117 70-2m-36-16 2 34"
          stroke="#a6a499"
          strokeWidth="7"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="m104 116 34 0m-17-12 0 24"
          stroke="#6f9a6a"
          strokeWidth="6"
          strokeLinecap="round"
        />
      )}
      <circle cx="40" cy="104" r="11" fill="#7d9c6a" />
      <path d="M40 117v-6" stroke="#847664" strokeWidth="3" />
      <circle cx="204" cy="102" r="13" fill="#8eaa79" />
      <path d="M204 117v-6" stroke="#847664" strokeWidth="3" />
    </svg>
  );
}
/** Plot illustration while empty, building illustration once something stands on it. */
export function PropertyArt({
  property: p,
  brand,
  className = "",
}: {
  property: PublicProperty;
  brand?: string;
  className?: string;
}) {
  return p.building ? (
    <BuildingArt property={p} brand={brand} className={className} />
  ) : (
    <PlotArt
      premium={p.inventory === "skyscraper"}
      reserved={p.status === "reserved" && p.inventory !== "skyscraper"}
      className={className}
    />
  );
}
