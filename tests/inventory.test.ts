import test from "node:test";
import assert from "node:assert/strict";
import { makeSeed, emptyAd } from "../lib/seed";
import { citySnapshot } from "../lib/engine";
import {
  INITIAL_NORMAL_PLOTS,
  activeInventoryByDistrict,
  migrateInventory,
} from "../lib/inventory";
import { makeBuilding } from "../lib/plots";

const now = Date.parse("2026-10-04T12:00:00Z");

test("launch inventory has 80 normal/public locations plus 8 premium plots", () => {
  const s = makeSeed(true, now);
  const city = citySnapshot(s, true, now);
  assert.equal(s.properties.length, 88);
  assert.equal(city.stats.plots, 88);
  assert.equal(
    s.properties.filter((p) => p.inventory === "skyscraper").length,
    8,
  );
  assert.equal(
    s.properties.filter((p) => p.inventory !== "skyscraper").length,
    80,
  );
  assert.deepEqual(
    activeInventoryByDistrict(s.properties),
    Object.fromEntries(
      Object.entries(INITIAL_NORMAL_PLOTS).map(([district, plots]) => [
        district,
        plots.length,
      ]),
    ),
  );
  assert.equal(city.stats.available, 70);
  assert.equal(city.stats.built, 10);
  assert.equal(city.stats.builtPercent, 11);
});

test("inventory migration only retires untouched redundant plots and never deletes records", () => {
  const s = makeSeed(false, now);
  s.settings[0].inventoryVersion = undefined;
  const source = s.properties.find((p) => p.number === 1)!;
  const add = (number: number) => {
    const p = {
      ...structuredClone(source),
      id: `building-${number}`,
      number,
      name: `Solar #${String(number).padStart(3, "0")}`,
      enabled: true,
    };
    s.properties.push(p);
    return p;
  };
  const untouched = add(3);
  const occupied = add(5);
  const paid = add(6);
  const analyzed = add(8);
  const active = add(10);
  const auctioned = add(11);
  s.leases.push({
    id: "protected-lease",
    propertyId: occupied.id,
    email: "owner@example.com",
    ad: { ...emptyAd, brand: "Marca real" },
    startsAt: new Date(now).toISOString(),
    status: "active",
    demo: false,
    autoRenew: false,
    transferable: false,
    presenceTier: "PRO",
    upgradeHistory: [],
  });
  s.buildings.push(
    makeBuilding(occupied, "PRO", new Date(now).toISOString(), {
      leaseId: "protected-lease",
    }),
  );
  s.reservations.push({
    id: "paid-reservation",
    propertyId: paid.id,
    email: "buyer@example.com",
    ad: { ...emptyAd, brand: "Pago histórico" },
    days: 0,
    amount: 3,
    expiresAt: new Date(now).toISOString(),
    status: "paid",
    presenceTier: "STARTER",
    accessHash: "hash",
  });
  s.transactions.push({
    id: "protected-transaction",
    reservationId: "paid-reservation",
    amount: 3,
    email: "buyer@example.com",
    createdAt: new Date(now).toISOString(),
    provider: "stripe",
  });
  s.analytics.push({
    id: "protected-analytics",
    propertyId: analyzed.id,
    event: "property_open",
    day: "2026-10-04",
    count: 1,
  });
  s.activity.push({
    id: "protected-activity",
    propertyId: active.id,
    brand: "Marca histórica",
    action: "claimed",
    createdAt: new Date(now).toISOString(),
    demo: false,
  });
  s.auctions.push({
    id: "protected-auction",
    propertyId: auctioned.id,
    endsAt: new Date(now + 86400000).toISOString(),
    startingBid: 200,
    increment: 5,
    status: "live",
  });
  s.bids.push({
    id: "protected-bid",
    auctionId: "protected-auction",
    email: "bidder@example.com",
    amount: 200,
    createdAt: new Date(now).toISOString(),
  });
  const before = structuredClone(s);
  migrateInventory(s);
  assert.equal(s.properties.length, before.properties.length);
  assert.equal(untouched.enabled, false);
  assert.equal(occupied.enabled, true);
  assert.equal(paid.enabled, true);
  assert.equal(analyzed.enabled, true);
  assert.equal(active.enabled, true);
  assert.equal(auctioned.enabled, true);
  assert.deepEqual(s.leases, before.leases);
  assert.deepEqual(s.buildings, before.buildings);
  assert.deepEqual(s.reservations, before.reservations);
  assert.deepEqual(s.auctions, before.auctions);
  assert.deepEqual(s.bids, before.bids);
  assert.deepEqual(s.activity, before.activity);
  assert.deepEqual(s.transactions, before.transactions);
  assert.deepEqual(s.analytics, before.analytics);
  assert.deepEqual(migrateInventory(structuredClone(s)), s);
});

test("the inventory is a launch plan, not a permanent cap", () => {
  const s = makeSeed(false, now);
  const extra = {
    ...structuredClone(s.properties[0]),
    id: "future-plot",
    number: 901,
    districtId: "riverside",
    name: "Ampliación Ribera #901",
    x: 43,
    z: 33,
    enabled: true,
  };
  s.properties.push(extra);
  assert.equal(
    citySnapshot(s, false, now).properties.some((p) => p.id === extra.id),
    true,
  );
  assert.equal(citySnapshot(s, false, now).stats.plots, 89);
});
