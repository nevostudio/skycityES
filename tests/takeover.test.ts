import test from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { makeSeed, emptyAd } from "../lib/seed";
import { reserve, reserveTakeover, fulfill, citySnapshot } from "../lib/engine";
import { migrateTakeovers, takeoverState } from "../lib/takeover-policy";
import {
  settleStripeSession,
  type PaidSession,
} from "../lib/stripe/settlement";
import { ensureRefund } from "../lib/stripe/refunds";
import type { Reservation } from "../types";

const now = Date.parse("2026-10-05T12:00:00Z");
const day = 86400000;
const propertyId = "building-42";
const ad = { ...emptyAd, brand: "Primera marca" };
function claimed() {
  const s = makeSeed(false, now);
  const r = reserve(
    s,
    { propertyId, email: "a@example.com", ad },
    true,
    now,
  ).reservation;
  const owner = fulfill(s, r.id, "claim", 3, "demo", now)!;
  const p = s.properties.find((p) => p.id === propertyId)!;
  return { s, p, owner };
}
function session(r: Reservation, amount = r.amount, overrides = {}) {
  return {
    id: `cs_${r.id}`,
    mode: "payment",
    payment_status: "paid",
    currency: "eur",
    amount_total: Math.round(amount * 100),
    payment_intent: `pi_${r.id}`,
    metadata: {
      reservation_id: r.id,
      property_id: r.propertyId,
      purpose: "takeover",
    },
    ...overrides,
  } as PaidSession;
}

test("A–D: free offers 3 → 5 → 102; 101 rejected, 103 accepted; tier, building and footprint preserved", () => {
  const { s, p, owner } = claimed();
  assert.equal(p.current_property_value, 3);
  assert.equal(Date.parse(p.protection_until!), now + day);
  const upgrade = reserve(
    s,
    {
      propertyId,
      email: owner.email,
      ad,
      upgradeLeaseId: owner.id,
      presenceTier: "PRO",
    },
    true,
    now + 1000,
  ).reservation;
  fulfill(s, upgrade.id, "upgrade", 12, "demo", now + 2000);
  assert.equal(p.current_property_value, 3);
  const b = structuredClone(
    s.buildings.find((b) => b.propertyId === propertyId)!,
  );
  const shape = [p.x, p.z, p.width, p.depth];
  let at = now + day;
  for (const [email, amount] of [
    ["b@example.com", 5],
    ["c@example.com", 102],
    ["d@example.com", 103],
  ] as const) {
    if (amount === 103)
      assert.throws(
        () =>
          reserveTakeover(
            s,
            { propertyId, email, ad, offerAmount: 101 },
            true,
            at,
          ),
        /mínimo/,
      );
    const r = reserveTakeover(
      s,
      { propertyId, email, ad: { ...ad, brand: email }, offerAmount: amount },
      true,
      at,
    ).reservation;
    const l = fulfill(s, r.id, `pay-${amount}`, amount, "demo", at)!;
    assert.equal(l.email, email);
    assert.equal(p.current_property_value, amount);
    assert.equal(p.last_takeover_amount, amount);
    assert.equal(Date.parse(p.protection_until!), at + day);
    const current = s.buildings.find((v) => v.propertyId === propertyId)!;
    assert.deepEqual({ ...current, leaseId: b.leaseId }, b);
    assert.equal(l.presenceTier, "PRO");
    assert.deepEqual([p.x, p.z, p.width, p.depth], shape);
    assert.equal(
      s.leases.filter(
        (l) => l.propertyId === propertyId && l.status === "active",
      ).length,
      1,
    );
    at += day;
  }
  assert.equal(p.takeover_count, 3);
  assert.equal(owner.status, "expired");
  assert.equal(
    s.transactions.reduce((n, t) => n + t.amount, 0),
    225,
  );
  assert.ok(
    s.mail.some(
      (m) =>
        m.email === owner.email &&
        m.subject === "Tu edificio de SkyCity ha cambiado de manos." &&
        m.text.includes("Nuevo valor: 5 €"),
    ),
  );
});

test("E: two paid contenders; higher payment wins first, delayed webhook cannot overwrite it; refund is durable and idempotent", () => {
  const { s, p } = claimed();
  p.current_property_value = 102;
  const at = now + day;
  const a = reserveTakeover(
    s,
    { propertyId, email: "a2@example.com", ad, offerAmount: 103 },
    false,
    at,
  ).reservation;
  const b = reserveTakeover(
    s,
    { propertyId, email: "b2@example.com", ad, offerAmount: 120 },
    false,
    at,
  ).reservation;
  const winner = settleStripeSession(s, session(b), at)!;
  assert.equal(settleStripeSession(s, session(a), at + 1000), undefined);
  assert.equal(p.current_property_value, 120);
  assert.equal(p.takeover_count, 1);
  assert.equal(
    s.buildings.find((v) => v.propertyId === propertyId)?.leaseId,
    winner.id,
  );
  assert.equal(a.status, "conflict");
  assert.equal(
    s.propertyTakeovers.find((t) => t.reservation_id === a.id)?.status,
    "refund_pending",
  );
  const snapshot = structuredClone(s);
  settleStripeSession(s, session(a), at + 2000);
  settleStripeSession(s, session(b), at + 2000);
  assert.deepEqual(s, snapshot);
});

test("F/G: protection, public/admin, reserved, skyscrapers and disabled controls fail closed", () => {
  const { s, p } = claimed();
  const input = { propertyId, email: "b@example.com", ad, offerAmount: 5 };
  assert.throws(
    () => reserveTakeover(s, input, true, now + day - 1),
    /PROTEGIDO/,
  );
  // Public buildings never change hands (skyscrapers do, like normal plots).
  p.inventory = "public";
  assert.throws(() => reserveTakeover(s, input, true, now + day), /disponible/);
  p.inventory = "normal";
  for (const flag of ["reservedForBrands", "takeover_blocked"] as const) {
    p[flag] = true;
    assert.throws(
      () => reserveTakeover(s, input, true, now + day),
      /disponible/,
    );
    p[flag] = false;
  }
  p.takeover_enabled = false;
  assert.throws(() => reserveTakeover(s, input, true, now + day), /disponible/);
  p.takeover_enabled = true;
  s.settings[0].takeoverEnabled = false;
  assert.throws(() => reserveTakeover(s, input, true, now + day), /disponible/);
});

test("webhook revalidates value, control version, protection, global/property switches, inventory and amount", () => {
  for (const change of [
    "value",
    "version",
    "protection",
    "global",
    "enabled",
    "blocked",
    "inventory",
    "amount",
  ] as const) {
    const { s, p } = claimed();
    const at = now + day;
    const r = reserveTakeover(
      s,
      { propertyId, email: "b@example.com", ad, offerAmount: 5 },
      false,
      at,
    ).reservation;
    if (change === "value") p.current_property_value = 4;
    if (change === "version") p.control_version!++;
    if (change === "protection")
      p.protection_until = new Date(at + day).toISOString();
    if (change === "global") s.settings[0].takeoverEnabled = false;
    if (change === "enabled") p.takeover_enabled = false;
    if (change === "blocked") p.takeover_blocked = true;
    if (change === "inventory") p.inventory = "public";
    settleStripeSession(s, session(r, change === "amount" ? 6 : 5), at);
    assert.equal(s.propertyTakeovers[0].status, "refund_pending", change);
    assert.equal(
      s.leases.find(
        (l) => l.propertyId === propertyId && l.status === "active",
      )!.email,
      "a@example.com",
      change,
    );
  }
});

test("verified Stripe settlement rejects unpaid, wrong currency, wrong session and metadata; signature tampering fails", () => {
  const { s } = claimed();
  const r = reserveTakeover(
    s,
    { propertyId, email: "b@example.com", ad, offerAmount: 5 },
    false,
    now + day,
  ).reservation;
  const before = structuredClone(s);
  settleStripeSession(
    s,
    session(r, 5, { payment_status: "unpaid" }),
    now + day,
  );
  assert.deepEqual(s, before);
  assert.throws(
    () => settleStripeSession(s, session(r, 5, { currency: "usd" }), now + day),
    /Moneda/,
  );
  assert.throws(
    () =>
      settleStripeSession(
        s,
        session(r, 5, {
          metadata: { reservation_id: r.id, property_id: "other" },
        }),
        now + day,
      ),
    /Metadatos/,
  );
  r.sessionId = "cs_expected";
  assert.throws(
    () => settleStripeSession(s, session(r), now + day),
    /Metadatos/,
  );
  const stripe = new Stripe("sk_test_fake_for_local_unit_test");
  const payload = JSON.stringify({
    id: "evt_test",
    type: "checkout.session.completed",
    data: { object: session(r) },
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: "unit-secret",
  });
  assert.equal(
    stripe.webhooks.constructEvent(payload, signature, "unit-secret").id,
    "evt_test",
  );
  assert.throws(() =>
    stripe.webhooks.constructEvent(payload + " ", signature, "unit-secret"),
  );
});

test("migration uses acquisition payment, excludes upgrades, does not fabricate manual/demo values, and is idempotent", () => {
  const { s, p, owner } = claimed();
  const r = reserve(
    s,
    {
      propertyId,
      email: owner.email,
      ad,
      upgradeLeaseId: owner.id,
      presenceTier: "LANDMARK",
    },
    true,
    now + 100,
  ).reservation;
  fulfill(s, r.id, "up", 57, "demo", now + 200);
  delete p.current_property_value;
  delete s.settings[0].takeoverVersion;
  migrateTakeovers(s);
  assert.equal(p.current_property_value, 3);
  assert.equal(
    s.properties.find((v) => v.number === 4)?.current_property_value,
    0,
  );
  assert.deepEqual(migrateTakeovers(structuredClone(s)), s);
  assert.equal(takeoverState(s, p, now + day).minimumOffer, 4);
  assert.equal(
    citySnapshot(s, true, now + day).properties.find((v) => v.id === p.id)
      ?.takeover?.open,
    true,
  );
});

test("minimum increment, cent precision, self-takeover and blocked upgrade checkout are enforced server-side", () => {
  const { s, p, owner } = claimed();
  const at = now + day;
  s.settings[0].takeoverMinimumIncrement = 5;
  for (const offerAmount of [4, NaN, Infinity, 8.001, -1])
    assert.throws(() =>
      reserveTakeover(
        s,
        { propertyId, email: "b@example.com", ad, offerAmount },
        true,
        at,
      ),
    );
  assert.throws(
    () =>
      reserveTakeover(
        s,
        { propertyId, email: owner.email, ad, offerAmount: 8 },
        true,
        at,
      ),
    /Ya controlas/,
  );
  reserve(
    s,
    {
      propertyId,
      email: owner.email,
      ad,
      upgradeLeaseId: owner.id,
      presenceTier: "PRO",
    },
    true,
    at,
  );
  assert.throws(
    () =>
      reserveTakeover(
        s,
        { propertyId, email: "b@example.com", ad, offerAmount: 8 },
        true,
        at,
      ),
    /operación/,
  );
  assert.equal(p.current_property_value, 3);
});

test("refund recovery uses Stripe metadata and stored refund ID, creates once with stable idempotency key", async () => {
  let created = 0;
  let saved: { id: string; metadata: Record<string, string> } | undefined;
  const client = {
    refunds: {
      list: () =>
        (async function* () {
          if (saved) yield saved;
        })(),
      retrieve: async (id: string) => ({ ...saved, id }),
      create: async (
        params: {
          amount: number;
          payment_intent: string;
          metadata: Record<string, string>;
        },
        options: { idempotencyKey: string },
      ) => {
        created++;
        assert.equal(params.amount, 10300);
        assert.equal(params.payment_intent, "pi_loser");
        assert.equal(options.idempotencyKey, "takeover-refund-r1");
        return (saved = { id: "re_1", metadata: params.metadata });
      },
    },
  } as unknown as Stripe;
  assert.equal((await ensureRefund(client, "pi_loser", "r1", 103)).id, "re_1");
  assert.equal((await ensureRefund(client, "pi_loser", "r1", 103)).id, "re_1");
  assert.equal(
    (await ensureRefund(client, "pi_loser", "r1", 103, "re_1")).id,
    "re_1",
  );
  assert.equal(created, 1);
});

test("locations without a recorded payment cannot be taken over for less than building on an empty plot", () => {
  const s = makeSeed(true, now);
  const demo = s.properties.find((p) =>
    s.leases.some((l) => l.propertyId === p.id && l.status === "active"),
  )!;
  demo.protection_until = undefined;
  assert.equal(demo.current_property_value, 0);
  const policy = takeoverState(s, demo, now);
  assert.equal(policy.open, true);
  assert.equal(policy.minimumOffer, demo.price);
  const input = {
    propertyId: demo.id,
    email: "bargain@example.com",
    ad: { ...emptyAd, brand: "Bargain" },
  };
  assert.throws(
    () => reserveTakeover(s, { ...input, offerAmount: 1 }, true, now),
    /mínimo/,
  );
  const ok = reserveTakeover(s, { ...input, offerAmount: 3 }, true, now);
  assert.equal(ok.reservation.amount, 3);
});
