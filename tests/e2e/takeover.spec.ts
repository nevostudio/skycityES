import { test, expect } from "@playwright/test";
import { emptyAd } from "../../lib/seed";
import type { CityData } from "../../types";

test("automatic takeover: visible terms, unchanged PRO building, concurrent payments, former owner denied, admin controls and history", async ({
  page,
  request,
  playwright,
  baseURL,
}) => {
  const admin = await playwright.request.newContext({ baseURL });
  const link = await (
    await admin.post("/api/auth/link", {
      data: { email: "admin@skycity.demo" },
    })
  ).json();
  expect((await admin.get(link.url)).ok()).toBeTruthy();
  const original = (await (await admin.get("/api/admin")).json()).settings;
  try {
    await page.context().addCookies((await admin.storageState()).cookies);
    await page.goto("/admin");
    await page.getByRole("button", { name: "Ajustes", exact: true }).click();
    await page.getByLabel("Takeover global activado").check();
    await page
      .getByLabel("Horas de protección tras claim o takeover")
      .fill("0");
    await page
      .getByRole("button", { name: "Guardar ajustes", exact: true })
      .click();
    await expect(page.getByText("Cambios guardados.")).toBeVisible();
    const city: CityData = await (await request.get("/api/city")).json();
    const p = city.properties.find(
      (p) => p.inventory === "normal" && p.status === "available",
    )!;
    const ad = { ...emptyAd, brand: "Original Takeover Brand" };
    const initial = await (
      await request.post("/api/checkout", {
        data: { propertyId: p.id, email: "takeover-original@example.com", ad },
      })
    ).json();
    const old = (
      await (
        await request.post("/api/checkout/complete", { data: initial })
      ).json()
    ).lease;
    const up = await (
      await request.post("/api/checkout", {
        data: {
          propertyId: p.id,
          email: old.email,
          ad,
          upgradeLeaseId: old.id,
          presenceTier: "PRO",
        },
      })
    ).json();
    expect(
      (await request.post("/api/checkout/complete", { data: up })).ok(),
    ).toBeTruthy();
    const before: CityData = await (await request.get("/api/city")).json();
    const built = before.properties.find((v) => v.id === p.id)!;
    expect(built.current_property_value).toBe(3);
    await page.goto(`/city/${p.districtId}/${p.id}`);
    await page.getByRole("button", { name: "+1 €", exact: true }).click();
    await expect(page.getByLabel("Tu oferta (€)")).toHaveValue("4");
    await page.getByLabel("Tu oferta (€)").fill("5");
    await page
      .getByRole("button", { name: "HACERME CON ESTA UBICACIÓN", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText(
        "Controlarás esta ubicación mientras nadie supere el importe que has pagado.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      dialog.getByText(
        "Si otra persona supera el valor actual, pasará automáticamente a controlar esta ubicación.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(dialog.locator('input[name="presence"]')).toHaveCount(0);
    await dialog
      .getByRole("textbox", { name: "Nombre de la marca", exact: true })
      .fill("New Takeover Brand");
    await dialog
      .getByRole("textbox", { name: /Tu email/ })
      .fill("takeover-new@example.com");
    await dialog
      .getByRole("button", { name: /HACERME CON ESTA UBICACIÓN por/ })
      .click();
    await dialog
      .getByRole("button", { name: "Completar pago de demostración" })
      .click();
    await expect(page).toHaveURL(new RegExp(`building=${p.id}`));
    await expect(
      page.getByRole("heading", { name: "New Takeover Brand", exact: true }),
    ).toBeVisible();
    const after: CityData = await (await request.get("/api/city")).json();
    const taken = after.properties.find((v) => v.id === p.id)!;
    expect(taken.current_property_value).toBe(5);
    expect(taken.building?.tier).toBe("PRO");
    expect([taken.x, taken.z, taken.height, taken.width, taken.depth]).toEqual([
      built.x,
      built.z,
      built.height,
      built.width,
      built.depth,
    ]);
    expect(
      (
        await request.patch("/api/me", { data: { leaseId: old.id, ad } })
      ).status(),
    ).toBe(404);
    expect(
      (
        await request.post("/api/checkout", {
          data: {
            propertyId: p.id,
            email: old.email,
            ad,
            upgradeLeaseId: old.id,
            presenceTier: "LANDMARK",
          },
        })
      ).status(),
    ).toBe(403);
    await page.goto("/my-buildings");
    await expect(
      page.getByText("Abierto a takeover", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Cualquier usuario puede superar este valor cuando termine el periodo de protección.",
        { exact: true },
      ),
    ).toBeVisible();
    const offers = await Promise.all(
      [102, 103].map(async (offerAmount) => {
        const res = await request.post("/api/takeover", {
          data: {
            propertyId: p.id,
            email: `race-${offerAmount}@example.com`,
            ad,
            offerAmount,
          },
        });
        expect(res.status()).toBe(200);
        return res.json();
      }),
    );
    const payments = await Promise.all(
      offers.map((data) => request.post("/api/checkout/complete", { data })),
    );
    expect(payments.map((r) => r.status()).sort()).toEqual([200, 409]);
    const records = await (await admin.get("/api/admin")).json();
    const history = records.propertyTakeovers.filter(
      (t: { property_id: string }) => t.property_id === p.id,
    );
    expect(
      history.filter((t: { status: string }) => t.status === "completed"),
    ).toHaveLength(2);
    expect(
      history.filter((t: { status: string }) => t.status === "refunded"),
    ).toHaveLength(1);
    expect(
      records.leases.filter(
        (l: { propertyId: string; status: string }) =>
          l.propertyId === p.id && l.status === "active",
      ),
    ).toHaveLength(1);
    const current = records.properties.find(
      (v: { id: string }) => v.id === p.id,
    );
    expect(
      (
        await admin.post("/api/admin", {
          data: {
            action: "property",
            property: { ...current, takeover_blocked: true },
          },
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await request.post("/api/takeover", {
          data: {
            propertyId: p.id,
            email: "blocked@example.com",
            ad,
            offerAmount: 500,
          },
        })
      ).status(),
    ).toBe(409);
    await page.context().addCookies((await admin.storageState()).cookies);
    await page.goto("/admin");
    await page.getByRole("button", { name: "Takeovers", exact: true }).click();
    // History accumulates across runs; one refunded contender is enough here.
    await expect(page.getByText(/Sin transferencia/).first()).toBeVisible();
    await expect(
      page.getByText("Tu edificio de SkyCity ha cambiado de manos.", {
        exact: true,
      }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Correos", exact: true }).click();
    await expect(
      page
        .getByText("Tu edificio de SkyCity ha cambiado de manos.", {
          exact: true,
        })
        .first(),
    ).toBeVisible();
  } finally {
    await admin.post("/api/admin", {
      data: { action: "settings", settings: original },
    });
    await admin.dispose();
  }
});
