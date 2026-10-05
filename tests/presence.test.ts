import test from "node:test";
import assert from "node:assert/strict";
import { makeSeed, emptyAd } from "../lib/seed";
import { citySnapshot, fulfill, reserve, sweep } from "../lib/engine";
import {
  PRESENCE,
  PRESENCE_TIERS,
  buildingFloors,
  buildingHeight,
  migratePresence,
  withBuilding,
} from "../lib/presence";
import { assignSkyscraper } from "../lib/admin-inventory";
import { withLegacyAuctions } from "./support";

const now = Date.parse("2026-10-04T12:00:00Z");
const input = {
  propertyId: "building-1",
  email: "owner@example.com",
  ad: { ...emptyAd, brand: "Presence Test" },
};
function owned() {
  const s = makeSeed(false, now);
  const { reservation: r } = reserve(s, input, true, now);
  const l = fulfill(s, r.id, "initial-payment", r.amount, "demo", now)!;
  return { s, l };
}
const snap = (s: ReturnType<typeof makeSeed>, id = input.propertyId) =>
  citySnapshot(s, true, now).properties.find((p) => p.id === id)!;
test("every normal plot starts at 3 €; the five one-time tiers are priced on the server", () => {
  const s = makeSeed(false, now);
  assert.ok(
    s.properties
      .filter((p) => p.inventory === "normal")
      .every((p) => p.price === 3),
  );
  assert.deepEqual(
    PRESENCE_TIERS.map((t) => PRESENCE[t].price),
    [3, 7, 15, 30, 60],
  );
  for (const tier of PRESENCE_TIERS) {
    const s = makeSeed(false, now);
    const r = reserve(
      s,
      { ...input, presenceTier: tier },
      true,
      now,
    ).reservation;
    assert.equal(r.amount, PRESENCE[tier].price);
    assert.equal(r.days, 0);
    const l = fulfill(s, r.id, tier, r.amount, "demo", now)!;
    assert.equal(l.presenceTier, tier);
    assert.equal(snap(s).building?.tier, tier);
  }
});
test("STARTER → PRO costs 12 €, grows the same building after payment only, keeps plot, ad and history", () => {
  const { s, l } = owned();
  const ad = structuredClone(l.ad);
  const before = snap(s);
  const buildingId = s.buildings.find((b) => b.leaseId === l.id)!.id;
  const r = reserve(
    s,
    {
      ...input,
      upgradeLeaseId: l.id,
      presenceTier: "PRO",
      ad: { ...input.ad, brand: "Not an ad edit" },
    },
    true,
    now,
  ).reservation;
  assert.equal(r.amount, 12);
  assert.equal(l.presenceTier, "STARTER");
  assert.equal(snap(s).status, "claimed");
  assert.equal(snap(s).height, before.height);
  assert.throws(() => fulfill(s, r.id, "wrong", 15, "demo", now), /importe/);
  fulfill(s, r.id, "upgrade-payment", 12, "demo", now);
  fulfill(s, r.id, "upgrade-payment", 12, "demo", now);
  fulfill(s, r.id, "retry-event", 12, "demo", now);
  assert.equal(l.presenceTier, "PRO");
  assert.deepEqual(l.ad, ad);
  assert.equal(l.upgradeHistory?.length, 1);
  assert.equal(l.upgradeHistory![0].amount, 12);
  const after = snap(s);
  assert.equal(after.building?.tier, "PRO");
  assert.equal(after.building?.previousTier, "STARTER");
  assert.ok(after.height > before.height);
  assert.equal(
    s.buildings.filter((b) => b.propertyId === l.propertyId).length,
    1,
  );
  assert.equal(s.buildings.find((b) => b.leaseId === l.id)!.id, buildingId);
  for (const k of [
    "x",
    "z",
    "width",
    "depth",
    "rotation",
    "id",
    "districtId",
  ] as const)
    assert.equal(after[k], before[k]);
  assert.equal(s.transactions.length, 2);
});
test("upgrades reject non-owners, downgrades, parallel reservations, renewals, stale state and expired checkouts", () => {
  const { s, l } = owned();
  const upgrade = {
    ...input,
    upgradeLeaseId: l.id,
    presenceTier: "PRO" as const,
  };
  assert.throws(
    () => reserve(s, { ...upgrade, email: "stranger@example.com" }, true, now),
    /propietario/,
  );
  assert.throws(
    () => reserve(s, { ...upgrade, presenceTier: "STARTER" }, true, now),
    /superior/,
  );
  const r = reserve(s, upgrade, true, now).reservation;
  assert.throws(
    () => reserve(s, { ...upgrade, presenceTier: "LANDMARK" }, true, now),
    /construyendo/,
  );
  assert.throws(
    () => reserve(s, { ...input, renewalLeaseId: l.id }, true, now),
    /renovaciones/,
  );
  assert.throws(
    () => fulfill(s, r.id, "late", 12, "demo", now + 301000),
    /caducado/,
  );
  l.presenceTier = "PLUS";
  assert.throws(
    () => fulfill(s, r.id, "stale", 12, "demo", now),
    /ya no coincide/,
  );
  assert.equal(l.upgradeHistory?.length, 0);
});
test("sequential upgrades charge only the remaining differences up to 60 €", () => {
  const { s, l } = owned();
  for (const tier of ["PLUS", "PRO", "PREMIUM", "LANDMARK"] as const) {
    const r = reserve(
      s,
      { ...input, upgradeLeaseId: l.id, presenceTier: tier },
      true,
      now,
    ).reservation;
    fulfill(s, r.id, `upgrade-${tier}`, r.amount, "demo", now);
  }
  assert.equal(
    s.transactions.reduce((sum, t) => sum + t.amount, 0),
    60,
  );
  assert.equal(snap(s).building?.tier, "LANDMARK");
  assert.throws(
    () =>
      reserve(
        s,
        { ...input, upgradeLeaseId: l.id, presenceTier: "LANDMARK" },
        true,
        now,
      ),
    /superior/,
  );
});
test("STARTER < PLUS < PRO < PREMIUM < LANDMARK << SKYSCRAPER, with the requested floors and the same footprint", () => {
  const ranges = {
    STARTER: [1, 2],
    PLUS: [2, 3],
    PRO: [3, 5],
    PREMIUM: [5, 8],
    LANDMARK: [9, 12],
  } as const;
  const s = makeSeed(false, now);
  for (const p of s.properties.filter((p) => p.inventory === "normal")) {
    let height = 0;
    for (const tier of PRESENCE_TIERS) {
      const floors = buildingFloors(tier, p.model);
      assert.ok(floors >= ranges[tier][0] && floors <= ranges[tier][1]);
      const v = withBuilding(p, tier);
      assert.ok(v.height > height && v.height <= 14);
      assert.equal(v.width, p.width);
      assert.equal(v.depth, p.depth);
      assert.equal(v.x, p.x);
      assert.equal(v.z, p.z);
      height = v.height;
    }
    assert.ok(buildingHeight("SKYSCRAPER", p.model) >= 25);
    assert.ok(buildingHeight("SKYSCRAPER", p.model) > height * 2);
  }
});
test("eight skyscraper plots are premium inventory sold at a fixed price, never a 3–60 € tier", () => {
  const s = makeSeed(false, now);
  const major = s.properties.filter((p) => p.inventory === "skyscraper");
  assert.equal(major.length, 8);
  // Auctions are retired: every skyscraper plot is on direct sale.
  assert.ok(major.every((p) => !p.reservedForBrands && p.sale === "rental"));
  assert.equal(s.auctions.length, 0);
  assert.ok(major.every((p) => p.price >= 200));
  assert.ok(major.every((p) => !snap(s, p.id).building));
  // City Hall can still hold one back for a brand.
  s.properties.find((p) => p.id === "building-32")!.reservedForBrands = true;
  assert.throws(
    () => reserve(s, { ...input, propertyId: "building-32" }, true, now),
    /no está disponible/,
  );
  const r = reserve(
    s,
    { ...input, propertyId: "building-50", presenceTier: "STARTER" },
    true,
    now,
  ).reservation;
  assert.equal(r.amount, 200);
  const l = fulfill(s, r.id, "sky-paid", 200, "demo", now)!;
  assert.equal(snap(s, "building-50").building?.tier, "SKYSCRAPER");
  assert.ok(snap(s, "building-50").height >= 25);
  assert.throws(
    () =>
      reserve(
        s,
        {
          ...input,
          propertyId: l.propertyId,
          upgradeLeaseId: l.id,
          presenceTier: "LANDMARK",
        },
        true,
        now,
      ),
    /rascacielos/,
  );
});
test("manual skyscraper assignments build the tower without recording a payment", () => {
  const s = makeSeed(false, now);
  const l = assignSkyscraper(
    s,
    { ...input, propertyId: "building-32" },
    "admin@example.com",
    true,
    now,
  );
  assert.equal(l.assignedBy, "admin@example.com");
  assert.equal(s.transactions.length, 0);
  const tower = snap(s, l.propertyId);
  assert.equal(tower.ad?.brand, input.ad.brand);
  assert.equal(tower.building?.tier, "SKYSCRAPER");
  assert.throws(
    () =>
      assignSkyscraper(
        s,
        { ...input, propertyId: l.propertyId },
        "admin@example.com",
        true,
        now,
      ),
    /ocupado/,
  );
  assert.throws(
    () => assignSkyscraper(s, input, "admin@example.com", true, now),
    /rascacielos/,
  );
});
test("pricing migration stays additive: pending checkout amounts, bids and ads are untouched", () => {
  const { s, l } = owned();
  withLegacyAuctions(s, now);
  s.settings[0].pricingVersion = undefined;
  const before = structuredClone(l);
  s.auctions[0].startingBid = 35;
  s.bids.push({
    id: "legacy-bid",
    auctionId: s.auctions[0].id,
    email: input.email,
    amount: 35,
    createdAt: new Date(now).toISOString(),
  });
  const pending = reserve(
    s,
    { ...input, propertyId: "building-2" },
    true,
    now,
  ).reservation;
  pending.amount = 47;
  migratePresence(s);
  assert.equal(pending.amount, 47);
  assert.equal(s.auctions[0].startingBid, 35);
  assert.deepEqual(l.ad, before.ad);
  assert.equal(l.presenceTier, "STARTER");
  assert.deepEqual(migratePresence(structuredClone(s)), s);
  sweep(s, now + 32 * 86400000);
  assert.equal(
    citySnapshot(s, true, now + 32 * 86400000).properties[0].building?.tier,
    "STARTER",
  );
});
