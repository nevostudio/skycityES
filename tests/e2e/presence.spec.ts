import { test, expect } from "@playwright/test";
import { emptyAd } from "../../lib/seed";

test("owner upgrades Starter to Pro for €12; visual changes and history survive reload", async ({
  page,
  request,
}) => {
  const city = await (await request.get("/api/city")).json();
  const p = city.properties.find(
    (p: { status: string; inventory: string }) =>
      p.status === "available" && p.inventory === "normal",
  );
  const input = {
    propertyId: p.id,
    email: `upgrade-${Date.now()}@skycity.demo`,
    days: 30,
    ad: { ...emptyAd, brand: "Growing Studio" },
  };
  const r = await (
    await page.request.post("/api/checkout", { data: input })
  ).json();
  expect(r.amount).toBe(3);
  await page.request.post("/api/checkout/complete", { data: r });
  const me = await (await page.request.get("/api/me")).json();
  const lease = me.leases[0];
  expect(
    (
      await request.post("/api/checkout", {
        data: { ...input, upgradeLeaseId: lease.id, presenceTier: "PRO" },
      })
    ).status(),
  ).toBe(401);
  await page.goto("/my-buildings");
  await page.getByRole("button", { name: "Upgrade presence" }).click();
  await page.locator('input[name="presence"][value="PRO"]').check();
  await expect(page.getByText("Pay €12.00", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Upgrade for €12.00", exact: true })
    .click();
  let snapshot = await (await request.get("/api/city")).json();
  expect(
    snapshot.properties.find((v: { id: string }) => v.id === p.id).presenceTier,
  ).toBe("STARTER");
  await page
    .getByRole("button", { name: "Complete demo upgrade", exact: true })
    .click();
  await expect(page.getByText("PRO PRESENCE", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByText("Upgrade history (1)", { exact: true }).click();
  await expect(
    page.getByText("STARTER → PRO · €12.00", { exact: false }),
  ).toBeVisible();
  const after = await (await page.request.get("/api/me")).json();
  expect(after.leases[0].expiresAt).toBe(lease.expiresAt);
  expect(after.leases[0].upgradeHistory).toHaveLength(1);
  snapshot = await (await request.get("/api/city")).json();
  const upgraded = snapshot.properties.find(
    (v: { id: string }) => v.id === p.id,
  );
  expect(upgraded.height).toBeGreaterThan(p.height);
  for (const key of ["x", "z", "width", "depth"])
    expect(upgraded[key]).toBe(p[key]);
  expect(upgraded.presenceTier).toBe("PRO");
  await page.getByRole("button", { name: "Renew", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Renew for €15.00", exact: true }),
  ).toBeVisible();
});

test("reserved skyscraper cannot be claimed; admin can release, reserve, assign and open an auction", async ({
  page,
  request,
}) => {
  const city = await (await request.get("/api/city")).json();
  const p = city.properties.find((p: { id: string }) => p.id === "building-32");
  await page.goto(`/city/${p.districtId}/${p.id}`);
  await expect(
    page.getByRole("button", { name: "Reserved for major brands" }),
  ).toBeDisabled();
  const input = {
    propertyId: p.id,
    days: 30,
    email: "major@example.com",
    ad: { ...emptyAd, brand: "Major Brand" },
  };
  expect((await request.post("/api/checkout", { data: input })).status()).toBe(
    409,
  );
  const link = await (
    await page.request.post("/api/auth/link", {
      data: { email: "admin@skycity.demo" },
    })
  ).json();
  await page.goto(link.url);
  await page.goto("/admin");
  await page.getByRole("textbox", { name: "Search properties" }).fill(p.name);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Availability", exact: true })
    .selectOption("available");
  await page
    .getByRole("button", { name: "Save property", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    (await (await request.get("/api/city")).json()).properties.find(
      (v: { id: string }) => v.id === p.id,
    ).status,
  ).toBe("available");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Availability", exact: true })
    .selectOption("reserved");
  await page
    .getByRole("button", { name: "Save property", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Brand name", exact: true })
    .fill("Major Brand");
  await page
    .getByRole("textbox", { name: "Advertiser email", exact: true })
    .fill("major@example.com");
  await page
    .getByRole("button", { name: "Assign skyscraper", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  let state = await (await request.get("/api/city")).json();
  expect(
    state.properties.find((v: { id: string }) => v.id === p.id).ad.brand,
  ).toBe("Major Brand");
  // Another reserved skyscraper can become a premium auction without opening direct checkout.
  await page.getByRole("button", { name: "Auctions", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Property", exact: true })
    .selectOption("building-68");
  await page
    .getByRole("button", { name: "Create auction", exact: true })
    .click();
  await expect
    .poll(async () => {
      state = await (await request.get("/api/city")).json();
      return state.properties.find(
        (v: { id: string }) => v.id === "building-68",
      ).status;
    })
    .toBe("auction");
});
