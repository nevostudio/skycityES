import type { State } from "../types";

/**
 * Cities created while auctions were on had three live skyscraper auctions. The current seed
 * has none, so tests that exercise the (dormant) auction engine or legacy migrations add them.
 */
export function withLegacyAuctions<T extends State>(s: T, now: number): T {
  for (const [i, n] of [14, 43, 166].entries()) {
    const p = s.properties.find((p) => p.number === n)!;
    p.sale = "auction";
    s.auctions.push({
      id: `auction-${n}`,
      propertyId: p.id,
      endsAt: new Date(now + (48 + i * 24) * 3600000).toISOString(),
      startingBid: 200,
      increment: 5,
      status: "live",
    });
  }
  return s;
}
