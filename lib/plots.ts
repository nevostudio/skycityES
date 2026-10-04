import type {
  Ad,
  Building,
  BuildingTier,
  District,
  Lease,
  PresenceTier,
  Property,
  State,
} from "@/types";

/** Plots reserved for premium skyscrapers (never part of the €3–€60 tiers). */
export const SKYSCRAPER_PLOTS: Record<
  number,
  { name?: string; note?: Property["premiumNote"]; auction?: boolean }
> = {
  14: { name: "Torre Central", auction: true },
  32: { note: "major_brands" },
  43: { name: "Aguja SkyCity", auction: true },
  50: { note: "auction_soon" },
  68: { note: "major_brands" },
  83: { note: "auction_soon" },
  158: { note: "auction_soon" },
  166: { name: "Torre de la Ribera", auction: true },
};
export const SKYSCRAPER_PRICE = 200;

/** NevoStudio, the reference example of a fully branded building. */
export const NEVOSTUDIO_BRANDING: Ad = {
  brand: "NevoStudio",
  tagline: "Encuentra tus próximos anunciantes",
  description: "El estudio que diseña y construye SkyCity.",
  website: "",
  instagram: "",
  tiktok: "",
  x: "",
  linkedin: "",
  logo: "/brands/nevostudio.svg",
  banner: "/brands/nevostudio-banner.svg",
  promo: "",
  cta: "Visitar web",
  primary: "#ff4b00",
  secondary: "#f4f4f2",
  support: "PARTIAL_FACADE",
  status: "active",
};
/** City-owned buildings standing from day one. They have no owner or lease. */
export const PUBLIC_BUILDINGS: {
  number: number;
  name: string;
  tier: PresenceTier;
  color: string;
  description: string;
  branding?: Ad;
}[] = [
  {
    number: 3,
    name: "SkyCity HQ",
    tier: "LANDMARK",
    color: "#e9dfca",
    description: "La sede de SkyCity. Aquí empezó la ciudad.",
  },
  {
    number: 73,
    name: "NevoStudio",
    tier: "PREMIUM",
    color: "#e9e7e1",
    description: "El estudio que diseña y construye SkyCity.",
    branding: NEVOSTUDIO_BRANDING,
  },
  {
    number: 140,
    name: "Ayuntamiento",
    tier: "PREMIUM",
    color: "#ecdcc0",
    description: "La casa de todos los vecinos de SkyCity.",
  },
  {
    number: 160,
    name: "Estación Central",
    tier: "PRO",
    color: "#dfe3d6",
    description: "Trenes, llegadas y despedidas junto al río.",
  },
  {
    number: 110,
    name: "Museo de SkyCity",
    tier: "PRO",
    color: "#e2d9e2",
    description: "La historia de una ciudad que se construye entre todos.",
  },
  {
    number: 190,
    name: "Biblioteca",
    tier: "PLUS",
    color: "#e6dfcc",
    description: "Silencio, libros y una terraza para leer al sol.",
  },
];

/** Fictional brands kept as a small, clearly labeled showcase in demo mode. */
export const DEMO_SHOWCASE: {
  number: number;
  brand: string;
  tier: PresenceTier;
  primary: string;
  tagline: string;
}[] = [
  {
    number: 13,
    brand: "Nova Labs",
    tier: "PRO",
    primary: "#648688",
    tagline: "Ideas que despegan",
  },
  {
    number: 26,
    brand: "Pixel Coffee",
    tier: "PREMIUM",
    primary: "#895f48",
    tagline: "Café de especialidad",
  },
  {
    number: 52,
    brand: "Green Market",
    tier: "STARTER",
    primary: "#73966f",
    tagline: "Del huerto a tu mesa",
  },
  {
    number: 65,
    brand: "Moonlight Club",
    tier: "PLUS",
    primary: "#b08499",
    tagline: "Música hasta el amanecer",
  },
];
export const DEMO_DESCRIPTION =
  "Una idea independiente con su sitio en la ciudad. Marca ficticia de demostración.";
export const isShowcaseAd = (ad: Ad) =>
  ad.description.includes("ficticia de demostración") ||
  ad.description.includes("fictional demo");

export const DISTRICTS_ES: Record<
  string,
  { name: string; subtitle: string; en: [string, string] }
> = {
  downtown: {
    name: "Centro",
    subtitle: "El corazón de la ciudad",
    en: ["Downtown", "The heart of the city"],
  },
  "business-district": {
    name: "Distrito Financiero",
    subtitle: "Causa una gran impresión",
    en: ["Business District", "Make a bigger impression"],
  },
  "tech-district": {
    name: "Distrito Tecnológico",
    subtitle: "El mañana empieza aquí",
    en: ["Tech District", "Tomorrow starts here"],
  },
  "entertainment-district": {
    name: "Distrito de Ocio",
    subtitle: "Siempre en el foco",
    en: ["Entertainment District", "Always in the spotlight"],
  },
  "old-town": {
    name: "Casco Antiguo",
    subtitle: "Calles pequeñas. Gran carácter.",
    en: ["Old Town", "Small streets. Big character."],
  },
  riverside: {
    name: "Ribera",
    subtitle: "Otra forma de vivir el río",
    en: ["Riverside", "A different kind of waterfront"],
  },
  "residential-district": {
    name: "Zona Residencial",
    subtitle: "Encuentra tu rincón",
    en: ["Residential District", "Find your little corner"],
  },
};

export const CTAS = [
  "Visitar web",
  "Comprar ahora",
  "Sígueme",
  "Más información",
  "Ver proyecto",
  "Contactar",
] as const;
export const LEGACY_CTAS: Record<string, (typeof CTAS)[number]> = {
  "Visit website": "Visitar web",
  "Shop now": "Comprar ahora",
  "Follow me": "Sígueme",
  "Learn more": "Más información",
  "View project": "Ver proyecto",
  "Contact us": "Contactar",
};

export const plotName = (n: number) => `Solar #${String(n).padStart(3, "0")}`;
export const towerName = (n: number) =>
  SKYSCRAPER_PLOTS[n]?.name || `Torre #${String(n).padStart(3, "0")}`;

export function makeBuilding(
  property: Property,
  tier: BuildingTier,
  builtAt: string,
  extra: Partial<Building> = {},
): Building {
  return {
    id: `bld-${property.id}`,
    propertyId: property.id,
    kind: "private",
    tier,
    builtAt,
    demo: false,
    ...extra,
  };
}

export function applyDistrictNames(districts: District[]) {
  for (const d of districts) {
    const es = DISTRICTS_ES[d.id];
    if (!es) continue;
    if (d.name === es.en[0]) d.name = es.name;
    if (d.subtitle === es.en[1]) d.subtitle = es.subtitle;
  }
}

const legacyName =
  /^(House|Shop|Restaurant|Office|Apartment|Tower|Warehouse|Nightclub|Hotel|Mall|Billboard|Landmark) #\d{3}$/;
const legacyTowers: Record<string, string> = {
  "Central Tower": "Torre Central",
  "SkyCity Spire": "Aguja SkyCity",
  "Waterfront Tower": "Torre de la Ribera",
};
const activeLease = (s: State, propertyId: string) =>
  s.leases.find((l) => l.propertyId === propertyId && l.status === "active");

/**
 * Plots + buildings (phase 1). Versioned and additive:
 * - AVAILABLE plots stay empty; active leases become built buildings (one-time payment, no expiry).
 * - Extra fictional seed ads are retired (kept as records, never deleted).
 * - Customers, transactions, bids, auctions and analytics are untouched.
 */
export function migratePlots(s: State) {
  s.buildings ??= [];
  const settings = s.settings[0];
  if (settings.plotsVersion === 1) return s;
  applyDistrictNames(s.districts);
  const showcase = new Set(DEMO_SHOWCASE.map((d) => `seed-lease-${d.number}`));
  for (const l of s.leases) {
    if (
      l.status === "active" &&
      l.id.startsWith("seed-lease-") &&
      !showcase.has(l.id)
    ) {
      l.status = "expired";
      l.retired = true;
    }
    l.ad.cta = LEGACY_CTAS[l.ad.cta] || l.ad.cta;
    if (l.id.startsWith("seed-lease-") && isShowcaseAd(l.ad))
      l.ad.description = DEMO_DESCRIPTION;
    if (l.status === "active" && l.expiresAt) {
      l.legacyExpiresAt = l.expiresAt;
      delete l.expiresAt;
    }
  }
  for (const r of s.reservations) r.ad.cta = LEGACY_CTAS[r.ad.cta] || r.ad.cta;
  const brands = new Set(
    s.leases
      .filter((l) => l.status === "active")
      .map((l) => l.ad.brand.trim().toLowerCase()),
  );
  for (const p of s.properties) {
    p.price ??=
      p.inventory === "skyscraper"
        ? p.prices?.["30"] ||
          Object.values(p.prices || {})[0] ||
          SKYSCRAPER_PRICE
        : 3;
    delete p.prices;
    if (legacyTowers[p.name]) p.name = legacyTowers[p.name];
    else if (legacyName.test(p.name))
      p.name =
        p.inventory === "skyscraper" ? towerName(p.number) : plotName(p.number);
    if (
      p.inventory === "skyscraper" &&
      !activeLease(s, p.id) &&
      p.sale !== "auction" &&
      !s.reservations.some(
        (r) => r.propertyId === p.id && r.status === "reserved",
      )
    ) {
      p.reservedForBrands = true;
      p.premiumNote = SKYSCRAPER_PLOTS[p.number]?.note || "major_brands";
    }
  }
  for (const def of PUBLIC_BUILDINGS) {
    const p = s.properties.find((p) => p.number === def.number);
    if (
      !p ||
      p.inventory === "skyscraper" ||
      activeLease(s, p.id) ||
      brands.has(def.name.toLowerCase()) ||
      s.buildings.some((b) => b.propertyId === p.id) ||
      s.reservations.some(
        (r) => r.propertyId === p.id && r.status === "reserved",
      ) ||
      s.auctions.some(
        (a) =>
          a.propertyId === p.id &&
          ["live", "awaiting_payment"].includes(a.status),
      )
    )
      continue;
    Object.assign(p, {
      inventory: "public",
      name: def.name,
      description: def.description,
      color: def.color,
      sale: "rental",
      reservedForBrands: false,
    } satisfies Partial<Property>);
    s.buildings.push(
      makeBuilding(p, def.tier, new Date(0).toISOString(), {
        id: `bld-public-${p.number}`,
        kind: "public",
      }),
    );
  }
  for (const l of s.leases) if (l.status === "active") ensureBuilding(s, l);
  settings.plotsVersion = 1;
  return s;
}

/**
 * Branding (phase 2), versioned and additive: every ad gains a tagline and an image support
 * (legacy "facade" style → partial facade). Customer content is otherwise untouched.
 */
export function migrateBranding(s: State) {
  const settings = s.settings[0];
  if (settings.brandingVersion === 1) return s;
  const upgrade = (ad: Ad) => {
    ad.tagline ??= "";
    ad.support ??= ad.style === "facade" ? "PARTIAL_FACADE" : "SIDE_BILLBOARD";
  };
  for (const l of s.leases) {
    upgrade(l.ad);
    const demo = DEMO_SHOWCASE.find((d) => `seed-lease-${d.number}` === l.id);
    if (demo && isShowcaseAd(l.ad) && !l.ad.tagline)
      l.ad.tagline = demo.tagline;
  }
  for (const r of s.reservations) upgrade(r.ad);
  for (const def of PUBLIC_BUILDINGS) {
    const p = s.properties.find((p) => p.number === def.number);
    const b = p && s.buildings.find((b) => b.propertyId === p.id);
    if (def.branding && b?.kind === "public" && !b.branding)
      b.branding = structuredClone(def.branding);
  }
  settings.brandingVersion = 1;
  return s;
}

/** Every active lease stands on its plot as a building. */
export function ensureBuilding(s: State, l: Lease) {
  const p = s.properties.find((p) => p.id === l.propertyId);
  if (!p || s.buildings.some((b) => b.propertyId === p.id)) return;
  const last = l.upgradeHistory?.at(-1);
  s.buildings.push(
    makeBuilding(
      p,
      p.inventory === "skyscraper" ? "SKYSCRAPER" : l.presenceTier || "STARTER",
      l.startsAt,
      {
        id: `bld-${l.id}`,
        leaseId: l.id,
        demo: l.demo,
        upgradedAt: last?.createdAt,
        previousTier: last?.from,
      },
    ),
  );
}
