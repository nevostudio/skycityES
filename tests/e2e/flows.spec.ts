import { test, expect } from "@playwright/test";
test("explore → claim → share → edit → renew → magic link", async ({
  page,
  request,
}) => {
  const city = await (await request.get("/api/city")).json();
  const p = city.properties.find(
    (p: { status: string; prices: Record<string, number> }) =>
      p.status === "available" && p.prices["30"] === 3,
  );
  const email = `browser-${Date.now()}@skycity.demo`;
  await page.goto(`/city/${p.districtId}/${p.id}`);
  await expect(
    page.getByRole("heading", { name: p.name, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Claim this building", exact: true })
    .click();
  await expect(
    page.locator('input[name="presence"][value="STARTER"]'),
  ).toBeChecked();
  await expect(
    page.getByRole("group", { name: "Choose your presence in SkyCity" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Brand name", exact: true })
    .fill("Browser Test Studio");
  await page
    .getByRole("textbox", { name: "Website optional", exact: true })
    .fill("https://example.com");
  await page.getByRole("textbox", { name: /Your email/ }).fill(email);
  await page
    .getByRole("button", { name: "Claim for €3.00", exact: true })
    .click();
  await expect(
    page.getByText("Demo checkout · no charge", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Complete demo claim", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Welcome to the neighborhood." }),
  ).toBeVisible();
  await expect(
    page.getByText("I just claimed a building in SkyCity.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Browser Test Studio", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "My buildings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Browser Test Studio", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit ad", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Brand name", exact: true })
    .fill("Browser Studio Updated");
  await page.getByRole("button", { name: "Save advertisement" }).click();
  await expect(
    page.getByRole("heading", { name: "Browser Studio Updated", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Renew", exact: true }).click();
  await page
    .getByRole("button", { name: "Renew for €3.00", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Complete demo claim", exact: true })
    .click();
  await expect(page.getByText("60 days remaining · Ad active")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("button", { name: "Send me an access link" }).click();
  await page
    .getByRole("link", { name: "Open secure demo access link →" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Browser Studio Updated", exact: true }),
  ).toBeVisible();
  const me = await (await page.request.get("/api/me")).json();
  expect(me.leases).toHaveLength(1);
  expect(me.leases[0].ad.brand).toBe("Browser Studio Updated");
});
test("simultaneous requests cannot reserve the same property", async ({
  request,
}) => {
  const city = await (await request.get("/api/city")).json();
  const p = city.properties.find(
    (p: { status: string }) => p.status === "available",
  );
  const ad = {
    brand: "Race Test",
    description: "",
    website: "",
    instagram: "",
    tiktok: "",
    x: "",
    linkedin: "",
    logo: "",
    banner: "",
    promo: "",
    cta: "Visit website",
    primary: "#abcdef",
    secondary: "#ffffff",
    style: "rooftop",
  };
  const body = { propertyId: p.id, days: 30, email: "race@skycity.demo", ad };
  const responses = await Promise.all([
    request.post("/api/checkout", { data: body }),
    request.post("/api/checkout", { data: body }),
  ]);
  expect(responses.map((r) => r.status()).sort()).toEqual([200, 409]);
});
test("private APIs deny strangers; demo magic links are single-use", async ({
  request,
}) => {
  expect((await request.get("/api/admin")).status()).toBe(401);
  expect(
    (
      await request.patch("/api/me", {
        data: { leaseId: "seed-lease-13", ad: {} },
      })
    ).status(),
  ).toBe(401);
  const link = await (
    await request.post("/api/auth/link", {
      data: { email: "security@skycity.demo" },
    })
  ).json();
  expect((await request.get(link.url)).status()).toBe(200);
  expect((await request.get(link.url)).status()).toBe(403);
  expect((await request.get("/api/admin")).status()).toBe(403);
});
test("admin can change skyscraper price and moderate; signed-in customers can bid", async ({
  page,
}) => {
  await page.goto("/admin");
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("admin@skycity.demo");
  await page.getByRole("button", { name: "Send me an access link" }).click();
  await page
    .getByRole("link", { name: "Open secure demo access link →" })
    .click();
  await page.goto("/admin");
  await expect(
    page.getByRole("button", { name: "Add property" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search properties" })
    .fill("Tower #050");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("spinbutton", { name: "€ / 30 days" }).fill("230");
  await page
    .getByRole("button", { name: "Save property", exact: true })
    .click();
  await expect(page.getByText("€230.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("spinbutton", { name: "€ / 30 days" }).fill("200");
  await page
    .getByRole("button", { name: "Save property", exact: true })
    .click();
  await page.getByRole("button", { name: "Leases & ads", exact: true }).click();
  const first = page.locator(".admin-record").first();
  await first.getByRole("button", { name: "Suspend ad" }).click();
  await expect(first.getByText("suspended", { exact: true })).toBeVisible();
  await first.getByRole("button", { name: "Activate ad" }).click();
  await page.goto("/auctions");
  await page
    .getByRole("button", { name: "Place a bid", exact: false })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Place bid/ })
    .click();
  await expect(page.getByRole("status")).toContainText("Your bid");
});
test("mobile city and bottom sheet fit without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("skycity-welcome", "1"));
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "Find my spot", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Selected building" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Claim this building", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Brand name", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .screenshot({ path: "test-results/mobile-claim.png" });
});
