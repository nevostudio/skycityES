import test from "node:test";
import assert from "node:assert/strict";
import { makeSeed } from "../lib/seed";
import { citySnapshot } from "../lib/engine";
import { AVENUE, SHOWCASE, showcaseZoom } from "../lib/showcase";

const now = Date.parse("2026-10-04T12:00:00Z");

test("demo anchors stand in the first line of the showcase avenue", () => {
  const city = citySnapshot(makeSeed(true, now), true, now);
  const downtown = city.properties.filter((p) => p.districtId === "downtown");
  const frontZ = Math.max(...downtown.map((p) => p.z));
  const brands = [
    "NevoStudio",
    "Pixel Coffee",
    "Moonlight Club",
    "Green Market",
  ];
  for (const brand of brands) {
    const p = city.properties.find((p) => p.ad?.brand === brand)!;
    assert.equal(p.z, frontZ, `${brand} faces the avenue`);
    assert.ok(p.x >= AVENUE.from && p.x <= AVENUE.to);
    assert.ok(AVENUE.z - p.z < 8);
  }
  // Heights step down towards the camera side so no building hides a neighbour's sign.
  const front = downtown
    .filter((p) => p.z === frontZ && p.building)
    .sort((a, b) => a.x - b.x);
  for (let i = 1; i < front.length; i++)
    assert.ok(front[i].height <= front[i - 1].height);
  // Free plots between brands invite a purchase in the first view.
  assert.ok(downtown.some((p) => p.z === frontZ && p.status === "available"));
});

test("the first view frames a district, not the whole map", () => {
  const zoom = showcaseZoom(1920, 1012);
  const width = 1920 / zoom;
  assert.ok(width > 50 && width < 70, `visible width ${width}`);
  assert.ok(showcaseZoom(390, 776) < zoom);
  const city = citySnapshot(makeSeed(true, now), true, now);
  // Roughly the plots within the visible footprint around the showcase target.
  const near = city.properties.filter(
    (p) => Math.hypot(p.x - SHOWCASE.x, p.z - SHOWCASE.z) < width / 2.6,
  );
  assert.ok(near.length >= 15 && near.length <= 25, `${near.length} plots`);
});
