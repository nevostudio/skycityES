import type {
  Ad,
  Building,
  District,
  Lease,
  Property,
  PropertyType,
  State,
} from "@/types";
import { PLOT_HEIGHT } from "./presence";
import { isLaunchNormalPlot } from "./inventory";
import { migrateTakeovers } from "./takeover-policy";
import {
  DEMO_DESCRIPTION,
  DEMO_SHOWCASE,
  DISTRICTS_ES,
  PUBLIC_BUILDINGS,
  SKYSCRAPER_PLOTS,
  SKYSCRAPER_PRICE,
  makeBuilding,
  plotName,
  towerName,
} from "./plots";
export const emptyAd: Ad = {
  brand: "",
  tagline: "",
  description: "",
  website: "",
  instagram: "",
  tiktok: "",
  x: "",
  linkedin: "",
  logo: "",
  banner: "",
  promo: "",
  cta: "Visitar web",
  primary: "#e77d59",
  secondary: "#fcf5e9",
  support: "SIDE_BILLBOARD",
  status: "active",
};
const layout: Omit<District, "name" | "subtitle">[] = [
  { id: "downtown", color: "#de997d", x: 0, z: 6 },
  { id: "business-district", color: "#8b9ba8", x: 0, z: -30 },
  { id: "tech-district", color: "#93aaa5", x: 36, z: -30 },
  { id: "entertainment-district", color: "#c6a0af", x: -36, z: 6 },
  { id: "old-town", color: "#d9b28d", x: -36, z: -30 },
  { id: "riverside", color: "#8fbbb9", x: 36, z: 6 },
  { id: "residential-district", color: "#c3b99d", x: 0, z: 42 },
];
const districts: District[] = layout.map((d) => ({
  ...d,
  name: DISTRICTS_ES[d.id].name,
  subtitle: DISTRICTS_ES[d.id].subtitle,
}));
/** Zoning style of each district: decorates the buildings that will rise there. */
const zoning: PropertyType[][] = [
  ["shop", "apartment", "office", "tower", "restaurant"],
  ["office", "tower", "hotel"],
  ["office", "tower", "shop"],
  ["nightclub", "restaurant", "mall", "billboard"],
  ["house", "shop", "restaurant", "apartment"],
  ["restaurant", "hotel", "shop", "apartment"],
  ["house", "house", "shop", "warehouse"],
];
const palettes = [
  "#ece2cf",
  "#ddc5a8",
  "#c6cfc7",
  "#a9bec1",
  "#eee9dc",
  "#c3b4a1",
  "#b2c2bd",
];
/**
 * An urbanized city that is still to be built: streets, parks and plots are there from day one,
 * private buildings only appear when someone buys a plot.
 */
export function makeSeed(demo = true, now = Date.now()): State {
  const properties: Property[] = [];
  districts.forEach((d, di) => {
    for (let i = 0; i < 30; i++) {
      const n = di * 30 + i + 1;
      const type = zoning[di][i % zoning[di].length];
      const sky = SKYSCRAPER_PLOTS[n];
      if (!sky && !isLaunchNormalPlot(n)) continue;
      properties.push({
        id: `building-${n}`,
        number: n,
        districtId: d.id,
        name: sky ? towerName(n) : plotName(n),
        type: sky?.auction ? "landmark" : type,
        tier: sky ? "ICONIC" : di === 0 || di === 5 ? "POPULAR" : "STANDARD",
        x: d.x + ((i % 6) - 2.5) * 4.8,
        z: d.z + (Math.floor(i / 6) - 2) * 5.3,
        height: PLOT_HEIGHT,
        width: 2.7 + (i % 3) * 0.3,
        depth: 3.1 + (i % 2) * 0.3,
        rotation: 0,
        model: n % 20,
        color: palettes[(i + di) % palettes.length],
        price: sky ? SKYSCRAPER_PRICE : 3,
        sale: sky?.auction ? "auction" : "rental",
        featured: [14, 21, 25, 26, 28, 30, 154].includes(n),
        enabled: true,
        inventory: sky ? "skyscraper" : "normal",
        ...(sky && !sky.auction
          ? { reservedForBrands: true, premiumNote: sky.note }
          : {}),
      });
    }
  });
  const byNumber = (n: number) => properties.find((p) => p.number === n)!;
  const buildings: Building[] = PUBLIC_BUILDINGS.map((def) => {
    const p = byNumber(def.number);
    Object.assign(p, {
      inventory: "public",
      name: def.name,
      description: def.description,
      color: def.color,
    } satisfies Partial<Property>);
    return makeBuilding(p, def.tier, new Date(0).toISOString(), {
      id: `bld-public-${def.number}`,
      kind: "public",
      ...(def.branding ? { branding: structuredClone(def.branding) } : {}),
    });
  });
  const leases: Lease[] = demo
    ? DEMO_SHOWCASE.map((s) => ({
        id: `seed-lease-${s.number}`,
        propertyId: byNumber(s.number).id,
        email: "hello@skycity.demo",
        ad: {
          ...emptyAd,
          brand: s.brand,
          tagline: s.tagline,
          description: DEMO_DESCRIPTION,
          primary: s.primary,
          website: "https://example.com",
        },
        startsAt: new Date(now - 86400000).toISOString(),
        status: "active",
        demo: true,
        autoRenew: false,
        transferable: false,
        presenceTier: s.tier,
        upgradeHistory: [],
      }))
    : [];
  for (const l of leases)
    buildings.push(
      makeBuilding(
        properties.find((p) => p.id === l.propertyId)!,
        l.presenceTier!,
        l.startsAt,
        { id: `bld-${l.id}`, leaseId: l.id, demo: true },
      ),
    );
  return migrateTakeovers({
    properties,
    districts: structuredClone(districts),
    leases,
    buildings,
    reservations: [],
    auctions: properties
      .filter((p) => p.sale === "auction")
      .map((p, i) => ({
        id: `auction-${p.number}`,
        propertyId: p.id,
        endsAt: new Date(now + (48 + i * 24) * 3600000).toISOString(),
        startingBid: SKYSCRAPER_PRICE,
        increment: 5,
        status: "live",
      })),
    bids: [],
    activity: leases.map((l, i) => ({
      id: `seed-activity-${i}`,
      propertyId: l.propertyId,
      brand: l.ad.brand,
      action: "claimed",
      createdAt: new Date(now - (i + 1) * 37 * 60000).toISOString(),
      demo: true,
    })),
    transactions: [],
    propertyTakeovers: [],
    analytics: [],
    access: [],
    mail: [],
    settings: [
      {
        id: "main",
        reservationMinutes: 5,
        cityName: "SkyCity",
        moderation: "automatic",
        pricingVersion: 1,
        plotsVersion: 1,
        brandingVersion: 1,
        inventoryVersion: 1,
      },
    ],
  });
}
