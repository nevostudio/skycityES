import test from "node:test";
import assert from "node:assert/strict";
import { emptyAd } from "../lib/seed";
import { buildingHeight } from "../lib/presence";
import { massing, VARIANTS } from "../lib/massing";
import { brandPlan } from "../lib/brand-plan";
import {
  borrowsLogoColor,
  brandPalette,
  DEFAULT_BRAND_PRIMARY,
} from "../lib/brand-theme";
import { dominantColor } from "../lib/logo-info";
import type { BuildingTier } from "../types";

const tiers: BuildingTier[] = ["STARTER", "PLUS", "PRO", "PREMIUM", "LANDMARK"];

test("every silhouette stays inside its plot and reaches the tier height", () => {
  for (const tier of tiers)
    for (let model = 0; model < 3; model++) {
      const height = buildingHeight(tier, model);
      const archetypes = new Set<string>();
      for (let number = 0; number < VARIANTS[tier]; number++) {
        const m = massing({
          height,
          districtId: "downtown",
          number,
          building: { tier },
        });
        archetypes.add(m.archetype);
        assert.equal(m.top.y1, height, `${tier} v${m.variant} top`);
        for (const v of m.volumes) {
          assert.ok(v.y1 > v.y0, `${tier} v${m.variant} empty volume`);
          assert.ok(Math.abs(v.x) + v.w / 2 <= 0.5 + 1e-9, `${tier} x`);
          assert.ok(Math.abs(v.z) + v.d / 2 <= 0.5 + 1e-9, `${tier} z`);
        }
      }
      // No tier is a single repeated box.
      assert.ok(archetypes.size >= 3, `${tier}: ${[...archetypes]}`);
    }
});

test("branding grows by tier: STARTER one zone, LANDMARK every support", () => {
  const plan = (tier: BuildingTier, extra = {}) =>
    brandPlan({
      tier,
      variant: 0,
      roofless: false,
      hasImage: false,
      sideSupport: false,
      ...extra,
    });
  const starter = plan("STARTER");
  assert.equal(starter.rooftop, false);
  assert.equal(starter.side, null);
  assert.equal(starter.band, false);
  assert.ok(plan("PLUS").rooftop && plan("PLUS").baseAccent);
  assert.ok(
    plan("PRO").rooftop && !plan("PRO").side && plan("PRO").crownAccent,
  );
  const premium = [0, 1].map((variant) => plan("PREMIUM", { variant }));
  for (const p of premium) assert.ok(p.band || p.side, "PREMIUM second face");
  const landmark = plan("LANDMARK");
  assert.ok(landmark.rooftop && landmark.side && landmark.band);
  // Panels only grow with the tier.
  for (let i = 1; i < tiers.length; i++)
    assert.ok(plan(tiers[i]).front.cap > plan(tiers[i - 1]).front.cap);
  // Pitched roofs never carry a rooftop sign.
  assert.equal(plan("PRO", { roofless: true }).rooftop, false);
});

test("logos and images shape their panels", () => {
  const base = {
    tier: "PRO" as BuildingTier,
    variant: 0,
    roofless: false,
    sideSupport: false,
  };
  const wide = brandPlan({ ...base, hasImage: false, logoAspect: 3 });
  const square = brandPlan({ ...base, hasImage: false, logoAspect: 1 });
  assert.ok(
    wide.front.ratio < square.front.ratio * 0.6,
    "wide logo → wide, low panel",
  );
  assert.ok(square.front.ratio >= 0.9, "square logo → large square panel");
  const image = brandPlan({ ...base, hasImage: true });
  assert.equal(image.front.content, "image");
  assert.ok(image.front.ratio < 0.85, "promotional art stays landscape");
  const side = brandPlan({ ...base, hasImage: true, sideSupport: true });
  assert.equal(side.front.content, "logo");
  assert.equal(side.side?.content, "image");
});

test("white or default brands take their colour from the logo", () => {
  const ad = (primary: string, logo = "/logo.png") => ({
    ...emptyAd,
    brand: "Test",
    primary,
    logo,
  });
  assert.ok(borrowsLogoColor(ad("#ffffff")));
  assert.ok(borrowsLogoColor(ad(DEFAULT_BRAND_PRIMARY)));
  assert.ok(!borrowsLogoColor(ad("#1e6fd9")));
  assert.ok(!borrowsLogoColor(ad("#ffffff", "")));
  const blue = brandPalette(ad("#ffffff"), { color: "#1d4f9c", aspect: 3 });
  const white = brandPalette(ad("#ffffff"), null);
  assert.notEqual(blue.primary, white.primary);
  // A chosen colour wins over the logo.
  const chosen = brandPalette(ad("#1e6fd9"), { color: "#f5c400", aspect: 1 });
  assert.equal(chosen.primary, brandPalette(ad("#1e6fd9")).primary);
});

test("very dark brands keep visible frames and light glass", () => {
  const p = brandPalette({ ...emptyAd, brand: "Black", primary: "#000000" });
  const lum = (hex: string) => parseInt(hex.slice(1, 3), 16);
  assert.ok(lum(p.deep) > lum(p.primary), "frames lighter than the body");
  assert.equal(p.window, "#c3d3d4");
});

test("dominant logo colour ignores neutrals and monochrome logos", () => {
  const pixels = (...colors: [number, number, number, number][]) =>
    colors.flatMap((c) => c);
  const blueOnWhite = pixels(
    ...Array(30).fill([255, 255, 255, 255]),
    ...Array(20).fill([29, 79, 156, 255]),
  );
  const color = dominantColor(blueOnWhite)!;
  assert.ok(color, "blue found");
  assert.ok(parseInt(color.slice(5, 7), 16) > parseInt(color.slice(1, 3), 16));
  const black = pixels(...Array(50).fill([10, 10, 10, 255]));
  assert.equal(dominantColor(black), null);
  const transparent = pixels(...Array(50).fill([255, 0, 0, 0]));
  assert.equal(dominantColor(transparent), null);
});
