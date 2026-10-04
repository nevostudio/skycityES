import type { Property, State } from "@/types";

export const CONTROL_NOTICE =
  "Controlarás esta ubicación mientras nadie supere el importe que has pagado.";
export const TRANSFER_NOTICE =
  "Si otra persona supera el valor actual, pasará automáticamente a controlar esta ubicación.";
export const cents = (value: number) => Math.round(value * 100);
export const validMoney = (value: number) =>
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 999999.99 &&
  Math.abs(value * 100 - cents(value)) < 0.000001;
export function protectionHours(s: State) {
  return s.settings[0].takeoverProtectionHours ?? 24;
}
export function takeoverState(s: State, p: Property, now = Date.now()) {
  const b = s.buildings.find((b) => b.propertyId === p.id);
  const lease = s.leases.find(
    (l) => l.propertyId === p.id && l.status === "active",
  );
  const eligible = !!(
    p.enabled &&
    p.inventory === "normal" &&
    !p.reservedForBrands &&
    p.sale === "rental" &&
    p.takeover_enabled &&
    !p.takeover_blocked &&
    s.settings[0].takeoverEnabled &&
    b?.kind === "private" &&
    b.tier !== "SKYSCRAPER" &&
    lease &&
    b.leaseId === lease.id
  );
  const protectedNow =
    !!p.protection_until && Date.parse(p.protection_until) > now;
  const busy = s.reservations.some(
    (r) =>
      r.propertyId === p.id &&
      r.purpose !== "takeover" &&
      r.status === "reserved" &&
      (r.sessionId || Date.parse(r.expiresAt) > now),
  );
  const auction = s.auctions.some(
    (a) =>
      a.propertyId === p.id && ["live", "awaiting_payment"].includes(a.status),
  );
  return {
    eligible,
    open: eligible && !protectedNow && !busy && !auction,
    // Never cheaper than building on an empty plot (covers locations without a recorded payment).
    minimumOffer:
      Math.max(
        cents(p.current_property_value ?? 0) +
          cents(Math.max(1, s.settings[0].takeoverMinimumIncrement ?? 1)),
        cents(p.price ?? 0),
      ) / 100,
    protectionHours: protectionHours(s),
    reason: !eligible
      ? "Takeover no disponible en esta ubicación."
      : protectedNow
        ? "PROTEGIDO"
        : busy || auction
          ? "Hay una operación en curso en esta ubicación."
          : undefined,
  };
}

/** Backfill only from recorded acquisition payments; tier upgrades never change location value. */
export function migrateTakeovers(s: State) {
  s.propertyTakeovers ??= [];
  const config = s.settings[0];
  if (config.takeoverVersion === 1) return s;
  const envHours = Number(process.env.TAKEOVER_PROTECTION_HOURS ?? 24);
  config.takeoverProtectionHours ??=
    Number.isFinite(envHours) && envHours >= 0 && envHours <= 8760
      ? envHours
      : 24;
  config.takeoverMinimumIncrement ??= 1;
  config.takeoverEnabled ??= true;
  for (const p of s.properties) {
    const lease = s.leases.find(
      (l) => l.propertyId === p.id && l.status === "active",
    );
    const paid = s.transactions
      .filter((t) =>
        s.reservations.some(
          (r) =>
            r.id === t.reservationId &&
            r.propertyId === p.id &&
            !r.upgradeLeaseId &&
            !r.renewalLeaseId &&
            (!lease || `lease-${r.id}` === lease.id),
        ),
      )
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
    p.current_property_value ??= paid?.amount ?? 0;
    p.takeover_enabled ??= p.inventory === "normal";
    p.takeover_blocked ??= false;
    p.control_version ??= 0;
    p.takeover_count ??= 0;
    if (lease && !p.protection_until)
      p.protection_until = new Date(
        Date.parse(paid?.createdAt || lease.startsAt) +
          protectionHours(s) * 3600000,
      ).toISOString();
  }
  config.takeoverVersion = 1;
  return s;
}
