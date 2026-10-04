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
  days: 30,
  ad: { ...emptyAd, brand: "Test Brand" },
};
test("demo has 210 properties, seven districts and honest occupancy", () => {
  const s = makeSeed(true, now);
  const d = citySnapshot(s, true, now);
  assert.equal(d.properties.length, 210);
  assert.equal(d.districts.length, 7);
  assert.equal(d.stats.claimed, 16);
  assert.equal(d.stats.auctions, 3);
  assert.equal(
    d.stats.available + d.stats.claimed + d.stats.auctions + d.stats.reserved,
    210,
  );
  assert.equal(
    d.stats.claimsToday,
    s.activity.filter((a) => a.createdAt.startsWith("2026-10-04")).length,
  );
  assert.ok(d.activity.every((a) => a.demo));
});
test("live seed never fabricates advertisers or claims", () => {
  const d = citySnapshot(makeSeed(false, now), false, now);
  assert.equal(d.stats.claimed, 0);
  assert.equal(d.stats.advertisers, 0);
  assert.equal(d.activity.length, 0);
});
test("only one reservation can win, and expiry releases the property", () => {
  const s = makeSeed(false, now);
  reserve(s, input, true, now);
  assert.throws(
    () => reserve(s, { ...input, email: "b@example.com" }, true, now),
    /reserved/,
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
  assert.throws(() => reserve(s, input, false, now), /claimed/);
});
test("wrong amount and expired demo checkout cannot activate a lease", () => {
  const s = makeSeed(false, now);
  const { reservation: r } = reserve(s, input, true, now);
  assert.throws(() => fulfill(s, r.id, "demo", 1, "demo", now), /amount/);
  assert.throws(
    () => fulfill(s, r.id, "demo", r.amount, "demo", now + 301000),
    /expired/,
  );
  assert.equal(s.leases.length, 0);
});
test("Stripe reservation remains locked until provider confirms expiry", () => {
  const s = makeSeed(false, now);
  const { reservation: r } = reserve(s, input, false, now);
  r.sessionId = "cs_pending";
  sweep(s, now + 3600000);
  assert.equal(r.status, "reserved");
  assert.throws(() => reserve(s, input, false, now + 3600000), /reserved/);
  fulfill(s, r.id, "cs_pending", r.amount, "stripe", now + 3600000);
  assert.equal(s.leases.length, 1);
});
test("renewal extends from lease end and cannot change ownership", () => {
  const s = makeSeed(false, now);
  const { reservation: r } = reserve(s, input, true, now);
  const l = fulfill(s, r.id, "t1", r.amount, "demo", now)!;
  assert.throws(
    () =>
      reserve(
        s,
        { ...input, email: "attacker@example.com", renewalLeaseId: l.id },
        true,
        now,
      ),
    /renewed/,
  );
  const renewal = reserve(
    s,
    { ...input, renewalLeaseId: l.id },
    true,
    now + 1000,
  );
  fulfill(
    s,
    renewal.reservation.id,
    "t2",
    renewal.reservation.amount,
    "demo",
    now + 1000,
  );
  assert.equal(Date.parse(l.expiresAt), now + 60 * 86400000);
  assert.equal(s.leases.length, 1);
});
test("expired lease hides ad and returns to inventory; reminders deduplicate", () => {
  const s = makeSeed(false, now);
  const { reservation: r } = reserve(s, input, true, now);
  const l = fulfill(s, r.id, "t1", r.amount, "demo", now)!;
  sweep(s, now + 24 * 86400000);
  sweep(s, now + 24 * 86400000);
  assert.equal(s.mail.filter((m) => m.id.startsWith("reminder")).length, 1);
  sweep(s, Date.parse(l.expiresAt) + 1);
  const p = citySnapshot(s, false, Date.parse(l.expiresAt) + 1).properties.find(
    (p) => p.id === l.propertyId,
  )!;
  assert.equal(p.status, "available");
  assert.equal(p.ad, undefined);
});
test("bid increments, deadlines, demo settlement and live payment gating", () => {
  for (const demo of [true, false]) {
    const s = makeSeed(false, now);
    const a = s.auctions[0];
    placeBid(s, a.id, "a@example.com", a.startingBid, demo, now);
    assert.throws(
      () => placeBid(s, a.id, "b@example.com", a.startingBid, demo, now),
      /at least/,
    );
    placeBid(s, a.id, "b@example.com", a.startingBid + a.increment, demo, now);
    assert.throws(
      () =>
        placeBid(s, a.id, "c@example.com", 100, demo, Date.parse(a.endsAt) + 1),
      /ended/,
    );
    closeAuctions(s, demo, "https://skycity.test", Date.parse(a.endsAt) + 1);
    closeAuctions(s, demo, "https://skycity.test", Date.parse(a.endsAt) + 1);
    assert.equal(s.reservations.length, 1);
    assert.equal(s.leases.length, demo ? 1 : 0);
    assert.equal(a.winnerEmail, "b@example.com");
    assert.equal(a.status, demo ? "settled" : "awaiting_payment");
  }
});
test("ad validation rejects unsafe URLs and normalizes expected fields", () => {
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
});
