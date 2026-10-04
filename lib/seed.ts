import type { Ad, District, Property, PropertyType, State } from "@/types";
import { migratePresence } from "./presence";
export const emptyAd: Ad = {
  brand: "",
  description: "",
  website: "",
  instagram: "",
  tiktok: "",
  x: "",
  linkedin: "",
  logo: "",
  banner: "",
  promo: "",
  cta: "Visit website",
  primary: "#e77d59",
  secondary: "#fcf5e9",
  style: "rooftop",
  status: "active",
};
const districts: District[] = [
  {
    id: "downtown",
    name: "Downtown",
    subtitle: "The heart of the city",
    color: "#de997d",
    x: 0,
    z: 6,
  },
  {
    id: "business-district",
    name: "Business District",
    subtitle: "Make a bigger impression",
    color: "#8b9ba8",
    x: 0,
    z: -30,
  },
  {
    id: "tech-district",
    name: "Tech District",
    subtitle: "Tomorrow starts here",
    color: "#93aaa5",
    x: 36,
    z: -30,
  },
  {
    id: "entertainment-district",
    name: "Entertainment District",
    subtitle: "Always in the spotlight",
    color: "#c6a0af",
    x: -36,
    z: 6,
  },
  {
    id: "old-town",
    name: "Old Town",
    subtitle: "Small streets. Big character.",
    color: "#d9b28d",
    x: -36,
    z: -30,
  },
  {
    id: "riverside",
    name: "Riverside",
    subtitle: "A different kind of waterfront",
    color: "#8fbbb9",
    x: 36,
    z: 6,
  },
  {
    id: "residential-district",
    name: "Residential District",
    subtitle: "Find your little corner",
    color: "#c3b99d",
    x: 0,
    z: 42,
  },
];
const basePrices: Record<PropertyType, number> = {
  house: 3,
  shop: 5,
  restaurant: 12,
  office: 25,
  apartment: 15,
  tower: 65,
  warehouse: 8,
  nightclub: 18,
  hotel: 40,
  mall: 55,
  billboard: 10,
  landmark: 100,
};
const palettes = [
  "#ece2cf",
  "#ddc5a8",
  "#c6cfc7",
  "#a9bec1",
  "#eee9dc",
  "#c3b4a1",
  "#b2c2bd",
];
export function makeSeed(demo = true, now = Date.now()): State {
  const properties: Property[] = [];
  districts.forEach((d, di) => {
    for (let i = 0; i < 30; i++) {
      const n = di * 30 + i + 1;
      const choices: PropertyType[][] = [
        ["shop", "apartment", "office", "tower", "restaurant"],
        ["office", "tower", "hotel"],
        ["office", "tower", "shop"],
        ["nightclub", "restaurant", "mall", "billboard"],
        ["house", "shop", "restaurant", "apartment"],
        ["restaurant", "hotel", "shop", "apartment"],
        ["house", "house", "shop", "warehouse"],
      ];
      const type = choices[di][i % choices[di].length];
      const tall =
        type === "tower"
          ? 12 + (i % 4) * 3
          : type === "office"
            ? 7 + (i % 3) * 2
            : type === "hotel"
              ? 10
              : type === "apartment"
                ? 6
                : type === "mall"
                  ? 4
                  : type === "billboard"
                    ? 5
                    : 2.5 + (i % 3) * 0.5;
      const iconic = [14, 43, 166].includes(n);
      properties.push({
        id: `building-${n}`,
        number: n,
        districtId: d.id,
        name:
          n === 14
            ? "Central Tower"
            : n === 43
              ? "SkyCity Spire"
              : n === 166
                ? "Waterfront Tower"
                : `${type.charAt(0).toUpperCase() + type.slice(1)} #${String(n).padStart(3, "0")}`,
        type: iconic ? "landmark" : type,
        tier: iconic
          ? "ICONIC"
          : tall >= 10
            ? "PREMIUM"
            : di === 0 || di === 5
              ? "POPULAR"
              : "STANDARD",
        x: d.x + ((i % 6) - 2.5) * 4.8,
        z: d.z + (Math.floor(i / 6) - 2) * 5.3,
        height: iconic ? 23 : tall,
        width: 2.7 + (i % 3) * 0.3,
        depth: 3.1 + (i % 2) * 0.3,
        rotation: 0,
        model: n % 20,
        color: palettes[(i + di) % palettes.length],
        prices: {
          "7": Math.max(2, Math.round(basePrices[type] * 0.4)),
          "30": basePrices[type],
          "90": Math.round(basePrices[type] * 2.5),
        },
        sale: iconic ? "auction" : "rental",
        featured: [3, 14, 73, 154].includes(n),
        enabled: true,
      });
    }
  });
  const brands = [
    "Nova Labs",
    "Pixel Coffee",
    "Orbit Studio",
    "Green Market",
    "Moonlight Club",
    "Hyperbyte",
  ];
  const colors = [
    "#648688",
    "#895f48",
    "#81719f",
    "#73966f",
    "#b08499",
    "#6481a3",
  ];
  const leases = demo
    ? properties
        .filter((p) => p.number % 13 === 0 && p.sale === "rental")
        .map((p, i) => ({
          id: `seed-lease-${p.number}`,
          propertyId: p.id,
          email: "hello@skycity.demo",
          ad: {
            ...emptyAd,
            brand: brands[i % 6],
            description:
              "An independent idea with a place in the city. This is a fictional demo advertiser.",
            primary: colors[i % 6],
            website: "https://example.com",
          },
          startsAt: new Date(now - 86400000).toISOString(),
          expiresAt: new Date(now + 29 * 86400000).toISOString(),
          status: "active" as const,
          demo: true,
          autoRenew: false,
          transferable: false,
        }))
    : [];
  return migratePresence({
    properties,
    districts,
    leases,
    reservations: [],
    auctions: properties
      .filter((p) => p.sale === "auction")
      .map((p, i) => ({
        id: `auction-${p.number}`,
        propertyId: p.id,
        endsAt: new Date(now + (48 + i * 24) * 3600000).toISOString(),
        startingBid: 35 + i * 15,
        increment: 5,
        days: 30,
        status: "live",
      })),
    bids: [],
    activity: leases.slice(0, 5).map((l, i) => ({
      id: `seed-activity-${i}`,
      propertyId: l.propertyId,
      brand: l.ad.brand,
      action: "claimed",
      createdAt: new Date(now - (i + 1) * 37 * 60000).toISOString(),
      demo: true,
    })),
    transactions: [],
    analytics: [],
    access: [],
    mail: [],
    settings: [
      {
        id: "main",
        durations: [7, 30, 90],
        reservationMinutes: 5,
        cityName: "SkyCity",
        moderation: "automatic",
      },
    ],
  });
}
