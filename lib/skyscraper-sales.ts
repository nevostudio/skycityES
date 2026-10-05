import type { State } from "@/types";
import { AUCTIONS_ENABLED } from "./features";

/**
 * Versioned migration for cities created while auctions were on: live auctions close (no money
 * was ever taken for a bid), their bidders are told, and every free skyscraper plot goes on sale
 * at its fixed price, open to takeovers. Auctions already awaiting the winner's payment are left
 * to finish normally.
 */
export function migrateSkyscraperSales(s: State) {
  const config = s.settings[0];
  if (AUCTIONS_ENABLED || config.skyscraperSalesVersion === 1) return s;
  const now = new Date().toISOString();
  const pendingPayment = new Set(
    s.auctions
      .filter((a) => a.status === "awaiting_payment")
      .map((a) => a.propertyId),
  );
  for (const a of s.auctions.filter((a) => a.status === "live")) {
    a.status = "closed";
    const p = s.properties.find((p) => p.id === a.propertyId);
    const bidders = new Set(
      s.bids.filter((b) => b.auctionId === a.id).map((b) => b.email),
    );
    for (const email of bidders) {
      const id = `auction-cancelled:${a.id}:${email}`;
      if (!s.mail.some((m) => m.id === id))
        s.mail.push({
          id,
          email,
          subject: "La subasta de SkyCity se ha cancelado",
          text: `Hemos retirado las subastas de SkyCity. Tu puja por ${p?.name || "este rascacielos"} no se ha cobrado. Ahora el solar se puede comprar directamente a precio fijo.`,
          status: "pending",
          createdAt: now,
        });
    }
  }
  for (const p of s.properties.filter((p) => p.inventory === "skyscraper")) {
    if (pendingPayment.has(p.id)) continue;
    p.sale = "rental";
    p.reservedForBrands = false;
    delete p.premiumNote;
    p.takeover_enabled = true;
  }
  config.skyscraperSalesVersion = 1;
  return s;
}
