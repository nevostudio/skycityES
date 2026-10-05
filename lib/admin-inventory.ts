import type { Ad, Lease, PresenceTier, State } from "@/types";
import { DomainError, buildingFor, sweep } from "./engine";
import { makeBuilding } from "./plots";
import { protectionHours } from "./takeover-policy";
import { randomUUID } from "node:crypto";

/**
 * City Hall places a building without a payment: on any free plot and at any size (a
 * skyscraper plot always gets its tower). No transaction is recorded, so it never appears as
 * a purchase; it starts with no value and the usual protection, then anyone can take it over.
 */
export function assignBuilding(
  s: State,
  input: { propertyId: string; email: string; ad: Ad; tier?: PresenceTier },
  adminEmail: string,
  demo: boolean,
  now = Date.now(),
) {
  sweep(s, now);
  const p = s.properties.find(
    (p) =>
      p.id === input.propertyId &&
      p.enabled &&
      (p.inventory === "normal" || p.inventory === "skyscraper"),
  );
  if (!p) throw new DomainError("Elige un solar activo.", 404);
  if (
    buildingFor(s, p.id) ||
    s.leases.some((l) => l.propertyId === p.id && l.status === "active") ||
    s.reservations.some(
      (r) => r.propertyId === p.id && r.status === "reserved",
    ) ||
    s.auctions.some(
      (a) =>
        a.propertyId === p.id &&
        ["live", "awaiting_payment"].includes(a.status),
    )
  )
    throw new DomainError(
      "Este solar ya está ocupado o tiene un pago en curso.",
      409,
    );
  const sky = p.inventory === "skyscraper";
  const tier: PresenceTier = sky ? "LANDMARK" : input.tier || "STARTER";
  p.reservedForBrands = false;
  p.sale = "rental";
  const at = new Date(now).toISOString();
  const lease: Lease = {
    id: `assigned-${randomUUID()}`,
    propertyId: p.id,
    email: input.email,
    ad: { ...input.ad, status: "active" as const },
    startsAt: at,
    status: "active" as const,
    demo,
    autoRenew: false,
    transferable: false,
    presenceTier: tier,
    upgradeHistory: [],
    assignedBy: adminEmail,
  };
  s.leases.push(lease);
  s.buildings.push(
    makeBuilding(p, sky ? "SKYSCRAPER" : tier, at, {
      id: `bld-${lease.id}`,
      leaseId: lease.id,
      demo,
    }),
  );
  // A new controller: invalidate pending offers and protect it like a purchase.
  p.control_version = (p.control_version ?? 0) + 1;
  p.protection_until = new Date(
    now + protectionHours(s) * 3600000,
  ).toISOString();
  return lease;
}

/** Manual skyscraper placement for a major brand: builds the tower, records no payment. */
export function assignSkyscraper(
  s: State,
  input: { propertyId: string; email: string; ad: Ad },
  adminEmail: string,
  demo: boolean,
  now = Date.now(),
) {
  const p = s.properties.find((p) => p.id === input.propertyId);
  if (!p || p.inventory !== "skyscraper" || !p.enabled)
    throw new DomainError("Elige un rascacielos activo.", 404);
  return assignBuilding(s, input, adminEmail, demo, now);
}
