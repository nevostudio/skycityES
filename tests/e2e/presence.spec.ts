import { test, expect } from "@playwright/test";
import { emptyAd } from "../../lib/seed";
type Plot = {
  id: string;
  name: string;
  districtId: string;
  status: string;
  inventory: string;
  height: number;
  x: number;
  z: number;
  width: number;
  depth: number;
  building: { tier: string; floors: number } | null;
};

test("CASE A–D in the browser: build on the map, grow STARTER → PRO paying 12 €, reload, neighbours stay empty", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const city = await (await request.get("/api/city")).json();
  const free = city.properties.filter(
    (p: Plot) => p.status === "available" && p.inventory === "normal",
  );
  const p: Plot = free[0];
  const email = `grow-${Date.now()}@skycity.demo`;
  // CASE A · empty plot → STARTER 3 € → payment → the building rises in the city.
  await page.goto(`/?building=${p.id}`);
  const panel = page.getByRole("complementary", { name: "Solar seleccionado" });
  await expect(panel).toContainText(p.name);
  await expect(panel).toContainText("Construye aquí tu propio edificio.");
  await expect(panel).toContainText("Pago único · Sin registro");
  await panel.getByRole("button", { name: "CONSTRUIR AQUÍ" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page
    .getByRole("textbox", { name: "Nombre de la marca", exact: true })
    .fill("Growing Studio");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("textbox", { name: /Tu email/ }).fill(email);
  await page.getByRole("button", { name: /Construir por 3\s€/ }).click();
  await page
    .getByRole("button", { name: "Completar pago de demostración" })
    .click();
  // Share appears once the construction animation has finished.
  await expect(
    page.getByRole("heading", { name: "Bienvenido al barrio." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar diálogo" }).click();
  let snapshot = await (await request.get("/api/city")).json();
  let built: Plot = snapshot.properties.find((v: Plot) => v.id === p.id);
  expect(built.building?.tier).toBe("STARTER");
  expect(built.building!.floors).toBeLessThanOrEqual(2);
  await expect(panel).toContainText("EDIFICIO STARTER");
  // CASE B · upgrade from the city panel: pay only the difference, same plot.
  await panel.getByRole("button", { name: "Mejorar edificio" }).click();
  await page.locator('input[name="presence"][value="PRO"]').check();
  await expect(page.getByText(/^Pagas 12\s€$/)).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: /Mejorar por 12\s€/ }).click();
  snapshot = await (await request.get("/api/city")).json();
  expect(
    snapshot.properties.find((v: Plot) => v.id === p.id).building.tier,
  ).toBe("STARTER");
  await page
    .getByRole("button", { name: "Completar mejora de demostración" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bienvenido al barrio." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar diálogo" }).click();
  snapshot = await (await request.get("/api/city")).json();
  const grown: Plot = snapshot.properties.find((v: Plot) => v.id === p.id);
  expect(grown.building?.tier).toBe("PRO");
  expect(grown.height).toBeGreaterThan(built.height);
  for (const key of ["x", "z", "width", "depth"] as const)
    expect(grown[key]).toBe(p[key]);
  // CASE C · reload: the building is still there.
  await page.reload();
  await expect(
    page.getByRole("complementary", { name: "Solar seleccionado" }),
  ).toContainText("EDIFICIO PRO");
  const me = await (await page.request.get("/api/me")).json();
  expect(me.leases[0].upgradeHistory).toHaveLength(1);
  expect(me.leases[0].upgradeHistory[0].amount).toBe(12);
  // CASE D · the other plots were never touched.
  const others = snapshot.properties.filter(
    (v: Plot) => free.some((f: Plot) => f.id === v.id) && v.id !== p.id,
  );
  expect(others.every((v: Plot) => v.building === null)).toBe(true);
  // Unauthenticated upgrades are refused.
  expect(
    (
      await request.post("/api/checkout", {
        data: {
          propertyId: p.id,
          email,
          ad: { ...emptyAd, brand: "Intruder" },
          upgradeLeaseId: me.leases[0].id,
          presenceTier: "PREMIUM",
        },
      })
    ).status(),
  ).toBe(401);
  await page.goto("/my-buildings");
  await page.getByText("Historial de mejoras (1)", { exact: true }).click();
  await expect(page.getByText(/STARTER → PRO · 12\s€/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("reserved skyscraper plot cannot be bought; admin can release, reserve, assign and open an auction", async ({
  page,
  request,
}) => {
  const city = await (await request.get("/api/city")).json();
  const p = city.properties.find((p: { id: string }) => p.id === "building-32");
  await page.goto(`/city/${p.districtId}/${p.id}`);
  await expect(
    page.getByRole("button", { name: "Reservado para grandes marcas" }),
  ).toBeDisabled();
  const input = {
    propertyId: p.id,
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
  await page.getByRole("textbox", { name: "Buscar solares" }).fill(p.name);
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Disponibilidad", exact: true })
    .selectOption("available");
  await page
    .getByRole("button", { name: "Guardar solar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    (await (await request.get("/api/city")).json()).properties.find(
      (v: { id: string }) => v.id === p.id,
    ).status,
  ).toBe("available");
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Disponibilidad", exact: true })
    .selectOption("reserved");
  await page
    .getByRole("button", { name: "Guardar solar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Nombre de la marca", exact: true })
    .fill("Major Brand");
  await page
    .getByRole("textbox", { name: "Email del anunciante", exact: true })
    .fill("major@example.com");
  await page
    .getByRole("button", { name: "Asignar rascacielos", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  let state = await (await request.get("/api/city")).json();
  const tower = state.properties.find((v: { id: string }) => v.id === p.id);
  expect(tower.ad.brand).toBe("Major Brand");
  expect(tower.building.tier).toBe("SKYSCRAPER");
  await page.getByRole("button", { name: "Subastas", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Rascacielos", exact: true })
    .selectOption("building-68");
  await page
    .getByRole("button", { name: "Crear subasta", exact: true })
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
