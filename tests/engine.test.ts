import test from "node:test";
import assert from "node:assert/strict";
import { makeSeed, emptyAd } from "../lib/seed";
import {
  reserve,
  fulfill,
  citySnapshot,
  sweep,
  placeBid,
  closeAuctions,
} from "../lib/engine";
import { adSchema } from "../lib/validation";
const now = Date.parse("2026-10-04T12:00:00Z");
const input = {
  propertyId: "building-1",
  email: "a@example.com",
  ad: { ...emptyAd, brand: "Test Brand" },
};
test("demo starts almost empty: 210 plots, 10 initial buildings and honest counters", () => {
  const s = makeSeed(true, now);
  const d = citySnapshot(s, true, now);
  assert.equal(d.properties.length, 210);
  assert.equal(d.districts.length, 7);
  assert.equal(d.stats.publicBuilt, 6);
  assert.equal(d.stats.privateBuilt, 4);
  assert.equal(d.stats.built, 10);
  assert.equal(d.stats.auctions, 3);
  assert.equal(d.stats.reserved, 5);
  assert.equal(
    d.stats.available +
      d.stats.privateBuilt +
      d.stats.publicBuilt +
      d.stats.auctions +
      d.stats.reserved,
    210,
  );
  assert.equal(d.stats.builtPercent, 5);
  // Only plots with a building are rendered as buildings.
  assert.equal(d.properties.filter((p) => p.building).length, 10);
  assert.equal(
    d.stats.builtToday,
    s.activity.filter((a) => a.createdAt.startsWith("2026-10-04")).length,
  );
  assert.ok(d.activity.every((a) => a.demo));
});
test("live seed never fabricates advertisers or purchases", () => {
  const d = citySnapshot(makeSeed(false, now), false, now);
  assert.equal(d.stats.privateBuilt, 0);
  assert.equal(d.stats.owners, 0);
  assert.equal(d.activity.length, 0);
  assert.equal(d.stats.publicBuilt, 6);
});
test("only one reservation can win, and expiry releases the plot", () => {
  const s = makeSeed(false, now);
  reserve(s, input, true, now);
  assert.throws(
    () => reserve(s, { ...input, email: "b@example.com" }, true, now),
    /construyendo/,
  );
  reserve(s, { ...input, email: "b@example.com" }, true, now + 301000);
  assert.equal(s.reservations.filter((r) => r.status === "reserved").length, 1);
});
test("payment is idempotent across duplicated webhook events", () => {
  const s = makeSeed(false, now);
  const { reservation: r } = reserve(s, input, false, now);
  fulfill(s, r.id, "cs_paid", r.amount, "stripe", now);
  fulfill(s, r.id, "cs_paid", r.amount, "stripe", now);
  fulfill(s, r.id, "cs_other_event", r.amount, "stripe", now);
  assert.equal(s.leases.length, 1);
  assert.equal(s.transactions.length, 1);
  assert.equal(s.activity.length, 1);
  assert.equal(
    s.buildings.filter((b) => b.propertyId === input.propertyId).length,
    1,
  );
  assert.throws(() => reserve(s, input, false, now), /ya ha construido/);
});
test("wrong amount and expired demo checkout cannot build", () => {
  const s = makeSeed(false, now);
  const { reservation: r } = reserve(s, input, true, now);
  assert.throws(() => fulfill(s, r.id, "demo", 1, "demo", now), /importe/);
  assert.throws(
    () => fulfill(s, r.id, "demo", r.amount, "demo", now + 301000),
    /caducado/,
  );
  assert.equal(s.leases.length, 0);
  assert.equal(
    s.buildings.some((b) => b.propertyId === input.propertyId),
    false,
  );
});
test("Stripe reservation remains locked until provider confirms expiry", () => {
  const s = makeSeed(false, now);
  const { reservation: r } = reserve(s, input, false, now);
  r.sessionId = "cs_pending";
  sweep(s, now + 3600000);
  assert.equal(r.status, "reserved");
  assert.throws(() => reserve(s, input, false, now + 3600000), /construyendo/);
  fulfill(s, r.id, "cs_pending", r.amount, "stripe", now + 3600000);
  assert.equal(s.leases.length, 1);
});
test("one-time payment: buildings never expire and cannot be renewed", () => {
  const s = makeSeed(false, now);
  const { reservation: r } = reserve(s, input, true, now);
  const l = fulfill(s, r.id, "t1", r.amount, "demo", now)!;
  assert.equal(l.expiresAt, undefined);
  const later = now + 400 * 86400000;
  sweep(s, later);
  assert.equal(l.status, "active");
  const p = citySnapshot(s, false, later).properties.find(
    (p) => p.id === l.propertyId,
  )!;
  assert.equal(p.status, "claimed");
  assert.equal(p.building?.tier, "STARTER");
  assert.equal(s.mail.filter((m) => m.id.startsWith("reminder")).length, 0);
  assert.throws(
    () => reserve(s, { ...input, renewalLeaseId: l.id }, true, now),
    /renovaciones/,
  );
});
test("bid increments, deadlines, demo settlement builds a skyscraper, live payment gating", () => {
  for (const demo of [true, false]) {
    const s = makeSeed(false, now);
    const a = s.auctions[0];
    placeBid(s, a.id, "a@example.com", a.startingBid, demo, now);
    assert.throws(
      () => placeBid(s, a.id, "b@example.com", a.startingBid, demo, now),
      /al menos/,
    );
    placeBid(s, a.id, "b@example.com", a.startingBid + a.increment, demo, now);
    assert.throws(
      () =>
        placeBid(s, a.id, "c@example.com", 300, demo, Date.parse(a.endsAt) + 1),
      /terminado/,
    );
    closeAuctions(s, demo, "https://skycity.test", Date.parse(a.endsAt) + 1);
    closeAuctions(s, demo, "https://skycity.test", Date.parse(a.endsAt) + 1);
    assert.equal(s.reservations.length, 1);
    assert.equal(s.leases.length, demo ? 1 : 0);
    assert.equal(a.winnerEmail, "b@example.com");
    assert.equal(a.status, demo ? "settled" : "awaiting_payment");
    const tower = s.buildings.find((b) => b.propertyId === a.propertyId);
    assert.equal(tower?.tier, demo ? "SKYSCRAPER" : undefined);
  }
});
test("ad validation rejects unsafe URLs and accepts legacy calls to action", () => {
  for (const website of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "ftp://site.test",
    "https://user:secret@site.test",
  ])
    assert.equal(adSchema.safeParse({ ...input.ad, website }).success, false);
  assert.equal(
    adSchema.safeParse({ ...input.ad, website: "https://example.com" }).success,
    true,
  );
  const legacy = adSchema.parse({ ...input.ad, cta: "Visit website" });
  assert.equal(legacy.cta, "Visitar web");
  assert.equal(adSchema.safeParse({ ...input.ad, cta: "Hack" }).success, false);
});
