import type { BuildingTier, PresenceTier, Property, State } from "@/types";

export const PRESENCE_TIERS = [
  "STARTER",
  "PLUS",
  "PRO",
  "PREMIUM",
  "LANDMARK",
] as const;
/** One-time prices. Skyscrapers are premium inventory and never use these tiers. */
export const PRESENCE = {
  STARTER: {
    price: 3,
    floors: "1–2 plantas",
    description: "Un edificio pequeño con el rótulo de tu marca.",
  },
  PLUS: {
    price: 7,
    floors: "2–3 plantas",
    description: "Más altura, un rótulo más grande y detalles en la fachada.",
  },
  PRO: {
    price: 15,
    floors: "3–5 plantas",
    description: "Un edificio con presencia y una valla en la fachada.",
  },
  PREMIUM: {
    price: 30,
    floors: "5–8 plantas",
    description:
      "Rótulo en la azotea, iluminación de acento y un remate esculpido.",
  },
  LANDMARK: {
    price: 60,
    floors: "Gran edificio",
    description:
      "Un edificio emblemático con pantalla grande y detalles iluminados.",
  },
} satisfies Record<
  PresenceTier,
  { price: number; floors: string; description: string }
>;
export const presenceLevel = (tier?: BuildingTier) =>
  tier === "SKYSCRAPER" ? 5 : PRESENCE_TIERS.indexOf(tier || "STARTER");
export function claimPrice(p: Property, tier: PresenceTier = "STARTER") {
  return p.inventory === "skyscraper" ? p.price : PRESENCE[tier].price;
}
export const upgradePrice = (from: PresenceTier, to: PresenceTier) =>
  PRESENCE[to].price - PRESENCE[from].price;

export const FLOOR_HEIGHT = 1;
/** Ground floor (shopfront + awning) is taller than the floors above. */
export const GROUND_FLOOR_HEIGHT = 2;
/** Height of an empty plot (terrain + foundations). */
export const PLOT_HEIGHT = 0.3;
/**
 * STARTER < PLUS < PRO < PREMIUM < LANDMARK << SKYSCRAPER for every model,
 * with a little variety between neighbours.
 */
export function buildingFloors(tier: BuildingTier, model = 0) {
  const step = model % 3 === 2 ? 1 : 0;
  switch (tier) {
    case "STARTER":
      return 1 + step;
    case "PLUS":
      return 2 + step;
    case "PRO":
      return 3 + (model % 3);
    case "PREMIUM":
      return 6 + (model % 3);
    case "LANDMARK":
      return 10 + (model % 2);
    case "SKYSCRAPER":
      return 24 + (model % 3) * 3;
  }
}
export const buildingHeight = (tier: BuildingTier, model = 0) =>
  GROUND_FLOOR_HEIGHT + (buildingFloors(tier, model) - 1) * FLOOR_HEIGHT + 0.2;

/** Same plot, same footprint: only the height depends on what is built on it. */
export function withBuilding<T extends Property>(
  p: T,
  tier: BuildingTier | null,
): T {
  return {
    ...p,
    height: tier ? buildingHeight(tier, p.model) : PLOT_HEIGHT,
  };
}

/** Additive, versioned migration: never reprice a pending checkout or alter a lease's content. */
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
