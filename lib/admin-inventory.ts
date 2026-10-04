import { randomUUID } from "node:crypto";
import type { Ad, State } from "@/types";
import { DomainError, sweep } from "./engine";

export function assignSkyscraper(
  s: State,
  input: { propertyId: string; email: string; ad: Ad; days: number },
  adminEmail: string,
  demo: boolean,
  now = Date.now(),
) {
  sweep(s, now);
  const p = s.properties.find(
    (p) =>
      p.id === input.propertyId && p.enabled && p.inventory === "skyscraper",
  );
  if (!p) throw new DomainError("Choose an active skyscraper.", 404);
  if (
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
      "This skyscraper is occupied or has a checkout or auction in progress.",
      409,
    );
  p.reservedForBrands = false;
  p.sale = "rental";
  const lease = {
    id: `assigned-${randomUUID()}`,
    propertyId: p.id,
    email: input.email,
    ad: { ...input.ad, status: "active" as const },
    startsAt: new Date(now).toISOString(),
    expiresAt: new Date(now + input.days * 86400000).toISOString(),
    status: "active" as const,
    demo,
    autoRenew: false,
    transferable: false,
    presenceTier: "LANDMARK" as const,
    upgradeHistory: [],
    assignedBy: adminEmail,
  };
  s.leases.push(lease);
  return lease;
}
