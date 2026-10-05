/**
 * Fills a running DEMO city with fictional brands that exercise the building identity system:
 * every tier, white/very dark/default colours, wide and square logos and promotional images.
 *
 *   npm run demo:brands -- http://localhost:3000
 *
 * Uses the demo checkout (no payments) and refuses to run against a live city.
 */
import sharp from "sharp";
import { emptyAd } from "../lib/seed";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

const logo = {
  wide: (a: string, b: string, text: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200"><rect width="600" height="200" rx="24" fill="${a}"/><ellipse cx="300" cy="100" rx="270" ry="70" fill="${b}"/><text x="300" y="128" font-family="Arial" font-weight="900" font-size="84" text-anchor="middle" fill="${a}">${text}</text></svg>`,
  wordmark: (a: string, b: string, text: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="160"><circle cx="80" cy="80" r="62" fill="${a}"/><text x="170" y="112" font-family="Arial" font-weight="800" font-size="92" fill="${b}">${text}</text></svg>`,
  square: (a: string, b: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect x="20" y="20" width="260" height="260" rx="60" fill="${a}"/><path d="M90 200 L150 90 L210 200 Z" fill="${b}"/></svg>`,
  light: () =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><circle cx="150" cy="150" r="120" fill="none" stroke="#ffffff" stroke-width="28"/><rect x="120" y="70" width="60" height="160" fill="#ffffff"/></svg>`,
};
const banner = (a: string, b: string, text: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><circle cx="930" cy="330" r="220" fill="#ffffff" opacity=".25"/><text x="80" y="380" font-family="Arial" font-weight="900" font-size="150" fill="#ffffff">${text}</text></svg>`;

type Demo = {
  brand: string;
  tier: string;
  primary: string;
  logo?: string;
  banner?: string;
  support?: string;
};
const brands: Demo[] = [
  {
    brand: "Fjord Home",
    tier: "PREMIUM",
    primary: "#ffffff",
    logo: logo.wide("#1d4f9c", "#f5c400", "FJORD"),
  },
  {
    brand: "Carbon Studio",
    tier: "PRO",
    primary: "#111111",
    logo: logo.light(),
  },
  {
    brand: "Mint Bank",
    tier: "LANDMARK",
    primary: "#2bb673",
    logo: logo.square("#0f5132", "#ffffff"),
    banner: banner("#2bb673", "#0f5132", "MINT"),
  },
  { brand: "Sol Café", tier: "STARTER", primary: "#f2b705" },
  {
    brand: "Ocean Tech",
    tier: "PLUS",
    primary: "#1e6fd9",
    logo: logo.wordmark("#1e6fd9", "#0b2545", "OCEAN"),
  },
  {
    brand: "Berry Club",
    tier: "PRO",
    primary: "#c2185b",
    banner: banner("#c2185b", "#6a1b9a", "BERRY"),
    support: "SIDE_BILLBOARD",
  },
  {
    brand: "Violeta Shop",
    tier: "STARTER",
    primary: emptyAd.primary,
    logo: logo.square("#7b3fbf", "#f4e9ff"),
  },
  { brand: "Lime Bikes", tier: "PLUS", primary: "#7cb518" },
  {
    brand: "Indigo Labs",
    tier: "PREMIUM",
    primary: "#3f3d9e",
    logo: logo.wordmark("#3f3d9e", "#1b1a4a", "INDIGO"),
  },
  { brand: "Coral Air", tier: "LANDMARK", primary: "#ff6f61" },
];

async function upload(svg: string, kind: "logo" | "banner") {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const form = new FormData();
  form.append("kind", kind);
  form.append(
    "file",
    new Blob([new Uint8Array(png)], { type: "image/png" }),
    `${kind}.png`,
  );
  const r = await fetch(`${base}/api/upload`, { method: "POST", body: form });
  if (!r.ok) throw new Error(`upload ${r.status}: ${await r.text()}`);
  return ((await r.json()) as { url: string }).url;
}
async function post(path: string, body: unknown) {
  const r = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

type Plot = {
  id: string;
  x: number;
  z: number;
  status: string;
  inventory: string;
};
async function main() {
  const city = (await (await fetch(`${base}/api/city`)).json()) as {
    demo: boolean;
    properties: Plot[];
  };
  if (!city.demo)
    throw new Error("Solo para ciudades demo: no hay pagos reales.");
  // Closest free plots to the home showcase, so the examples appear in the first view.
  const free = city.properties
    .filter((p) => p.status === "available" && p.inventory === "normal")
    .sort(
      (a, b) => Math.hypot(a.x + 6, a.z - 10) - Math.hypot(b.x + 6, b.z - 10),
    );
  for (const [i, b] of brands.entries()) {
    const plot = free[i];
    if (!plot) break;
    const ad = {
      ...emptyAd,
      brand: b.brand,
      tagline: "Marca de ejemplo",
      website: "https://example.com",
      primary: b.primary,
      support: b.support || "PARTIAL_FACADE",
      logo: b.logo ? await upload(b.logo, "logo") : "",
      banner: b.banner ? await upload(b.banner, "banner") : "",
    };
    const r = await post("/api/checkout", {
      propertyId: plot.id,
      email: `demo-${i}@skycity.demo`,
      presenceTier: b.tier,
      ad,
    });
    if (!r.reservation) throw new Error(`${b.brand}: ${JSON.stringify(r)}`);
    await post("/api/checkout/complete", r);
    console.log(`${b.brand} · ${b.tier} · ${plot.id}`);
  }
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
