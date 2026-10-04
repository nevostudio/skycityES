import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { makeSeed, emptyAd } from "../lib/seed";
import { citySnapshot, fulfill, reserve } from "../lib/engine";
import { PRESENCE_TIERS } from "../lib/presence";
import {
  ROOFTOP_SIGN,
  SIGN_YAW,
  SIGN_ROOF_RATIO,
  effectiveSupport,
  signLimits,
  signSize,
  supportAllowed,
} from "../lib/branding";
import { contrastInk, signColors } from "../lib/brand-theme";
import { migrateBranding, NEVOSTUDIO_BRANDING } from "../lib/plots";
import { adSchema } from "../lib/validation";
import { normalizeImage } from "../lib/images";
import type { BuildingTier } from "../types";

const now = Date.parse("2026-10-04T12:00:00Z");
const png = (
  width: number,
  height: number,
  alpha = 1,
  format: "png" | "jpeg" | "webp" = "png",
) =>
  sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 75, b: 0, alpha },
    },
  })
    [format]()
    .toBuffer();

test("rooftop signs grow with the tier: STARTER < PLUS < PRO < PREMIUM < LANDMARK (lit)", () => {
  const tiers: BuildingTier[] = [...PRESENCE_TIERS, "SKYSCRAPER"];
  for (let i = 1; i < tiers.length; i++) {
    const a = signSize(tiers[i - 1], 3.3),
      b = signSize(tiers[i], 3.3);
    assert.ok(b.width > a.width, `${tiers[i]} wider than ${tiers[i - 1]}`);
    assert.ok(b.height > a.height);
  }
  assert.equal(ROOFTOP_SIGN.LANDMARK.lit, true);
  assert.equal(ROOFTOP_SIGN.PRO.lit, false);
  // Never much wider than the roof it stands on.
  assert.ok(signSize("LANDMARK", 2.7).width <= 2.7 * SIGN_ROOF_RATIO + 1e-9);
});

test("signs never overlap their neighbours: each one keeps to half the gap", () => {
  const s = makeSeed(true, now);
  const built = citySnapshot(s, true, now).properties.filter((p) => p.building);
  // Two buildings squeezed side by side by City Hall.
  built.push(
    { ...built[0], id: "a", x: 100, z: 100 },
    { ...built[0], id: "b", x: 102.6, z: 100 },
  );
  const limits = signLimits(built);
  const across = Math.cos(SIGN_YAW);
  assert.ok(limits.a * across <= 2.3 && limits.b * across <= 2.3);
  const wa = signSize("LANDMARK", 3.3, limits.a).width,
    wb = signSize("LANDMARK", 3.3, limits.b).width;
  // Signs are turned towards the viewpoint: compare their footprint across the row.
  assert.ok((wa / 2 + wb / 2) * Math.cos(SIGN_YAW) < 2.6);
  // On the regular grid (4.8 apart) even LANDMARK signs keep their full size.
  for (const p of built.filter((p) => !["a", "b"].includes(p.id)))
    assert.ok(limits[p.id] >= ROOFTOP_SIGN.LANDMARK.width);
});

test("image supports depend on the tier and fall back to what the building can carry", () => {
  assert.equal(supportAllowed("SIDE_BILLBOARD", "STARTER"), false);
  assert.equal(
    effectiveSupport({ support: "SIDE_BILLBOARD" }, "STARTER"),
    null,
  );
  assert.equal(
    effectiveSupport({ support: "PARTIAL_FACADE" }, "PLUS"),
    "SIDE_BILLBOARD",
  );
  assert.equal(
    effectiveSupport({ support: "PARTIAL_FACADE" }, "PRO"),
    "PARTIAL_FACADE",
  );
  assert.equal(
    effectiveSupport({ support: "VERTICAL_SCREEN" }, "PREMIUM"),
    "FULL_FACADE",
  );
  assert.equal(
    effectiveSupport({ support: "VERTICAL_SCREEN" }, "LANDMARK"),
    "VERTICAL_SCREEN",
  );
});

test("sign colors: owner's sign background with readable text", () => {
  const light = signColors({ ...emptyAd, brand: "X", secondary: "#f4f4f2" });
  assert.equal(light.background, "#f4f4f2");
  assert.equal(light.ink, contrastInk("#f4f4f2"));
  assert.notEqual(contrastInk("#0a0a0a"), contrastInk("#ffffff"));
});

test("brand validation: tagline length, supports, own uploads and unsafe image URLs", () => {
  const ad = { ...emptyAd, brand: "NevoStudio" };
  assert.equal(adSchema.parse(ad).tagline, "");
  assert.equal(
    adSchema.safeParse({ ...ad, tagline: "x".repeat(61) }).success,
    false,
  );
  assert.equal(
    adSchema.safeParse({ ...ad, support: "HOLOGRAM" }).success,
    false,
  );
  for (const logo of [
    "/api/uploads/0f8fad5b-d9cb-469f-a165-70867728950e.webp",
    "/brands/nevostudio.svg",
    "https://cdn.example.com/logo.png",
  ])
    assert.equal(adSchema.safeParse({ ...ad, logo }).success, true, logo);
  for (const logo of [
    "javascript:alert(1)",
    "/api/uploads/../../.env",
    "//evil.example/logo.png",
    "data:image/svg+xml,<svg onload=alert(1)>",
  ])
    assert.equal(adSchema.safeParse({ ...ad, logo }).success, false, logo);
  // Legacy ads without the new fields still validate.
  const legacy: Record<string, unknown> = { ...ad };
  delete legacy.tagline;
  delete legacy.support;
  assert.equal(adSchema.parse(legacy).support, "SIDE_BILLBOARD");
});

test("logo uploads: transparent, horizontal and square images are normalized to a small WebP", async () => {
  const transparent = await normalizeImage(
    await png(400, 400, 0),
    "logo",
    "image/png",
  );
  assert.equal(transparent.contentType, "image/webp");
  assert.equal(transparent.hasAlpha, true);
  assert.equal((await sharp(transparent.bytes).metadata()).hasAlpha, true);
  const horizontal = await normalizeImage(await png(1600, 400), "logo");
  assert.deepEqual([horizontal.width, horizontal.height], [512, 128]);
  const square = await normalizeImage(
    await png(300, 300, 1, "jpeg"),
    "logo",
    "image/jpeg",
  );
  assert.deepEqual([square.width, square.height], [300, 300]);
  const webp = await normalizeImage(await png(64, 64, 1, "webp"), "logo");
  assert.equal(webp.width, 64);
  const banner = await normalizeImage(await png(3000, 1500), "banner");
  assert.deepEqual([banner.width, banner.height], [1600, 800]);
});

test("logo uploads reject wrong types, spoofed MIME, tiny, huge, extreme and broken images", async () => {
  const cases: [Promise<Buffer> | Buffer, RegExp, string?][] = [
    [
      Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"),
      /PNG, JPEG y WebP/,
    ],
    [Buffer.from("GIF89a......"), /PNG, JPEG y WebP/],
    [png(64, 64), /no coincide/, "image/jpeg"],
    [png(16, 16), /pequeña/],
    [png(5000, 600), /grande/],
    [png(2000, 40), /pequeña|proporción/],
    [
      Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        Buffer.from("not really a png"),
      ]),
      /leer/,
    ],
    [Buffer.alloc(3 * 1024 * 1024, 1), /2 MB/],
  ];
  for (const [bytes, error, type] of cases)
    await assert.rejects(
      async () => normalizeImage(await bytes, "logo", type),
      error,
    );
});

test("NevoStudio is the reference branded building: logo, accent and phrase, once", () => {
  const s = makeSeed(false, now);
  const p = citySnapshot(s, false, now).properties.find(
    (p) => p.name === "NevoStudio",
  )!;
  assert.equal(p.status, "public");
  assert.equal(p.ad?.brand, "NevoStudio");
  assert.equal(p.ad?.tagline, "Encuentra tus próximos anunciantes");
  assert.equal(p.ad?.logo, "/brands/nevostudio.svg");
  assert.equal(p.ad?.primary, "#ff4b00");
  assert.equal(adSchema.safeParse(NEVOSTUDIO_BRANDING).success, true);
});

test("branding persists with the building and survives upgrades; migration is additive", () => {
  const s = makeSeed(false, now);
  const input = {
    propertyId: "building-44",
    email: "brand@example.com",
    ad: {
      ...emptyAd,
      brand: "Logo Co",
      tagline: "Hecho a mano",
      logo: "/api/uploads/0f8fad5b-d9cb-469f-a165-70867728950e.webp",
    },
  };
  const r = reserve(s, input, true, now).reservation;
  const l = fulfill(s, r.id, "t", 3, "demo", now)!;
  const up = reserve(
    s,
    { ...input, upgradeLeaseId: l.id, presenceTier: "PRO" },
    true,
    now,
  ).reservation;
  fulfill(s, up.id, "t2", 12, "demo", now);
  const restored = JSON.parse(JSON.stringify(s));
  const p = citySnapshot(restored, true, now).properties.find(
    (p) => p.id === "building-44",
  )!;
  assert.equal(p.building?.tier, "PRO");
  assert.equal(p.ad?.tagline, "Hecho a mano");
  assert.equal(p.ad?.logo, input.ad.logo);
  // Legacy ads gain the new fields without losing anything else.
  const legacy = makeSeed(true, now);
  legacy.settings[0].brandingVersion = undefined;
  const nova = legacy.leases.find((l) => l.ad.brand === "Nova Labs")!;
  const ad = nova.ad as Partial<typeof emptyAd>;
  delete ad.tagline;
  delete ad.support;
  ad.style = "facade";
  const before = structuredClone(nova.ad);
  migrateBranding(legacy);
  const after = nova.ad;
  assert.equal(after.support, "PARTIAL_FACADE");
  assert.equal(after.tagline, "Ideas que despegan");
  for (const k of ["brand", "logo", "primary", "website"] as const)
    assert.equal(after[k], before[k]);
  assert.deepEqual(migrateBranding(structuredClone(legacy)), legacy);
});
