import test from "node:test";
import assert from "node:assert/strict";
import { makeSeed, emptyAd } from "../lib/seed";
import { citySnapshot, fulfill, reserve } from "../lib/engine";
import { assignBuilding } from "../lib/admin-inventory";
import { featuredBrands, latestPurchase, rankBrands } from "../lib/city-social";

const now = Date.parse("2026-10-06T12:00:00Z");
const ad = (brand: string) => ({
  ...emptyAd,
  brand,
  status: "active" as const,
});
const free = (s: ReturnType<typeof makeSeed>, skip = 0) =>
  s.properties.filter(
    (p) =>
      p.inventory === "normal" &&
      !s.buildings.some((b) => b.propertyId === p.id),
  )[skip];

test("City Hall builds any size without a payment, never as a purchase", () => {
  const s = makeSeed(false, now);
  const plot = free(s);
  const lease = assignBuilding(
    s,
    {
      propertyId: plot.id,
      email: "brand@example.com",
      ad: ad("Casa"),
      tier: "PRO",
    },
    "admin@example.com",
    false,
    now,
  );
  assert.equal(s.transactions.length, 0);
  const p = citySnapshot(s, false, now).properties.find(
    (v) => v.id === plot.id,
  )!;
  assert.equal(p.building?.tier, "PRO");
  assert.equal(p.assigned, true);
  assert.equal(p.current_property_value ?? 0, 0);
  // Protected like a purchase, then open to anyone paying the plot price.
  assert.equal(p.takeover?.open, false);
  const later = citySnapshot(s, false, now + 2 * 86400000).properties.find(
    (v) => v.id === plot.id,
  )!;
  assert.equal(later.takeover?.open, true);
  assert.equal(later.takeover?.minimumOffer, 3);
  // Not a buyer: absent from the ranking and the purchase feed unless featured.
  const city = () => citySnapshot(s, false, now).properties;
  assert.equal(rankBrands(city()).length, 0);
  assert.equal(latestPurchase(city()), null);
  assert.equal(featuredBrands(city()).length, 0);
  lease.ranking = "featured";
  assert.deepEqual(
    featuredBrands(city()).map((v) => v.id),
    [plot.id],
  );
  assert.equal(rankBrands(city()).length, 0);
  assert.throws(
    () =>
      assignBuilding(
        s,
        { propertyId: plot.id, email: "x@example.com", ad: ad("Otra") },
        "admin@example.com",
        false,
        now,
      ),
    /ocupado/,
  );
});

test("hiding a paid brand removes it from the ranking and the purchase feed", () => {
  const s = makeSeed(false, now);
  const plot = free(s);
  const { reservation } = reserve(
    s,
    { propertyId: plot.id, email: "buyer@example.com", ad: ad("Pagada") },
    true,
    now,
  );
  const lease = fulfill(s, reservation.id, "pay-1", 3, "demo", now)!;
  const city = () => citySnapshot(s, false, now).properties;
  assert.equal(rankBrands(city())[0]?.property.id, plot.id);
  assert.equal(latestPurchase(city())?.property.id, plot.id);
  lease.ranking = "hidden";
  assert.equal(rankBrands(city()).length, 0);
  assert.equal(latestPurchase(city()), null);
  assert.equal(featuredBrands(city()).length, 0);
});
