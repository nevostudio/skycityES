import { test, expect } from "@playwright/test";
import type { CityData } from "../../types";
import { rankBrands } from "../../lib/city-social";

test("ranking, purchase feed, map selection, responsive header and mobile sheet", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const data: CityData = await (await page.request.get("/api/city")).json();
  const entries = rankBrands(data.properties);
  const first = entries[0]?.property;
  await page.setViewportSize({ width: 1728, height: 1080 });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  const ranking = page.getByRole("complementary", { name: "Top marcas" });
  await expect(ranking).toBeVisible();
  if (first) {
    await expect(ranking.locator(".ranking-item").first()).toContainText(
      first.ad!.brand,
    );
    await expect(ranking.locator(".latest-purchase")).toBeVisible();
  } else {
    await expect(ranking).toContainText("Tu marca puede ser la primera.");
  }
  await expect(page.locator(".city-metrics")).toContainText("demo");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "test-results/social-desktop.png" });
  if (first) {
    await ranking.locator(".ranking-item").first().click();
    await expect(
      page.getByRole("complementary", { name: "Solar seleccionado" }),
    ).toContainText(first.ad!.brand);
    await expect(ranking.locator(".ranking-item").first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByRole("button", { name: "Cerrar ficha" }).click();
  }
  await page.getByRole("button", { name: "Cerrar Top marcas" }).click();
  await expect(ranking).toBeHidden();
  await page.getByRole("button", { name: "Abrir Top marcas" }).click();
  await expect(ranking).toBeVisible();
  for (const width of [1280, 820, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBeTruthy();
    await expect(page.locator(".city-metrics")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Construir desde 3 €" }),
    ).toBeVisible();
    const headerBoxes = await page
      .locator(".header .brand, .city-metrics, .header-right .button")
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
        }),
      );
    for (let i = 0; i < headerBoxes.length; i++)
      for (let j = i + 1; j < headerBoxes.length; j++) {
        const a = headerBoxes[i],
          b = headerBoxes[j];
        expect(
          Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 &&
            Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1,
          `header overlap at ${width}: ${i}/${j}`,
        ).toBeFalsy();
      }
    await page.screenshot({ path: `test-results/social-${width}.png` });
    if (width === 820 && first) {
      await ranking.locator(".ranking-item").first().click();
      await expect(ranking).toBeHidden();
      await page.getByRole("button", { name: "Abrir Top marcas" }).click();
      await expect(ranking).toBeVisible();
      await page.getByRole("button", { name: "Cerrar ficha" }).click();
    }
  }
  // A newly loaded mobile view starts with the city unobstructed.
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(2000);
  await expect(ranking).toBeHidden();
  await page.getByRole("button", { name: "Abrir Top marcas" }).click();
  await expect(ranking).toBeVisible();
  await page.screenshot({ path: "test-results/social-mobile-sheet.png" });
  if (first) {
    await ranking.locator(".ranking-item").first().click();
    await expect(ranking).toBeHidden();
    await expect(
      page.getByRole("complementary", { name: "Solar seleccionado" }),
    ).toContainText(first.ad!.brand);
    await page.getByRole("button", { name: "Cerrar ficha" }).click();
  } else {
    await page.getByRole("button", { name: "Cerrar Top marcas" }).click();
  }
  await page.getByRole("button", { name: "Construir desde 3 €" }).click();
  await expect(
    page.getByRole("button", { name: "CONSTRUIR AQUÍ" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
