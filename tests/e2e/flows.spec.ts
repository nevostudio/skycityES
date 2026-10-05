import { test, expect } from "@playwright/test";
import { acceptTerms, consent } from "./consent";
type Plot = {
  id: string;
  name: string;
  districtId: string;
  status: string;
  inventory: string;
  building: { tier: string } | null;
};
async function freePlot(request: import("@playwright/test").APIRequestContext) {
  const city = await (await request.get("/api/city")).json();
  return city.properties.find(
    (p: Plot) => p.status === "available" && p.inventory === "normal",
  ) as Plot;
}
test("explorar → construir aquí → compartir → editar → enlace de acceso", async ({
  page,
  request,
}) => {
  const p = await freePlot(request);
  expect(p.building).toBeNull();
  const email = `browser-${Date.now()}@skycity.demo`;
  await page.goto(`/city/${p.districtId}/${p.id}`);
  await expect(
    page.getByRole("heading", { name: p.name, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Construir aquí" }).click();
  await expect(
    page.locator('input[name="presence"][value="STARTER"]'),
  ).toBeChecked();
  await expect(
    page.getByRole("group", { name: "1. Elige el tamaño de tu edificio" }),
  ).toBeVisible();
  // Three steps: Tamaño → Marca → Pago.
  await page.getByRole("button", { name: "Continuar" }).click();
  await page
    .getByRole("textbox", { name: "Nombre de la marca", exact: true })
    .fill("Browser Test Studio");
  await page
    .getByRole("textbox", { name: "Web opcional", exact: true })
    .fill("https://example.com");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("textbox", { name: /Tu email/ }).fill(email);
  await acceptTerms(page);
  await page.getByRole("button", { name: /Construir por 3\s€/ }).click();
  await expect(
    page.getByText("Pago de demostración · sin cargo", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Completar pago de demostración" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bienvenido al barrio." }),
  ).toBeVisible();
  await expect(
    page.getByText("Acabo de construir mi edificio en SkyCity.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar diálogo" }).click();
  await expect(
    page.getByRole("heading", { name: "Browser Test Studio", exact: true }),
  ).toBeVisible();
  const built = (await (await request.get("/api/city")).json()).properties.find(
    (v: Plot) => v.id === p.id,
  );
  expect(built.building.tier).toBe("STARTER");
  await page.goto("/my-buildings");
  await expect(
    page.getByRole("heading", { name: "Browser Test Studio", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Pago único · Anuncio activo/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Renovar/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Editar marca" }).click();
  await page
    .getByRole("textbox", { name: "Nombre de la marca", exact: true })
    .fill("Browser Studio Updated");
  await page.getByRole("button", { name: "Guardar marca" }).click();
  await expect(
    page.getByRole("heading", { name: "Browser Studio Updated", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page
    .getByRole("button", { name: "Envíame un enlace de acceso" })
    .click();
  await page
    .getByRole("link", { name: "Abrir enlace de acceso demo →" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Browser Studio Updated", exact: true }),
  ).toBeVisible();
  const me = await (await page.request.get("/api/me")).json();
  expect(me.leases).toHaveLength(1);
  expect(me.leases[0].ad.brand).toBe("Browser Studio Updated");
  expect(me.leases[0].expiresAt).toBeUndefined();
});
test("simultaneous requests cannot reserve the same plot", async ({
  request,
}) => {
  const p = await freePlot(request);
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
    cta: "Visitar web",
    primary: "#abcdef",
    secondary: "#ffffff",
    style: "rooftop",
  };
  const body = {
    consent,
    propertyId: p.id,
    email: "race@skycity.demo",
    ad,
  };
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
test("admin can change the premium price and moderate; auctions are retired", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.getByRole("textbox", { name: "Email" }).fill("admin@skycity.demo");
  await page
    .getByRole("button", { name: "Envíame un enlace de acceso" })
    .click();
  await page
    .getByRole("link", { name: "Abrir enlace de acceso demo →" })
    .click();
  await page.goto("/admin");
  await expect(
    page.getByRole("button", { name: "Añadir solar" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Buscar solares" })
    .fill("Torre #050");
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "Precio premium (€, pago único)" })
    .fill("230");
  await page
    .getByRole("button", { name: "Guardar solar", exact: true })
    .click();
  await expect(page.getByText(/^230\s€$/)).toBeVisible();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "Precio premium (€, pago único)" })
    .fill("200");
  await page
    .getByRole("button", { name: "Guardar solar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edificios y anuncios", exact: true })
    .click();
  const first = page.locator(".admin-record").first();
  await first.getByRole("button", { name: "Suspender anuncio" }).click();
  await expect(first.getByText("suspendido", { exact: true })).toBeVisible();
  await first.getByRole("button", { name: "Activar anuncio" }).click();
  // Auctions are retired: the page sends visitors to the map and bids are refused.
  await expect(page.getByRole("button", { name: "Subastas" })).toHaveCount(0);
  await page.goto("/auctions");
  await expect(page).toHaveURL(/\/$/);
  const bid = await page.request.post("/api/bids", {
    data: { auctionId: "auction-14", amount: 500 },
  });
  expect(bid.status()).toBe(410);
});
test("mobile city and bottom sheet fit without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page
    .getByRole("button", { name: "Construir desde 3 €", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Solar seleccionado" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "CONSTRUIR AQUÍ", exact: true })
    .click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByRole("textbox", { name: "Nombre de la marca", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .screenshot({ path: "test-results/mobile-claim.png" });
});
