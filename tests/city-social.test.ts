import test from "node:test";
import assert from "node:assert/strict";
import { makeSeed, emptyAd } from "../lib/seed";
import { citySnapshot, reserve, fulfill, metric } from "../lib/engine";
import {
  rankBrands,
  latestPurchase,
  cityMetrics,
  brandWebsite,
} from "../lib/city-social";

test("ranking uses confirmed private ownership and current value, excludes civic/showcase/hidden brands", () => {
  const now = Date.now();
  const state = makeSeed(true, now);
  assert.deepEqual(rankBrands(citySnapshot(state, true, now).properties), []);
  const available = citySnapshot(state, true, now).properties.filter(
    (p) => p.status === "available" && p.inventory === "normal",
  );
  for (const [i, tier] of (["STARTER", "LANDMARK"] as const).entries()) {
    const r = reserve(
      state,
      {
        propertyId: available[i].id,
        email: "rank@example.com",
        presenceTier: tier,
        ad: { ...emptyAd, brand: `Brand ${i}` },
      },
      true,
      now,
    ).reservation;
    fulfill(state, r.id, `rank-${i}`, r.amount, "demo", now + i * 1000);
  }
  const data = citySnapshot(state, true, now + 4000);
  const ranked = rankBrands(data.properties);
  assert.deepEqual(
    ranked.map((e) => e.value),
    [60, 3],
  );
  assert.equal(latestPurchase(data.properties)?.property.id, available[1].id);
  ranked[1].property.current_property_value = 102;
  ranked[1].property.valueHistory!.push({
    kind: "takeover",
    amount: 102,
    at: new Date(now + 5000).toISOString(),
    brand: "New controller",
  });
  assert.equal(rankBrands(data.properties)[0].value, 102);
  assert.equal(latestPurchase(data.properties)?.payment.kind, "takeover");
  ranked[1].property.ad!.status = "suspended";
  assert.equal(rankBrands(data.properties).length, 1);
});

test("metrics count city visits only, label demo presence and never invent live visitors", () => {
  const state = makeSeed(false);
  metric(state, "city_impression");
  metric(state, "city_impression");
  metric(state, "property_open", state.properties[0].id);
  const live = citySnapshot(state, false);
  assert.equal(live.metrics?.totalVisits, 2);
  assert.equal(cityMetrics(live).online, null);
  assert.equal(cityMetrics({ ...live, demo: true }).onlineSource, "demo");
  assert.equal(
    cityMetrics({
      ...live,
      metrics: { totalVisits: 2, online: 7, onlineSource: "live" },
    }).online,
    7,
  );
});

test("ranking links reject unsafe URLs", () => {
  assert.equal(brandWebsite("javascript:alert(1)"), null);
  assert.equal(brandWebsite(""), null);
  assert.equal(brandWebsite("https://example.com"), "https://example.com/");
});
