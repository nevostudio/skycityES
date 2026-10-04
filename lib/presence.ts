import type { PresenceTier, Property, State } from "@/types";

export const PRESENCE_TIERS = [
  "STARTER",
  "PLUS",
  "PRO",
  "PREMIUM",
  "LANDMARK",
] as const;
export const PRESENCE = {
  STARTER: {
    price: 3,
    height: 1,
    description: "A beautiful base building with your brand sign.",
  },
  PLUS: {
    price: 7,
    height: 1.35,
    description: "More height, a larger sign and facade accents.",
  },
  PRO: {
    price: 15,
    height: 1.85,
    description: "A bigger presence with a branded facade billboard.",
  },
  PREMIUM: {
    price: 30,
    height: 2.5,
    description: "Rooftop signage, accent lighting and a sculpted crown.",
  },
  LANDMARK: {
    price: 60,
    height: 3.3,
    description:
      "A signature building with a large screen and illuminated details.",
  },
} satisfies Record<
  PresenceTier,
  { price: number; height: number; description: string }
>;
export const presenceLevel = (tier?: PresenceTier) =>
  PRESENCE_TIERS.indexOf(tier || "STARTER");
export function claimPrice(
  p: Property,
  tier: PresenceTier = "STARTER",
  days = 30,
) {
  return p.inventory === "skyscraper"
    ? p.prices[String(days)]
    : PRESENCE[tier].price;
}
/** Shared by the city, selection camera and previews. Width, depth and address never change. */
export function visualProperty<T extends Property>(
  p: T,
  tier: PresenceTier = "STARTER",
): T {
  const baseHeight = p.baseHeight ?? p.height;
  const height =
    p.inventory === "skyscraper"
      ? Math.max(25, baseHeight)
      : Math.min(
          14,
          Math.max(
            2.6,
            Math.min(4.2, baseHeight * (baseHeight > 5 ? 0.42 : 1)),
          ) * PRESENCE[tier].height,
        );
  return { ...p, baseHeight, height };
}

/** Additive, versioned migration: never reprice a pending checkout or alter a lease's term/content. */
export function migratePresence(s: State) {
  if (s.settings[0].pricingVersion === 1) return s;
  const major = [14, 32, 43, 50, 68, 83, 158, 166];
  for (const p of s.properties) {
    p.inventory = major.includes(p.number) ? "skyscraper" : "normal";
    p.prices = p.inventory === "skyscraper" ? { "30": 200 } : { "30": 3 };
    if (p.inventory === "skyscraper") {
      p.height = 25 + (p.model % 3) * 3;
      p.tier = "ICONIC";
      p.reservedForBrands =
        [32, 68].includes(p.number) &&
        !s.leases.some((l) => l.propertyId === p.id && l.status === "active") &&
        !s.reservations.some(
          (r) => r.propertyId === p.id && r.status === "reserved",
        );
    }
  }
  for (const l of s.leases) {
    // Fictional showcases illustrate the range; existing customers receive Starter without new charges.
    l.presenceTier ??= l.id.startsWith("seed-lease-")
      ? PRESENCE_TIERS[(Number(l.id.split("-").at(-1)) / 13 + 1) % 5]
      : "STARTER";
    l.upgradeHistory ??= [];
  }
  for (const r of s.reservations) r.presenceTier ??= "STARTER";
  // Never change a live auction with bids or its already agreed winner price.
  for (const a of s.auctions)
    if (a.status === "live" && !s.bids.some((b) => b.auctionId === a.id))
      a.startingBid = 200;
  s.settings[0].durations = [30];
  s.settings[0].pricingVersion = 1;
  return s;
}
