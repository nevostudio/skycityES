import type { CityData, CityMetrics, PublicProperty, ValueStep } from "@/types";

export type RankedBrand = { property: PublicProperty; value: number };
export type LatestPurchase = { property: PublicProperty; payment: ValueStep };

/** Paid, currently visible private brands only. Public buildings and seed showcases aren't buyers. */
export function rankBrands(properties: PublicProperty[]): RankedBrand[] {
  return properties
    .filter(
      (p) =>
        p.building?.kind === "private" &&
        p.status === "claimed" &&
        p.ad?.status === "active" &&
        p.valueHistory?.some((h) => h.amount > 0) &&
        (p.current_property_value ?? 0) > 0,
    )
    .map((property) => ({ property, value: property.current_property_value! }))
    .sort((a, b) => b.value - a.value || a.property.number - b.property.number);
}

export function latestPurchase(
  properties: PublicProperty[],
): LatestPurchase | null {
  let latest: LatestPurchase | null = null;
  for (const { property } of rankBrands(properties)) {
    for (const payment of property.valueHistory ?? []) {
      if (
        payment.amount > 0 &&
        (!latest || Date.parse(payment.at) > Date.parse(latest.payment.at))
      )
        latest = { property, payment };
    }
  }
  return latest;
}

/** Replace with a presence provider through CityData.metrics. Demo numbers are always labelled. */
export function cityMetrics(data: CityData): CityMetrics {
  const metrics = data.metrics ?? {
    totalVisits: 0,
    online: null,
    onlineSource: "unavailable" as const,
  };
  return data.demo && metrics.onlineSource === "unavailable"
    ? { ...metrics, online: 18, onlineSource: "demo" }
    : metrics;
}

export function purchaseAge(at: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(at)) / 60000));
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  if (minutes < 1440) return `hace ${Math.floor(minutes / 60)} h`;
  return `hace ${Math.floor(minutes / 1440)} d`;
}

export const socialNumber = (value: number) =>
  new Intl.NumberFormat("es-ES", { useGrouping: "always" }).format(value);

export function brandWebsite(url?: string) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}
