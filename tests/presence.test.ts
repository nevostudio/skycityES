import test from "node:test";
import assert from "node:assert/strict";
import { makeSeed, emptyAd } from "../lib/seed";
import { citySnapshot, fulfill, reserve, sweep } from "../lib/engine";
import {
  PRESENCE,
  PRESENCE_TIERS,
  migratePresence,
  visualProperty,
} from "../lib/presence";
import { assignSkyscraper } from "../lib/admin-inventory";

const now = Date.parse("2026-10-04T12:00:00Z");
const input = {
  propertyId: "building-1",
  email: "owner@example.com",
  days: 30,
  ad: { ...emptyAd, brand: "Presence Test" },
};
function owned() {
  const s = makeSeed(false, now);
  const { reservation: r } = reserve(s, input, true, now);
  const l = fulfill(s, r.id, "initial-payment", r.amount, "demo", now)!;
  return { s, l };
}
test("every normal location starts at €3; all five tiers are priced on the server", () => {
  const s = makeSeed(false, now);
  assert.ok(
    s.properties
      .filter((p) => p.inventory !== "skyscraper")
      .every((p) => p.prices["30"] === 3),
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
    const l = fulfill(s, r.id, tier, r.amount, "demo", now)!;
    assert.equal(l.presenceTier, tier);
  }
  assert.throws(() => reserve(s, { ...input, days: 7 }, true, now), /duration/);
});
test("Starter → Pro costs €12, updates only after payment, preserves location, ad and term, and persists one history entry", () => {
  const { s, l } = owned();
  const expiry = l.expiresAt,
    ad = structuredClone(l.ad);
  const before = citySnapshot(s, true, now).properties[0];
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
  assert.equal(citySnapshot(s, true, now).properties[0].height, before.height);
  assert.throws(() => fulfill(s, r.id, "wrong", 15, "demo", now), /amount/);
  assert.equal(l.upgradeHistory?.length, 0);
  fulfill(s, r.id, "upgrade-payment", 12, "demo", now);
  fulfill(s, r.id, "upgrade-payment", 12, "demo", now);
  fulfill(s, r.id, "retry-event", 12, "demo", now);
  assert.equal(l.presenceTier, "PRO");
  assert.equal(l.expiresAt, expiry);
  assert.deepEqual(l.ad, ad);
  assert.equal(l.upgradeHistory?.length, 1);
  assert.equal(l.upgradeHistory![0].amount, 12);
  const after = citySnapshot(s, true, now).properties[0];
  assert.ok(after.height > before.height);
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
  assert.equal(
    JSON.parse(JSON.stringify(s)).leases[0].upgradeHistory[0].to,
    "PRO",
  );
});
test("upgrades reject non-owners, downgrades, parallel reservations, stale state and expired checkouts", () => {
  const { s, l } = owned();
  const upgrade = {
    ...input,
    upgradeLeaseId: l.id,
    presenceTier: "PRO" as const,
  };
  assert.throws(
    () => reserve(s, { ...upgrade, email: "stranger@example.com" }, true, now),
    /owner/,
  );
  assert.throws(
    () => reserve(s, { ...upgrade, presenceTier: "STARTER" }, true, now),
    /higher/,
  );
  const r = reserve(s, upgrade, true, now).reservation;
  assert.throws(
    () => reserve(s, { ...upgrade, presenceTier: "LANDMARK" }, true, now),
    /reserved/,
  );
  assert.throws(
    () => reserve(s, { ...input, renewalLeaseId: l.id }, true, now),
    /reserved/,
  );
  assert.throws(
    () => fulfill(s, r.id, "late", 12, "demo", now + 301000),
    /expired/,
  );
  l.presenceTier = "PLUS";
  assert.throws(
    () => fulfill(s, r.id, "stale", 12, "demo", now),
    /no longer matches/,
  );
  assert.equal(l.upgradeHistory?.length, 0);
});
test("sequential upgrades charge only remaining differences; renewal retains the purchased tier", () => {
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
  const r = reserve(
    s,
    { ...input, renewalLeaseId: l.id, presenceTier: "STARTER" },
    true,
    now,
  ).reservation;
  assert.equal(r.amount, 60);
  fulfill(s, r.id, "renew", 60, "demo", now);
  assert.equal(l.presenceTier, "LANDMARK");
  assert.equal(Date.parse(l.expiresAt), now + 60 * 86400000);
});
test("tier variants keep the same footprint and a clear height hierarchy below skyscrapers", () => {
  const s = makeSeed(false, now);
  for (const p of s.properties.filter((p) => p.inventory !== "skyscraper")) {
    let height = 0;
    for (const tier of PRESENCE_TIERS) {
      const v = visualProperty(p, tier);
      assert.ok(v.height > height && v.height <= 14);
      assert.equal(v.width, p.width);
      assert.equal(v.depth, p.depth);
      assert.equal(v.x, p.x);
      assert.equal(v.z, p.z);
      assert.deepEqual(visualProperty(v, tier), v);
      height = v.height;
    }
  }
});
test("eight exclusive skyscrapers, two reserved; hold cannot be bypassed and available price is €200", () => {
  const s = makeSeed(false, now);
  const major = s.properties.filter((p) => p.inventory === "skyscraper");
  assert.equal(major.length, 8);
  assert.equal(major.filter((p) => p.reservedForBrands).length, 2);
  assert.ok(
    major.every(
      (p) =>
        citySnapshot(s, true, now).properties.find((v) => v.id === p.id)!
          .height >= 25,
    ),
  );
  assert.throws(
    () => reserve(s, { ...input, propertyId: "building-32" }, true, now),
    /not available/,
  );
  const r = reserve(
    s,
    { ...input, propertyId: "building-50", presenceTier: "STARTER" },
    true,
    now,
  ).reservation;
  assert.equal(r.amount, 200);
  const l = fulfill(s, r.id, "sky-paid", 200, "demo", now)!;
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
    /exclusive/,
  );
});
test("manual skyscraper assignments are recorded separately from payments and protect occupied inventory", () => {
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
  assert.equal(
    citySnapshot(s, true, now).properties.find((p) => p.id === l.propertyId)?.ad
      ?.brand,
    input.ad.brand,
  );
  assert.throws(
    () =>
      assignSkyscraper(
        s,
        { ...input, propertyId: l.propertyId },
        "admin@example.com",
        true,
        now,
      ),
    /occupied/,
  );
  assert.throws(
    () => assignSkyscraper(s, input, "admin@example.com", true, now),
    /skyscraper/,
  );
});
test("additive migration preserves customer data, pending checkout amounts and auction bids", () => {
  const { s, l } = owned();
  s.settings[0].pricingVersion = undefined;
  l.presenceTier = undefined;
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
  assert.equal(l.expiresAt, before.expiresAt);
  assert.equal(l.presenceTier, "STARTER");
  assert.deepEqual(migratePresence(structuredClone(s)), s);
  sweep(s, now + 32 * 86400000);
  assert.equal(
    citySnapshot(s, true, now + 32 * 86400000).properties[0].presenceTier,
    "STARTER",
  );
});
