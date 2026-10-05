import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { makeSeed, emptyAd } from "../lib/seed";
import { citySnapshot, fulfill, reserve, sweep } from "../lib/engine";
import { buildingFloors } from "../lib/presence";
import { migratePlots, PUBLIC_BUILDINGS } from "../lib/plots";
import type { Lease, State } from "../types";
import { withLegacyAuctions } from "./support";

const now = Date.parse("2026-10-04T12:00:00Z");
const plot = "building-42";
const input = {
  propertyId: plot,
  email: "builder@example.com",
  ad: { ...emptyAd, brand: "Solar Studio" },
};
const snap = (s: State, at = now) =>
  citySnapshot(s, true, at).properties.find((p) => p.id === plot)!;

/** A city as it was before phase 1: 30-day leases on generic buildings. */
function legacyState(): State {
  const s = withLegacyAuctions(makeSeed(false, now), now);
  delete (s as Partial<State>).buildings;
  // Recreate locations present in a pre-inventory-reduction database.
  const base = s.properties.find((p) => p.id === "building-1")!;
  for (const n of [3, 13, 39, 52, 65, 78, 104]) {
    if (s.properties.some((p) => p.number === n)) continue;
    const districtIndex = Math.floor((n - 1) / 30);
    const i = (n - 1) % 30;
    s.properties.push({
      ...structuredClone(base),
      id: `building-${n}`,
      number: n,
      districtId: s.districts[districtIndex].id,
      x: s.districts[districtIndex].x + ((i % 6) - 2.5) * 4.8,
      z: s.districts[districtIndex].z + (Math.floor(i / 6) - 2) * 5.3,
      enabled: true,
    });
  }
  const types = ["Shop", "Office", "Tower", "House"];
  for (const p of s.properties) {
    p.prices = { "30": p.inventory === "skyscraper" ? 200 : 3 };
    delete (p as Partial<typeof p>).price;
    if (p.inventory === "public") {
      p.inventory = "normal";
      delete p.description;
    }
    p.reservedForBrands = [32, 68].includes(p.number) || undefined;
    delete p.premiumNote;
    p.name =
      p.number === 14
        ? "Central Tower"
        : `${p.inventory === "skyscraper" ? "Tower" : types[p.number % 4]} #${String(p.number).padStart(3, "0")}`;
  }
  s.districts.find((d) => d.id === "downtown")!.name = "Downtown";
  s.districts.find((d) => d.id === "old-town")!.name = "Old Town";
  const lease = (id: string, n: number, extra: Partial<Lease> = {}): Lease => ({
    id,
    propertyId: `building-${n}`,
    email: "hello@skycity.demo",
    ad: {
      ...emptyAd,
      cta: "Visit website",
      brand: `Brand ${n}`,
      description:
        "An independent idea with a place in the city. This is a fictional demo advertiser.",
    },
    startsAt: new Date(now - 86400000).toISOString(),
    expiresAt: new Date(now + 29 * 86400000).toISOString(),
    status: "active",
    demo: true,
    autoRenew: false,
    transferable: false,
    presenceTier: "PLUS",
    upgradeHistory: [],
    ...extra,
  });
  s.leases = [13, 26, 39, 52, 65, 78, 91, 104].map((n) =>
    lease(`seed-lease-${n}`, n),
  );
  s.leases.push(
    lease("lease-customer", 121, {
      email: "customer@example.com",
      demo: false,
      presenceTier: "PRO",
      upgradeHistory: [
        {
          reservationId: "r-up",
          transactionId: "t-up",
          from: "STARTER",
          to: "PRO",
          amount: 12,
          createdAt: new Date(now - 3600000).toISOString(),
        },
      ],
    }),
    lease("lease-gone", 125, { email: "gone@example.com", status: "expired" }),
  );
  s.transactions = [
    {
      id: "t-1",
      reservationId: "r-1",
      amount: 3,
      email: "customer@example.com",
      createdAt: new Date(now - 7200000).toISOString(),
      provider: "stripe",
    },
  ];
  s.bids = [
    {
      id: "bid-1",
      auctionId: s.auctions[0].id,
      email: "bidder@example.com",
      amount: 200,
      createdAt: new Date(now).toISOString(),
    },
  ];
  s.analytics = [
    {
      id: "a-1",
      propertyId: "building-121",
      event: "property_open",
      day: "2026-10-03",
      count: 7,
    },
  ];
  s.settings[0].plotsVersion = undefined;
  s.settings[0].inventoryVersion = undefined;
  s.settings[0].durations = [30];
  return s as State;
}

test("CASE A · empty plot → STARTER 3 € → payment → the building appears", () => {
  const s = makeSeed(false, now);
  assert.equal(snap(s).building, null);
  assert.equal(snap(s).status, "available");
  const { reservation: r } = reserve(
    s,
    { ...input, presenceTier: "STARTER" },
    true,
    now,
  );
  assert.equal(r.amount, 3);
  // Paying is what builds: a reservation alone leaves the plot without building.
  assert.equal(snap(s).building, null);
  assert.equal(snap(s).status, "reserved");
  fulfill(s, r.id, "pay-a", 3, "demo", now);
  const p = snap(s);
  assert.equal(p.status, "claimed");
  assert.equal(p.building?.tier, "STARTER");
  assert.equal(p.building?.kind, "private");
  assert.equal(p.building?.state, "CONSTRUCTING");
  assert.ok(p.building!.floors >= 1 && p.building!.floors <= 2);
  assert.equal(snap(s, now + 5000).building?.state, "BUILT");
  assert.equal(p.ad?.brand, "Solar Studio");
});

test("CASE B · STARTER → PRO pays the 12 € difference and the building grows on the same plot", () => {
  const s = makeSeed(false, now);
  const r = reserve(s, input, true, now).reservation;
  const l = fulfill(s, r.id, "pay-b", 3, "demo", now)!;
  const before = snap(s, now + 5000);
  const up = reserve(
    s,
    { ...input, upgradeLeaseId: l.id, presenceTier: "PRO" },
    true,
    now + 5000,
  ).reservation;
  assert.equal(up.amount, 12);
  fulfill(s, up.id, "pay-b-up", 12, "demo", now + 5000);
  const after = snap(s, now + 5500);
  assert.equal(after.building?.tier, "PRO");
  assert.equal(after.building?.state, "CONSTRUCTING");
  assert.ok(after.building!.floors >= 3 && after.building!.floors <= 5);
  assert.ok(after.height > before.height);
  assert.deepEqual(
    [after.id, after.x, after.z, after.width, after.depth],
    [before.id, before.x, before.z, before.width, before.depth],
  );
  assert.equal(
    s.transactions.reduce((a, t) => a + t.amount, 0),
    15,
  );
});

test("CASE C · reload: buildings persist in storage and survive a restart", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "skycity-"));
  process.env.SKYCITY_DATA_DIR = dir;
  process.env.SKYCITY_MODE = "demo";
  const store = await import("../lib/store");
  const g = globalThis as unknown as {
    skySqlite?: {
      close(): void;
      prepare(sql: string): { run(...v: unknown[]): void };
    };
  };
  try {
    await store.transaction((s) => {
      const r = reserve(s, input, true).reservation;
      const l = fulfill(s, r.id, "pay-c", 3, "demo")!;
      const up = reserve(
        s,
        { ...input, upgradeLeaseId: l.id, presenceTier: "PRO" },
        true,
      ).reservation;
      fulfill(s, up.id, "pay-c-up", 12, "demo");
    });
    // Simulate a server restart: drop the cached connection and read from disk.
    g.skySqlite!.close();
    delete g.skySqlite;
    const reloaded = citySnapshot(await store.readState(), true);
    const p = reloaded.properties.find((p) => p.id === plot)!;
    assert.equal(p.building?.tier, "PRO");
    assert.equal(p.ad?.brand, "Solar Studio");
    assert.equal(
      reloaded.properties.filter((p) => p.building?.kind === "private").length,
      5,
    );
    // A legacy database is migrated once, on first read, and persisted.
    g.skySqlite!.prepare("UPDATE city_state SET data=? WHERE id=1").run(
      JSON.stringify(legacyState()),
    );
    g.skySqlite!.close();
    delete g.skySqlite;
    const migrated = await store.readState();
    assert.equal(migrated.settings[0].plotsVersion, 1);
    assert.equal(migrated.settings[0].inventoryVersion, 1);
    assert.equal(
      migrated.properties.find((p) => p.id === "building-3")?.enabled,
      false,
    );
    assert.equal(
      migrated.buildings.find((b) => b.leaseId === "lease-customer")?.tier,
      "PRO",
    );
  } finally {
    g.skySqlite?.close();
    delete g.skySqlite;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CASE D · plots without a buyer stay empty", () => {
  const s = makeSeed(false, now);
  const r = reserve(s, input, true, now).reservation;
  fulfill(s, r.id, "pay-d", 3, "demo", now);
  const later = now + 90 * 86400000;
  sweep(s, later);
  const city = citySnapshot(s, false, later);
  const empty = city.properties.filter(
    (p) => p.inventory === "normal" && p.id !== plot,
  );
  assert.ok(empty.length >= 70);
  assert.ok(
    empty.every((p) => p.building === null && p.status === "available"),
  );
  // An abandoned checkout never builds anything.
  const abandoned = reserve(
    s,
    { ...input, propertyId: "building-44" },
    true,
    later,
  );
  sweep(s, later + 3600000);
  assert.equal(abandoned.reservation.status, "expired");
  assert.equal(
    citySnapshot(s, false, later + 3600000).properties.find(
      (p) => p.id === "building-44",
    )?.building,
    null,
  );
});

test("public buildings belong to the city and cannot be bought", () => {
  const s = makeSeed(false, now);
  for (const def of PUBLIC_BUILDINGS) {
    const p = citySnapshot(s, false, now).properties.find(
      (p) => p.number === def.number,
    )!;
    assert.equal(p.status, "public");
    assert.equal(p.name, def.name);
    assert.equal(p.building?.tier, def.tier);
    assert.equal(p.building?.state, "BUILT");
    assert.throws(
      () => reserve(s, { ...input, propertyId: p.id }, true, now),
      /no está disponible/,
    );
  }
  assert.equal(buildingFloors("LANDMARK", 3), 11);
});

test("migration: claimed → built, available → empty, demo excess retired; nothing is lost", () => {
  const legacy = legacyState();
  const s = migratePlots(structuredClone(legacy));
  // Customers, payments, bids and analytics are untouched.
  assert.equal(s.leases.length, legacy.leases.length);
  assert.deepEqual(s.transactions, legacy.transactions);
  assert.deepEqual(s.bids, legacy.bids);
  assert.deepEqual(s.analytics, legacy.analytics);
  assert.deepEqual(s.auctions, legacy.auctions);
  const customer = s.leases.find((l) => l.id === "lease-customer")!;
  assert.equal(customer.status, "active");
  assert.equal(customer.expiresAt, undefined);
  assert.equal(
    customer.legacyExpiresAt,
    legacy.leases.find((l) => l.id === "lease-customer")!.expiresAt,
  );
  assert.equal(customer.ad.cta, "Visitar web");
  const b = s.buildings.find((b) => b.leaseId === "lease-customer")!;
  assert.equal(b.tier, "PRO");
  assert.equal(b.previousTier, "STARTER");
  assert.equal(b.builtAt, customer.startsAt);
  // Expired leases do not rebuild anything.
  assert.equal(
    s.buildings.some((b) => b.propertyId === "building-125"),
    false,
  );
  // Only the four fictional showcases stay standing.
  const seeds = s.leases.filter((l) => l.id.startsWith("seed-lease-"));
  assert.deepEqual(
    seeds.filter((l) => l.status === "active").map((l) => l.id),
    ["seed-lease-13", "seed-lease-26", "seed-lease-52", "seed-lease-65"],
  );
  assert.ok(
    seeds
      .filter((l) => l.status === "expired")
      .every((l) => l.retired && !s.buildings.some((b) => b.leaseId === l.id)),
  );
  assert.equal(s.buildings.filter((b) => b.kind === "public").length, 6);
  assert.equal(s.buildings.length, 6 + 4 + 1);
  const city = citySnapshot(s, true, now);
  const byId = (id: string) => city.properties.find((p) => p.id === id)!;
  assert.equal(byId("building-2").name, "Solar #002");
  assert.equal(byId("building-2").building, null);
  assert.equal(byId("building-14").name, "Torre Central");
  assert.equal(byId("building-50").name, "Torre #050");
  assert.equal(byId("building-50").status, "reserved");
  assert.equal(byId("building-50").premiumNote, "auction_soon");
  assert.equal(byId("building-14").status, "auction");
  assert.ok(s.properties.every((p) => p.prices === undefined && p.price > 0));
  assert.equal(s.districts.find((d) => d.id === "downtown")!.name, "Centro");
  assert.equal(
    s.districts.find((d) => d.id === "old-town")!.name,
    "Casco Antiguo",
  );
  const privatePlots = city.properties.filter((p) => p.inventory === "normal");
  const free = privatePlots.filter((p) => !p.building).length;
  assert.ok(free / privatePlots.length >= 0.9);
  // Versioned and idempotent.
  assert.deepEqual(migratePlots(structuredClone(s)), s);
});
