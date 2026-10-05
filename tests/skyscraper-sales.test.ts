import test from "node:test";
import assert from "node:assert/strict";
import { makeSeed, emptyAd } from "../lib/seed";
import {
  citySnapshot,
  fulfill,
  placeBid,
  reserve,
  reserveTakeover,
} from "../lib/engine";
import { migrateSkyscraperSales } from "../lib/skyscraper-sales";
import { withLegacyAuctions } from "./support";

const now = Date.parse("2026-10-05T12:00:00Z");
const day = 86400000;
const ad = { ...emptyAd, brand: "Torre Test", website: "https://example.com" };

test("retiring auctions closes live ones, tells bidders once and opens every skyscraper", () => {
  const s = withLegacyAuctions(makeSeed(false, now), now);
  delete s.settings[0].skyscraperSalesVersion;
  const [live, other, awaiting] = s.auctions;
  placeBid(s, live.id, "bidder@example.com", 200, false, now);
  placeBid(s, live.id, "rival@example.com", 205, false, now);
  awaiting.status = "awaiting_payment";
  const held = s.properties.find((p) => p.id === awaiting.propertyId)!;
  const mails = s.mail.length;
  migrateSkyscraperSales(s);
  assert.equal(live.status, "closed");
  assert.equal(other.status, "closed");
  // A winner already invited to pay keeps their chance to complete it.
  assert.equal(awaiting.status, "awaiting_payment");
  assert.equal(held.sale, "auction");
  const notices = s.mail.slice(mails);
  assert.deepEqual(notices.map((m) => m.email).sort(), [
    "bidder@example.com",
    "rival@example.com",
  ]);
  for (const p of s.properties.filter(
    (p) => p.inventory === "skyscraper" && p.id !== held.id,
  )) {
    assert.equal(p.sale, "rental");
    assert.equal(p.reservedForBrands, false);
    assert.equal(p.takeover_enabled, true);
  }
  // Versioned: a second run changes nothing.
  const before = JSON.stringify(s);
  migrateSkyscraperSales(s);
  assert.equal(JSON.stringify(s), before);
});

test("a skyscraper is bought at its fixed price and can then be taken over", () => {
  const s = makeSeed(false, now);
  const plot = s.properties.find((p) => p.number === 50)!;
  const { reservation } = reserve(
    s,
    { propertyId: plot.id, email: "first@example.com", ad },
    true,
    now,
  );
  assert.equal(reservation.amount, 200);
  fulfill(s, reservation.id, "sky-1", 200, "demo", now);
  const after = now + day + 1;
  const tower = citySnapshot(s, true, after).properties.find(
    (p) => p.id === plot.id,
  )!;
  assert.equal(tower.building?.tier, "SKYSCRAPER");
  assert.equal(tower.takeover?.open, true);
  assert.equal(tower.takeover?.minimumOffer, 201);
  const t = reserveTakeover(
    s,
    {
      propertyId: plot.id,
      email: "second@example.com",
      ad: { ...ad, brand: "Nueva Torre" },
      offerAmount: 201,
    },
    true,
    after,
  ).reservation;
  fulfill(s, t.id, "sky-2", 201, "demo", after);
  const taken = citySnapshot(s, true, after).properties.find(
    (p) => p.id === plot.id,
  )!;
  assert.equal(taken.ad?.brand, "Nueva Torre");
  assert.equal(taken.building?.tier, "SKYSCRAPER");
});
