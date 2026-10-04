import { test, expect, type Page } from "@playwright/test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { emptyAd } from "../../lib/seed";

type Plot = {
  id: string;
  name: string;
  status: string;
  inventory: string;
  building: { tier: string } | null;
  ad?: typeof emptyAd;
};
const dir = mkdtempSync(path.join(tmpdir(), "skycity-logos-"));
/** Test logos: transparent square, horizontal wordmark-like and an opaque JPEG. */
async function logo(
  name: string,
  width: number,
  height: number,
  color: string,
  transparent: boolean,
) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    ${transparent ? "" : `<rect width="100%" height="100%" fill="#ffffff"/>`}
    <circle cx="${height / 2}" cy="${height / 2}" r="${height * 0.42}" fill="${color}"/>
    ${width > height * 2 ? `<rect x="${height * 1.1}" y="${height * 0.3}" width="${width - height * 1.3}" height="${height * 0.4}" rx="${height * 0.1}" fill="#1d2b26"/>` : ""}
  </svg>`;
  const file = path.join(dir, name);
  const image = sharp(Buffer.from(svg));
  writeFileSync(
    file,
    await (name.endsWith(".jpg") ? image.jpeg() : image.png()).toBuffer(),
  );
  return file;
}
async function freePlots(page: Page) {
  const city = await (await page.request.get("/api/city")).json();
  return city.properties.filter(
    (p: Plot) => p.status === "available" && p.inventory === "normal",
  ) as Plot[];
}
async function upload(page: Page, file: string, kind: "logo" | "banner") {
  const res = await page.request.post("/api/upload", {
    multipart: {
      kind,
      file: {
        name: path.basename(file),
        mimeType: file.endsWith(".jpg") ? "image/jpeg" : "image/png",
        buffer: readFileSync(file),
      },
    },
  });
  expect(res.status()).toBe(200);
  return (await res.json()) as { url: string; width: number; height: number };
}
async function build(
  page: Page,
  plot: Plot,
  tier: string,
  ad: Partial<typeof emptyAd>,
) {
  const r = await (
    await page.request.post("/api/checkout", {
      data: {
        propertyId: plot.id,
        email: `brand-${Date.now()}-${tier}@skycity.demo`,
        presenceTier: tier,
        ad: { ...emptyAd, ...ad },
      },
    })
  ).json();
  expect(r.reservation, JSON.stringify(r)).toBeTruthy();
  await page.request.post("/api/checkout/complete", { data: r });
}
async function shoot(page: Page, id: string, name: string) {
  await page.goto(`/?building=${id}`);
  await expect(page.locator("canvas")).toBeVisible();
  // Software WebGL in CI is slow: let the focus animation settle before capturing.
  await page.waitForTimeout(6000);
  await page.getByRole("button", { name: "Cerrar ficha" }).click();
  await page.waitForTimeout(1500);
  await page
    .locator(".map-canvas")
    .screenshot({ path: `test-results/branding-${name}.png` });
}

test.describe.configure({ mode: "serial" });

test("brand editor: upload a transparent logo, phrase and colors; branding persists after reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const [plot] = await freePlots(page);
  const email = `editor-${Date.now()}@skycity.demo`;
  await page.goto(`/?building=${plot.id}`);
  await page.getByRole("button", { name: "CONSTRUIR AQUÍ" }).click();
  await page
    .getByRole("textbox", { name: "Nombre de la marca", exact: true })
    .fill("Transparente Co");
  await page
    .getByLabel("Subir logo")
    .setInputFiles(await logo("square.png", 400, 400, "#2f7d6b", true));
  await expect(page.locator(".image-thumb img").first()).toHaveAttribute(
    "src",
    /\/api\/uploads\/.+\.webp$/,
  );
  await expect(
    page.getByRole("img", { name: /Vista previa del cartel/ }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: /Tu email/ }).fill(email);
  await page.getByRole("button", { name: /Construir por 3\s€/ }).click();
  await page
    .getByRole("button", { name: "Completar pago de demostración" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bienvenido al barrio." }),
  ).toBeVisible();
  // Mis edificios → Editar marca.
  await page.goto("/my-buildings");
  await page.getByRole("button", { name: "Editar marca" }).click();
  await page
    .getByRole("textbox", { name: "Nombre de la marca", exact: true })
    .fill("Transparente Studio");
  await page
    .getByRole("textbox", { name: /Frase corta/ })
    .fill("Diseño que se ve desde lejos");
  await page.getByLabel("Fondo del cartel").fill("#1d2b26");
  await page.getByRole("button", { name: "Guardar marca" }).click();
  await expect(
    page.getByRole("heading", { name: "Transparente Studio", exact: true }),
  ).toBeVisible();
  await page.reload();
  const city = await (await page.request.get("/api/city")).json();
  const saved = city.properties.find((p: Plot) => p.id === plot.id);
  expect(saved.ad.brand).toBe("Transparente Studio");
  expect(saved.ad.tagline).toBe("Diseño que se ve desde lejos");
  expect(saved.ad.secondary).toBe("#1d2b26");
  expect(saved.ad.logo).toMatch(/^\/api\/uploads\/.+\.webp$/);
  expect(
    (await page.request.get(saved.ad.logo)).headers()["content-type"],
  ).toBe("image/webp");
  await shoot(page, plot.id, "starter-transparent-logo");
  expect(errors).toEqual([]);
});

test("scenarios for visual review: PRO, LANDMARK, horizontal and square logos, no logo, broken logo, NevoStudio", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("404"))
      errors.push(m.text());
  });
  const plots = await freePlots(page);
  const wide = await upload(
    page,
    await logo("wide.png", 1200, 300, "#ff4b00", true),
    "logo",
  );
  expect(wide.width).toBe(512);
  const square = await upload(
    page,
    await logo("square.jpg", 300, 300, "#5b3fa6", false),
    "logo",
  );
  const banner = await upload(
    page,
    await logo("banner.png", 1600, 900, "#e2b54b", false),
    "banner",
  );
  const scenarios: [string, string, Partial<typeof emptyAd>][] = [
    [
      "pro-horizontal-logo",
      "PRO",
      {
        brand: "Horizonte",
        tagline: "Rótulos que se leen",
        logo: wide.url,
        banner: banner.url,
        support: "PARTIAL_FACADE",
        primary: "#ff4b00",
      },
    ],
    [
      "landmark-square-logo",
      "LANDMARK",
      {
        brand: "Cuadrado Labs",
        tagline: "Grande, claro e iluminado",
        logo: square.url,
        banner: banner.url,
        support: "SIDE_BILLBOARD",
        primary: "#5b3fa6",
        secondary: "#f7f3ff",
      },
    ],
    ["starter-no-logo", "STARTER", { brand: "Sin Logo", primary: "#2f7d6b" }],
    [
      "plus-broken-logo",
      "PLUS",
      {
        brand: "Fallback Co",
        tagline: "Siempre con cartel",
        logo: "/api/uploads/00000000-0000-0000-0000-000000000000.webp",
        primary: "#c0533b",
      },
    ],
  ];
  // Spread out so every scenario has its own neighbourhood in the screenshots.
  expect(plots.length).toBeGreaterThanOrEqual(4);
  const picks = [
    plots[2],
    plots[Math.floor(plots.length / 3)],
    plots[Math.floor((plots.length * 2) / 3)],
    plots[plots.length - 2],
  ];
  for (const [i, [, tier, ad]] of scenarios.entries())
    await build(page, picks[i], tier, ad);
  const city = await (await page.request.get("/api/city")).json();
  for (const [i, [name, tier, ad]] of scenarios.entries()) {
    const p = city.properties.find((v: Plot) => v.id === picks[i].id);
    expect(p.building.tier).toBe(tier);
    expect(p.ad.brand).toBe(ad.brand);
    await shoot(page, p.id, name);
  }
  const nevo = city.properties.find((p: Plot) => p.ad?.brand === "NevoStudio");
  if (nevo) await shoot(page, nevo.id, "nevostudio");
  expect(errors).toEqual([]);
});
