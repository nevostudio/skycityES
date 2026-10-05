import { createHash, randomBytes, randomUUID } from "node:crypto";
import type {
  Ad,
  Building,
  CityData,
  EventName,
  Lease,
  PublicProperty,
  Reservation,
  State,
  PresenceTier,
  ValueStep,
} from "@/types";
import { emptyAd } from "./seed";
import {
  PRESENCE,
  buildingFloors,
  claimPrice,
  upgradePrice,
  withBuilding,
} from "./presence";
import { makeBuilding } from "./plots";
import {
  cents,
  validMoney,
  takeoverState,
  protectionHours,
} from "./takeover-policy";
export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
/** How long a freshly built or upgraded building reports CONSTRUCTING. */
export const CONSTRUCTION_MS = 2000;
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const token = () => randomBytes(32).toString("hex");
export function queueMail(
  s: State,
  email: string,
  subject: string,
  text: string,
  id: string = randomUUID(),
) {
  if (!s.mail.some((m) => m.id === id))
    s.mail.push({
      id,
      email,
      subject,
      text,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
}
export function metric(
  s: State,
  event: EventName,
  propertyId = "",
  now = Date.now(),
) {
  const day = new Date(now).toISOString().slice(0, 10);
  const id = `${day}:${event}:${propertyId}`;
  const row = s.analytics.find((e) => e.id === id);
  if (row) row.count++;
  else s.analytics.push({ id, propertyId, event, day, count: 1 });
}
/** Buildings are a one-time purchase: only checkouts and auctions expire. */
export function sweep(s: State, now = Date.now()) {
  for (const r of s.reservations)
    if (
      r.status === "reserved" &&
      !r.sessionId &&
      Date.parse(r.expiresAt) <= now
    )
      r.status = "expired";
  for (const auction of s.auctions) {
    if (
      auction.status === "awaiting_payment" &&
      s.reservations.some(
        (r) => r.id === auction.reservationId && r.status === "expired",
      )
    )
      auction.status = "closed";
  }
}
const activeLeaseFor = (s: State, propertyId: string) =>
  s.leases.find((l) => l.propertyId === propertyId && l.status === "active");
export const buildingFor = (s: State, propertyId: string) =>
  s.buildings.find((b) => b.propertyId === propertyId);
function buildingView(b: Building, model: number, now: number) {
  const changed = Date.parse(b.upgradedAt || b.builtAt);
  return {
    state:
      now - changed < CONSTRUCTION_MS
        ? ("CONSTRUCTING" as const)
        : ("BUILT" as const),
    tier: b.tier,
    kind: b.kind,
    floors: buildingFloors(b.tier, model),
    builtAt: b.builtAt,
    upgradedAt: b.upgradedAt,
    previousTier: b.previousTier,
  };
}
/**
 * Only recorded, settled payments: the initial purchase of the location and each completed
 * takeover. Upgrades, refunds and demo showcases without payment never appear.
 */
function valueHistories(s: State) {
  const out = new Map<string, ValueStep[]>();
  const reservations = new Map(s.reservations.map((r) => [r.id, r]));
  const push = (propertyId: string, step: ValueStep) =>
    out.set(propertyId, [...(out.get(propertyId) || []), step]);
  for (const t of s.transactions) {
    const r = reservations.get(t.reservationId);
    if (
      !r ||
      r.upgradeLeaseId ||
      r.renewalLeaseId ||
      r.purpose === "takeover" ||
      (t.outcome && t.outcome !== "fulfilled")
    )
      continue;
    push(r.propertyId, {
      kind: "build",
      amount: t.amount,
      at: t.createdAt,
      brand: r.ad.brand,
    });
  }
  for (const t of s.propertyTakeovers)
    if (t.status === "completed")
      push(t.property_id, {
        kind: "takeover",
        amount: t.takeover_amount,
        at: t.created_at,
        brand: reservations.get(t.reservation_id)?.ad.brand || "",
      });
  for (const steps of out.values())
    steps.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return out;
}
export function citySnapshot(
  s: State,
  demo: boolean,
  now = Date.now(),
): CityData {
  const history = valueHistories(s);
  const properties: PublicProperty[] = s.properties
    .filter((p) => p.enabled)
    .map((p) => {
      const lease = activeLeaseFor(s, p.id);
      const b = buildingFor(s, p.id);
      const reserved = s.reservations.some(
        (r) =>
          r.propertyId === p.id &&
          r.status === "reserved" &&
          !r.upgradeLeaseId &&
          (r.sessionId || Date.parse(r.expiresAt) > now),
      );
      const a = s.auctions.find(
        (a) =>
          a.propertyId === p.id &&
          a.status === "live" &&
          Date.parse(a.endsAt) > now,
      );
      const bids = a
        ? s.bids
            .filter((b) => b.auctionId === a.id)
            .sort((a, b) => b.amount - a.amount)
        : [];
      return {
        ...withBuilding(p, b?.tier ?? null),
        building: b ? buildingView(b, p.model, now) : null,
        presenceTier: lease?.presenceTier,
        takeover: takeoverState(s, p, now),
        valueHistory: history.get(p.id) || [],
        status:
          b?.kind === "public"
            ? "public"
            : lease || b
              ? "claimed"
              : reserved || p.reservedForBrands
                ? "reserved"
                : a || p.sale === "auction"
                  ? "auction"
                  : "available",
        ad: lease
          ? lease.ad.status === "active"
            ? lease.ad
            : undefined
          : b?.branding,
        views: s.analytics
          .filter((e) => e.propertyId === p.id && e.event === "property_open")
          .reduce((a, e) => a + e.count, 0),
        auction: a
          ? {
              ...a,
              currentBid: bids[0]?.amount ?? 0,
              nextBid: bids.length
                ? bids[0].amount + a.increment
                : a.startingBid,
              bidders: new Set(bids.map((b) => b.email)).size,
              history: bids.slice(0, 8).map((b) => ({
                amount: b.amount,
                createdAt: b.createdAt,
                bidder: `Postor ${b.email.split("").reduce((n, c) => n + c.charCodeAt(0), 0) % 999}`,
              })),
            }
          : undefined,
      };
    });
  const built = properties.filter((p) => p.building);
  const today = new Date(now).toISOString().slice(0, 10);
  const standing = new Set(built.map((p) => p.id));
  return {
    demo,
    properties,
    districts: s.districts,
    // Retired seed showcases no longer stand in the city.
    activity: s.activity
      .filter(
        (a) => !a.id.startsWith("seed-activity-") || standing.has(a.propertyId),
      )
      .slice(-30)
      .reverse(),
    stats: {
      plots: properties.length,
      built: built.length,
      privateBuilt: built.filter((p) => p.building!.kind === "private").length,
      publicBuilt: built.filter((p) => p.building!.kind === "public").length,
      available: properties.filter((p) => p.status === "available").length,
      reserved: properties.filter((p) => p.status === "reserved").length,
      builtPercent: properties.length
        ? Math.round((built.length / properties.length) * 100)
        : 0,
      owners: new Set(
        s.leases.filter((l) => l.status === "active").map((l) => l.email),
      ).size,
      builtToday: s.activity.filter(
        (a) => a.action === "claimed" && a.createdAt.slice(0, 10) === today,
      ).length,
      auctions: properties.filter((p) => p.auction).length,
    },
  };
}
export function reserve(
  s: State,
  input: {
    propertyId: string;
    email: string;
    ad: Ad;
    upgradeLeaseId?: string;
    renewalLeaseId?: string;
    presenceTier?: PresenceTier;
  },
  demo: boolean,
  now = Date.now(),
) {
  sweep(s, now);
  if (input.renewalLeaseId)
    throw new DomainError(
      "Los edificios son de pago único: no hay renovaciones.",
    );
  const p = s.properties.find((p) => p.id === input.propertyId && p.enabled);
  if (
    !p ||
    p.inventory === "public" ||
    p.reservedForBrands ||
    p.sale !== "rental" ||
    s.auctions.some(
      (a) =>
        a.propertyId === p.id &&
        ["live", "awaiting_payment"].includes(a.status),
    )
  )
    throw new DomainError("Este solar no está disponible para construir.", 409);
  const existing = activeLeaseFor(s, p.id);
  const currentTier = existing?.presenceTier || "STARTER";
  const targetTier = input.presenceTier || "STARTER";
  if (!Object.hasOwn(PRESENCE, targetTier))
    throw new DomainError("Tamaño de edificio no válido.");
  if (input.upgradeLeaseId) {
    if (p.inventory === "skyscraper")
      throw new DomainError("Los rascacielos tienen su propia categoría.");
    if (
      !existing ||
      existing.id !== input.upgradeLeaseId ||
      existing.email !== input.email
    )
      throw new DomainError(
        "Solo el propietario puede mejorar este edificio.",
        403,
      );
    if (PRESENCE[targetTier].price <= PRESENCE[currentTier].price)
      throw new DomainError("Elige un tamaño superior al actual.");
  }
  if ((existing || buildingFor(s, p.id)) && !input.upgradeLeaseId)
    throw new DomainError("Alguien ya ha construido en este solar.", 409);
  if (
    s.reservations.some((r) => r.propertyId === p.id && r.status === "reserved")
  )
    throw new DomainError(
      "Alguien está construyendo aquí ahora mismo. Prueba otro solar.",
      409,
    );
  const access = token();
  const r: Reservation = {
    propertyId: input.propertyId,
    email: input.email,
    upgradeLeaseId: input.upgradeLeaseId,
    id: randomUUID(),
    presenceTier: p.inventory === "skyscraper" ? "LANDMARK" : targetTier,
    fromTier: input.upgradeLeaseId ? currentTier : undefined,
    days: 0,
    amount: input.upgradeLeaseId
      ? upgradePrice(currentTier, targetTier)
      : claimPrice(p, targetTier),
    ad: {
      ...(input.upgradeLeaseId ? existing!.ad : input.ad),
      status: s.settings[0].moderation === "review" ? "pending" : "active",
    },
    expiresAt: new Date(
      now + (demo ? s.settings[0].reservationMinutes : 30) * 60000,
    ).toISOString(),
    status: "reserved",
    accessHash: hash(access),
  };
  s.reservations.push(r);
  metric(s, "checkout_started", p.id, now);
  return { reservation: r, access };
}
export function fulfill(
  s: State,
  reservationId: string,
  transactionId: string,
  amount: number,
  provider: "demo" | "stripe",
  now = Date.now(),
  stripePaymentId?: string,
) {
  const duplicate = s.transactions.find(
    (t) =>
      t.id === transactionId ||
      t.reservationId === reservationId ||
      (!!stripePaymentId && t.stripePaymentId === stripePaymentId),
  );
  if (duplicate && duplicate.reservationId !== reservationId)
    throw new DomainError("Este pago ya pertenece a otra reserva.", 409);
  if (duplicate) {
    if (duplicate.outcome && duplicate.outcome !== "fulfilled")
      return undefined;
    const r = s.reservations.find((r) => r.id === reservationId);
    return s.leases.find(
      (l) =>
        l.id ===
        (r?.upgradeLeaseId || r?.renewalLeaseId || `lease-${reservationId}`),
    );
  }
  const r = s.reservations.find((r) => r.id === reservationId);
  if (r?.purpose === "takeover")
    return fulfillTakeover(
      s,
      r,
      transactionId,
      amount,
      provider,
      now,
      stripePaymentId,
    );
  if (
    !r ||
    r.status !== "reserved" ||
    (provider === "demo" && Date.parse(r.expiresAt) <= now)
  )
    throw new DomainError("Esta reserva ha caducado.", 409);
  if (Math.round(amount * 100) !== Math.round(r.amount * 100))
    throw new DomainError("El importe pagado no coincide con la reserva.", 409);
  const p = s.properties.find((p) => p.id === r.propertyId);
  if (!p) throw new DomainError("Solar no encontrado.", 404);
  const occupied = activeLeaseFor(s, r.propertyId);
  const ownLease = r.upgradeLeaseId || r.renewalLeaseId;
  if (
    (occupied && occupied.id !== ownLease) ||
    (!ownLease && buildingFor(s, p.id))
  )
    throw new DomainError(
      "El solar ya tiene edificio. El pago necesita conciliación.",
      409,
    );
  let lease = occupied;
  const at = new Date(now).toISOString();
  if (
    r.upgradeLeaseId &&
    (!lease ||
      lease.id !== r.upgradeLeaseId ||
      lease.email !== r.email ||
      (lease.presenceTier || "STARTER") !== r.fromTier)
  )
    throw new DomainError(
      "La mejora ya no coincide con el edificio actual. El pago necesita conciliación.",
      409,
    );
  if (lease && r.upgradeLeaseId) {
    lease.presenceTier = r.presenceTier!;
    (lease.upgradeHistory ??= []).push({
      reservationId: r.id,
      transactionId,
      from: r.fromTier!,
      to: r.presenceTier!,
      amount: r.amount,
      createdAt: at,
    });
    const b = buildingFor(s, p.id);
    if (b) {
      b.previousTier = b.tier;
      b.tier = r.presenceTier!;
      b.upgradedAt = at;
    }
  } else if (r.renewalLeaseId) {
    // Legacy renewal paid after the switch to one-time payments: keep the payment on record.
    lease ??= s.leases.find((l) => l.id === r.renewalLeaseId);
    if (!lease) throw new DomainError("Edificio no encontrado.", 404);
  } else {
    lease = {
      id: `lease-${r.id}`,
      propertyId: r.propertyId,
      email: r.email,
      ad: r.ad,
      startsAt: at,
      status: "active",
      demo: provider === "demo",
      autoRenew: false,
      transferable: false,
      presenceTier: r.presenceTier || "STARTER",
      upgradeHistory: [],
    };
    s.leases.push(lease);
    s.buildings.push(
      makeBuilding(
        p,
        p.inventory === "skyscraper" ? "SKYSCRAPER" : lease.presenceTier!,
        at,
        { id: `bld-${lease.id}`, leaseId: lease.id, demo: lease.demo },
      ),
    );
    p.current_property_value = r.amount;
    p.protection_until = new Date(
      now + protectionHours(s) * 3600000,
    ).toISOString();
    p.control_version = (p.control_version || 0) + 1;
  }
  r.status = "paid";
  s.transactions.push({
    id: transactionId,
    reservationId: r.id,
    amount: r.amount,
    email: r.email,
    createdAt: at,
    provider,
    stripePaymentId,
  });
  s.activity.push({
    id: randomUUID(),
    propertyId: r.propertyId,
    brand: r.ad.brand,
    action: r.upgradeLeaseId
      ? "upgraded"
      : r.renewalLeaseId
        ? "renewed"
        : "claimed",
    createdAt: at,
    demo: provider === "demo",
  });
  metric(s, "checkout_completed", r.propertyId, now);
  metric(
    s,
    r.upgradeLeaseId
      ? "upgrade_completed"
      : r.renewalLeaseId
        ? "renewal_completed"
        : "claim_completed",
    r.propertyId,
    now,
  );
  queueMail(
    s,
    r.email,
    r.upgradeLeaseId
      ? "Tu edificio de SkyCity ha crecido"
      : "Bienvenido a SkyCity",
    `${lease.ad.brand} · ${p.name} · ${lease.presenceTier}. ${r.upgradeLeaseId ? `Mejora ${r.fromTier} → ${r.presenceTier}: ${r.amount} €.` : "Tu edificio ya está construido."} Pago único, sin renovaciones. Entra en Mis edificios para pedir un enlace de acceso seguro.`,
    `confirmation:${r.id}`,
  );
  const auction = s.auctions.find((a) => a.reservationId === r.id);
  if (auction) auction.status = "settled";
  return lease;
}
/** Multiple contenders may pay; only the first valid settlement of this control version wins. */
export function reserveTakeover(
  s: State,
  input: { propertyId: string; email: string; ad: Ad; offerAmount: number },
  demo: boolean,
  now = Date.now(),
) {
  sweep(s, now);
  const p = s.properties.find((p) => p.id === input.propertyId);
  if (!p) throw new DomainError("Solar no encontrado.", 404);
  const policy = takeoverState(s, p, now);
  if (!policy.open)
    throw new DomainError(policy.reason || "Takeover no disponible.", 409);
  if (
    !validMoney(input.offerAmount) ||
    cents(input.offerAmount) < cents(policy.minimumOffer)
  )
    throw new DomainError(
      `El importe mínimo es ${policy.minimumOffer} €.`,
      409,
    );
  const lease = activeLeaseFor(s, p.id)!;
  if (lease.email === input.email)
    throw new DomainError("Ya controlas esta ubicación.", 409);
  const access = token();
  const reservation: Reservation = {
    id: randomUUID(),
    propertyId: p.id,
    email: input.email,
    ad: {
      ...input.ad,
      status: s.settings[0].moderation === "review" ? "pending" : "active",
    },
    purpose: "takeover",
    expectedControllerId: lease.id,
    expectedPropertyValue: p.current_property_value ?? 0,
    expectedControlVersion: p.control_version ?? 0,
    presenceTier: lease.presenceTier || "STARTER",
    days: 0,
    amount: input.offerAmount,
    status: "reserved",
    accessHash: hash(access),
    expiresAt: new Date(
      now + (demo ? s.settings[0].reservationMinutes : 30) * 60000,
    ).toISOString(),
  };
  s.reservations.push(reservation);
  return { reservation, access };
}

function fulfillTakeover(
  s: State,
  r: Reservation,
  transactionId: string,
  amount: number,
  provider: "demo" | "stripe",
  now: number,
  stripePaymentId?: string,
) {
  if (!validMoney(amount) || amount <= 0)
    throw new DomainError("Importe de pago no válido.", 409);
  if (provider === "stripe" && !stripePaymentId)
    throw new DomainError("Falta el identificador del pago.", 409);
  const p = s.properties.find((p) => p.id === r.propertyId);
  const old = activeLeaseFor(s, r.propertyId);
  const b = buildingFor(s, r.propertyId);
  const policy = p && takeoverState(s, p, now);
  const conflict =
    r.status !== "reserved" ||
    (provider === "demo" && Date.parse(r.expiresAt) <= now)
      ? "La reserva ya no está vigente."
      : !policy?.open
        ? policy?.reason || "Ubicación no disponible."
        : !old ||
            old.id !== r.expectedControllerId ||
            old.email === r.email ||
            (p!.control_version ?? 0) !== r.expectedControlVersion ||
            cents(p!.current_property_value ?? 0) !==
              cents(r.expectedPropertyValue ?? -1)
          ? "El controlador o el valor cambiaron durante el pago."
          : cents(amount) !== cents(r.amount) ||
              cents(amount) < cents(policy.minimumOffer)
            ? "El importe ya no cumple las condiciones actuales."
            : undefined;
  const at = new Date(now).toISOString();
  const record = {
    id: `takeover-${r.id}`,
    property_id: r.propertyId,
    reservation_id: r.id,
    previous_controller_id: r.expectedControllerId!,
    previous_value: r.expectedPropertyValue!,
    takeover_amount: amount,
    stripe_payment_id: stripePaymentId,
    transaction_id: transactionId,
    created_at: at,
  };
  s.transactions.push({
    id: transactionId,
    reservationId: r.id,
    amount,
    email: r.email,
    createdAt: at,
    provider,
    stripePaymentId,
    outcome: conflict
      ? provider === "demo"
        ? "refunded"
        : "refund_pending"
      : "fulfilled",
  });
  if (conflict) {
    r.status = "conflict";
    s.propertyTakeovers.push({
      ...record,
      status: provider === "demo" ? "refunded" : "refund_pending",
      conflict_reason: conflict,
    });
    queueMail(
      s,
      r.email,
      "Tu takeover de SkyCity no se ha completado",
      `${conflict} No has obtenido esta ubicación. ${provider === "demo" ? "Pago de demostración anulado: no se ha cobrado dinero." : "Se tramitará la devolución íntegra de tu pago."}`,
      `takeover-conflict:${r.id}`,
    );
    return undefined;
  }
  const lease: Lease = {
    id: `lease-${r.id}`,
    propertyId: r.propertyId,
    email: r.email,
    ad: r.ad,
    startsAt: at,
    status: "active",
    demo: provider === "demo",
    autoRenew: false,
    transferable: false,
    presenceTier: old!.presenceTier || "STARTER",
    upgradeHistory: [],
  };
  old!.status = "expired";
  s.leases.push(lease);
  b!.leaseId = lease.id;
  p!.current_property_value = amount;
  p!.last_takeover_amount = amount;
  p!.last_takeover_at = at;
  p!.takeover_count = (p!.takeover_count || 0) + 1;
  p!.control_version = (p!.control_version || 0) + 1;
  p!.protection_until = new Date(
    now + protectionHours(s) * 3600000,
  ).toISOString();
  r.status = "paid";
  s.propertyTakeovers.push({
    ...record,
    new_controller_id: lease.id,
    status: "completed",
  });
  queueMail(
    s,
    old!.email,
    "Tu edificio de SkyCity ha cambiado de manos.",
    `Solar #${p!.number}\nValor anterior: ${record.previous_value} €\nNuevo valor: ${amount} €\nTu marca ya no controla esta ubicación.`,
    `takeover-previous:${r.id}`,
  );
  queueMail(
    s,
    lease.email,
    "Ya controlas esta ubicación de SkyCity",
    `Solar #${p!.number} · Valor actual: ${amount} €. El edificio conserva su tamaño y tier. Controlarás esta ubicación mientras nadie supere el importe que has pagado. Protegido hasta ${p!.protection_until}. Entra en Mis edificios para editar tu marca.`,
    `confirmation:takeover-${r.id}`,
  );
  return lease;
}
export function placeBid(
  s: State,
  auctionId: string,
  email: string,
  amount: number,
  demo: boolean,
  now = Date.now(),
) {
  const a = s.auctions.find((a) => a.id === auctionId && a.status === "live");
  if (!a || Date.parse(a.endsAt) <= now)
    throw new DomainError("Esta subasta ha terminado.", 409);
  const prev = s.bids
    .filter((b) => b.auctionId === a.id)
    .sort((a, b) => b.amount - a.amount)[0];
  const min = prev ? prev.amount + a.increment : a.startingBid;
  if (
    !Number.isFinite(amount) ||
    amount < min ||
    amount > 100000 ||
    Math.round(amount * 100) !== amount * 100
  )
    throw new DomainError(`La siguiente puja debe ser de al menos ${min} €.`);
  s.bids.push({
    id: randomUUID(),
    auctionId: a.id,
    email,
    amount,
    createdAt: new Date(now).toISOString(),
  });
  s.activity.push({
    id: randomUUID(),
    propertyId: a.propertyId,
    brand: "Un explorador de la ciudad",
    action: "bid",
    amount,
    createdAt: new Date(now).toISOString(),
    demo,
  });
  metric(s, "auction_bid", a.propertyId, now);
  if (prev && prev.email !== email)
    queueMail(
      s,
      prev.email,
      "Han superado tu puja en SkyCity",
      `La nueva puja por ${a.propertyId} es de ${amount} €.`,
    );
}
export function closeAuctions(
  s: State,
  demo: boolean,
  baseUrl: string,
  now = Date.now(),
) {
  for (const a of s.auctions)
    if (a.status === "live" && Date.parse(a.endsAt) <= now) {
      const winner = s.bids
        .filter((b) => b.auctionId === a.id)
        .sort((a, b) => b.amount - a.amount)[0];
      if (!winner) {
        a.status = "closed";
        continue;
      }
      const secret = token();
      const r: Reservation = {
        id: randomUUID(),
        propertyId: a.propertyId,
        email: winner.email,
        ad: { ...emptyAd, brand: "Nuevo vecino" },
        days: 0,
        amount: winner.amount,
        presenceTier: "LANDMARK",
        expiresAt: new Date(now + 24 * 3600000).toISOString(),
        status: "reserved",
        accessHash: hash(secret),
      };
      s.reservations.push(r);
      a.winnerEmail = winner.email;
      a.reservationId = r.id;
      a.status = "awaiting_payment";
      if (demo) fulfill(s, r.id, `demo-auction-${a.id}`, r.amount, "demo", now);
      else
        queueMail(
          s,
          winner.email,
          "Has ganado una subasta en SkyCity",
          `Completa el pago en las próximas 24 horas: ${baseUrl}/auction-payment?reservation=${r.id}&access=${secret}`,
          `winner:${a.id}`,
        );
    }
}
