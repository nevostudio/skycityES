import { test, expect } from "@playwright/test";

test("fullscreen city: plots, brands, focus, neighborhoods, filters and navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    // A missing brand logo (404) is an expected, handled fallback; anything else fails.
    if (message.type() === "error" && !message.text().includes("status of 404"))
      errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  // The canvas starts at the 300 px default until R3F measures its container.
  await expect
    .poll(async () => (await page.locator("canvas").boundingBox())?.width)
    .toBe(1920);
  const canvas = await page.locator("canvas").boundingBox();
  expect(canvas?.height).toBe(1012);
  await page.getByRole("button", { name: "Ocultar introducción" }).click();
  await expect(page.locator(".brand-pin, .available-pin")).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Buscar en SkyCity" })
    .fill("Nova Labs");
  await page
    .locator(".directory-grid button")
    .filter({ hasText: "Nova Labs" })
    .filter({ hasText: "#13" })
    .click();
  const panel = page.getByRole("complementary", {
    name: "Solar seleccionado",
  });
  await expect(panel).toContainText("Nova Labs");
  await expect(panel.getByRole("link", { name: /Visitar web/ })).toBeVisible();
  expect(await page.locator("canvas").boundingBox()).toEqual(canvas);
  await page.screenshot({ path: "test-results/desktop-selection.png" });
  await page.getByRole("button", { name: "Cerrar ficha" }).click();
  await page.getByRole("button", { name: "Barrios", exact: true }).click();
  await page
    .locator(".district-menu")
    .getByRole("button", { name: /Casco Antiguo/ })
    .click();
  await expect(
    page.getByRole("button", { name: "Barrios", exact: true }),
  ).toContainText("Casco Antiguo");
  await page.getByRole("button", { name: "Restablecer cámara" }).click();
  await page
    .getByRole("button", { name: "Solares libres", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Directorio de solares", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Directorio de solares" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar directorio" }).click();
  await page.getByRole("link", { name: "Subastas", exact: true }).click();
  await expect(page).toHaveURL(/\/auctions$/);
  await page.getByRole("link", { name: "Explorar", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("link", { name: "Mis edificios", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  expect(errors).toEqual([]);
});
