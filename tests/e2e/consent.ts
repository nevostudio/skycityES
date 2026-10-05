import type { Page } from "@playwright/test";

/** Purchase API payloads must carry the buyer's explicit acceptance. */
export const consent = { terms: true, immediate: true } as const;

/** Ticks the two checkout acceptance boxes before paying. */
export async function acceptTerms(page: Page) {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: /condiciones de compra/ }).check();
  await dialog
    .getByRole("checkbox", { name: /derecho de desistimiento/ })
    .check();
}
