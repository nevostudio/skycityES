import type { Ad, Lease, State } from "@/types";
import { DomainError, buildingFor, sweep } from "./engine";
import { makeBuilding } from "./plots";
import { randomUUID } from "node:crypto";

/** Manual skyscraper placement for a major brand: builds the tower, records no payment. */
export function assignSkyscraper(
  s: State,
  input: { propertyId: string; email: string; ad: Ad },
  adminEmail: string,
  demo: boolean,
  now = Date.now(),
) {
  sweep(s, now);
  const p = s.properties.find(
    (p) =>
      p.id === input.propertyId && p.enabled && p.inventory === "skyscraper",
  );
  if (!p) throw new DomainError("Elige un rascacielos activo.", 404);
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
      "Este rascacielos ya está ocupado o tiene un pago o una subasta en curso.",
      409,
    );
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
    presenceTier: "LANDMARK" as const,
    upgradeHistory: [],
    assignedBy: adminEmail,
  };
  s.leases.push(lease);
  s.buildings.push(
    makeBuilding(p, "SKYSCRAPER", at, {
      id: `bld-${lease.id}`,
      leaseId: lease.id,
      demo,
    }),
  );
  return lease;
}
