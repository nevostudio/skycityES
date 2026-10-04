import { test, expect } from "@playwright/test";

test("fullscreen city: brands, focus, neighborhoods, filters and navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  const canvas = await page.locator("canvas").boundingBox();
  expect(canvas?.width).toBe(1920);
  expect(canvas?.height).toBe(1012);
  await page.getByRole("button", { name: "Hide introduction" }).click();
  await expect(page.locator(".brand-pin, .available-pin")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search SkyCity" }).fill("Nova Labs");
  await page
    .locator(".directory-grid button")
    .filter({ hasText: "Nova Labs" })
    .filter({ hasText: "#13" })
    .click();
  const panel = page.getByRole("complementary", { name: "Selected building" });
  await expect(panel).toContainText("Nova Labs");
  await expect(
    panel.getByRole("link", { name: /Visit website/ }),
  ).toBeVisible();
  expect(await page.locator("canvas").boundingBox()).toEqual(canvas);
  await page.screenshot({ path: "test-results/desktop-selection.png" });
  await page.getByRole("button", { name: "Close property" }).click();
  await page.getByRole("button", { name: "Districts", exact: true }).click();
  await page
    .locator(".district-menu")
    .getByRole("button", { name: /Old Town/ })
    .click();
  await expect(
    page.getByRole("button", { name: "Districts", exact: true }),
  ).toContainText("Old Town");
  await page.getByRole("button", { name: "Reset camera" }).click();
  await page.getByRole("button", { name: "Available", exact: true }).click();
  await page
    .getByRole("button", { name: "Building directory", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Building directory" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close directory" }).click();
  await page.getByRole("link", { name: "Auctions", exact: true }).click();
  await expect(page).toHaveURL(/\/auctions$/);
  await page.getByRole("link", { name: "Explore", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("link", { name: "My buildings", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Email address" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
