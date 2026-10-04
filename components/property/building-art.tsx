import type { Property } from "@/types";
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
      aria-label={`${property.type} ${property.number} architectural illustration`}
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
