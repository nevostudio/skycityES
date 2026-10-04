import { createHash, randomBytes, randomUUID } from "node:crypto";
import type {
  Ad,
  CityData,
  EventName,
  PublicProperty,
  Reservation,
  State,
  PresenceTier,
} from "@/types";
import { emptyAd } from "./seed";
import { PRESENCE, claimPrice, visualProperty } from "./presence";
export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
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
  for (const l of s.leases)
    if (l.status === "active") {
      const left = Date.parse(l.expiresAt) - now;
      if (left <= 0) {
        l.status = "expired";
        queueMail(
          s,
          l.email,
          "Your SkyCity spot is available again",
          `Your lease for ${l.propertyId} has expired. Explore the city to claim it again.`,
          `expired:${l.id}:${l.expiresAt}`,
        );
      } else
        for (const days of [7, 3, 1])
          if (
            left <= days * 86400000 &&
            left > (days === 7 ? 3 : days === 3 ? 1 : 0) * 86400000
          )
            queueMail(
              s,
              l.email,
              `${days === 1 ? "24 hours" : `${days} days`} remaining in SkyCity`,
              `Renew ${l.propertyId} from My Buildings before ${l.expiresAt}.`,
              `reminder:${l.id}:${l.expiresAt}:${days}`,
            );
    }
}
export function citySnapshot(
  s: State,
  demo: boolean,
  now = Date.now(),
): CityData {
  const properties: PublicProperty[] = s.properties
    .filter((p) => p.enabled)
    .map((p) => {
      const lease = s.leases.find(
        (l) =>
          l.propertyId === p.id &&
          l.status === "active" &&
          Date.parse(l.expiresAt) > now,
      );
      const reserved = s.reservations.some(
        (r) =>
          r.propertyId === p.id &&
          r.status === "reserved" &&
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
        ...visualProperty(p, lease?.presenceTier),
        presenceTier: lease?.presenceTier || "STARTER",
        prices: Object.fromEntries(
          Object.entries(p.prices).filter(([days]) =>
            s.settings[0].durations.includes(Number(days)),
          ),
        ),
        status: lease
          ? "claimed"
          : reserved || p.reservedForBrands
            ? "reserved"
            : a || p.sale === "auction"
              ? "auction"
              : "available",
        ad: lease?.ad.status === "active" ? lease.ad : undefined,
        expiresAt: lease?.expiresAt,
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
              history: bids.slice(0, 8).map((b, i) => ({
                amount: b.amount,
                createdAt: b.createdAt,
                bidder: `Bidder ${b.email.split("").reduce((n, c) => n + c.charCodeAt(0), 0) % 999}`,
              })),
            }
          : undefined,
      };
    });
  const claimed = properties.filter((p) => p.status === "claimed").length;
  return {
    demo,
    properties,
    districts: s.districts,
    activity: s.activity.slice(-30).reverse(),
    durations: s.settings[0].durations,
    stats: {
      total: properties.length,
      claimed,
      available: properties.filter((p) => p.status === "available").length,
      reserved: properties.filter((p) => p.status === "reserved").length,
      advertisers: new Set(
        s.leases
          .filter((l) => l.status === "active" && Date.parse(l.expiresAt) > now)
          .map((l) => l.email),
      ).size,
      occupancy: properties.length
        ? Math.round((claimed / properties.length) * 100)
        : 0,
      claimsToday: s.activity.filter(
        (a) =>
          a.action === "claimed" &&
          a.createdAt.slice(0, 10) === new Date(now).toISOString().slice(0, 10),
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
    days: number;
    ad: Ad;
    renewalLeaseId?: string;
    upgradeLeaseId?: string;
    presenceTier?: PresenceTier;
  },
  demo: boolean,
  now = Date.now(),
) {
  sweep(s, now);
  const p = s.properties.find((p) => p.id === input.propertyId && p.enabled);
  if (
    !p ||
    p.reservedForBrands ||
    p.sale !== "rental" ||
    s.auctions.some(
      (a) =>
        a.propertyId === p.id &&
        ["live", "awaiting_payment"].includes(a.status),
    )
  )
    throw new DomainError(
      "This property is not available for a direct claim.",
      409,
    );
  const existing = s.leases.find(
    (l) => l.propertyId === p.id && l.status === "active",
  );
  if (
    input.renewalLeaseId &&
    (!existing ||
      existing.id !== input.renewalLeaseId ||
      existing.email !== input.email)
  )
    throw new DomainError("This lease cannot be renewed.", 403);
  if (input.renewalLeaseId && input.upgradeLeaseId)
    throw new DomainError("Choose either renewal or upgrade.");
  const currentTier = existing?.presenceTier || "STARTER";
  const targetTier = input.renewalLeaseId
    ? currentTier
    : input.presenceTier || "STARTER";
  if (!Object.hasOwn(PRESENCE, targetTier))
    throw new DomainError("Invalid presence tier.");
  if (input.upgradeLeaseId) {
    if (p.inventory === "skyscraper")
      throw new DomainError("Skyscrapers have their own exclusive presence.");
    if (
      !existing ||
      existing.id !== input.upgradeLeaseId ||
      existing.email !== input.email
    )
      throw new DomainError(
        "Only the current owner can upgrade this lease.",
        403,
      );
    if (Date.parse(existing.expiresAt) <= now + 31 * 60000)
      throw new DomainError(
        "Renew your lease before upgrading; less than 31 minutes remain.",
        409,
      );
    if (PRESENCE[targetTier].price <= PRESENCE[currentTier].price)
      throw new DomainError("Choose a higher presence tier.");
  }
  if (existing && !input.renewalLeaseId && !input.upgradeLeaseId)
    throw new DomainError("Someone has already claimed this building.", 409);
  if (
    s.reservations.some((r) => r.propertyId === p.id && r.status === "reserved")
  )
    throw new DomainError(
      "This building is temporarily reserved. Try another spot.",
      409,
    );
  if (
    (p.inventory !== "skyscraper" && input.days !== 30) ||
    !s.settings[0].durations.includes(input.days) ||
    !p.prices[String(input.days)]
  )
    throw new DomainError("Choose an available lease duration.");
  const access = token();
  const r: Reservation = {
    ...input,
    id: randomUUID(),
    presenceTier: p.inventory === "skyscraper" ? "LANDMARK" : targetTier,
    fromTier: input.upgradeLeaseId ? currentTier : undefined,
    days: input.upgradeLeaseId ? 0 : input.days,
    amount: input.upgradeLeaseId
      ? PRESENCE[targetTier].price - PRESENCE[currentTier].price
      : claimPrice(p, targetTier, input.days),
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
) {
  const duplicate = s.transactions.find(
    (t) => t.id === transactionId || t.reservationId === reservationId,
  );
  if (duplicate && duplicate.reservationId !== reservationId)
    throw new DomainError(
      "Payment already belongs to another reservation.",
      409,
    );
  if (duplicate)
    return (
      s.leases.find((l) => l.id === `lease-${reservationId}`) ||
      s.leases.find(
        (l) =>
          l.id ===
          (s.reservations.find((r) => r.id === reservationId)?.upgradeLeaseId ||
            s.reservations.find((r) => r.id === reservationId)?.renewalLeaseId),
      )
    );
  const r = s.reservations.find((r) => r.id === reservationId);
  if (
    !r ||
    r.status !== "reserved" ||
    (provider === "demo" && Date.parse(r.expiresAt) <= now)
  )
    throw new DomainError("This reservation has expired.", 409);
  if (Math.round(amount * 100) !== Math.round(r.amount * 100))
    throw new DomainError("Payment amount does not match reservation.", 409);
  const occupied = s.leases.find(
    (l) =>
      l.propertyId === r.propertyId &&
      l.status === "active" &&
      Date.parse(l.expiresAt) > now,
  );
  if (occupied && occupied.id !== (r.upgradeLeaseId || r.renewalLeaseId))
    throw new DomainError(
      "Property is already occupied. Payment needs reconciliation.",
      409,
    );
  let lease = occupied;
  if (
    r.upgradeLeaseId &&
    (!lease ||
      lease.id !== r.upgradeLeaseId ||
      lease.email !== r.email ||
      (lease.presenceTier || "STARTER") !== r.fromTier)
  )
    throw new DomainError(
      "The upgrade no longer matches this active lease. Payment needs reconciliation.",
      409,
    );
  if (r.renewalLeaseId && !lease)
    lease = s.leases.find((l) => l.id === r.renewalLeaseId);
  if (lease && r.upgradeLeaseId) {
    lease.presenceTier = r.presenceTier!;
    (lease.upgradeHistory ??= []).push({
      reservationId: r.id,
      transactionId,
      from: r.fromTier!,
      to: r.presenceTier!,
      amount: r.amount,
      createdAt: new Date(now).toISOString(),
    });
  } else if (lease) {
    lease.ad = {
      ...r.ad,
      status: ["suspended", "rejected"].includes(lease.ad.status)
        ? lease.ad.status
        : r.ad.status,
    };
    lease.expiresAt = new Date(
      Math.max(now, Date.parse(lease.expiresAt)) + r.days * 86400000,
    ).toISOString();
    lease.status = "active";
    lease.presenceTier = r.presenceTier || lease.presenceTier || "STARTER";
  } else {
    lease = {
      id: `lease-${r.id}`,
      propertyId: r.propertyId,
      email: r.email,
      ad: r.ad,
      startsAt: new Date(now).toISOString(),
      expiresAt: new Date(now + r.days * 86400000).toISOString(),
      status: "active",
      demo: provider === "demo",
      autoRenew: false,
      transferable: false,
      presenceTier: r.presenceTier || "STARTER",
      upgradeHistory: [],
    };
    s.leases.push(lease);
  }
  r.status = "paid";
  s.transactions.push({
    id: transactionId,
    reservationId: r.id,
    amount: r.amount,
    email: r.email,
    createdAt: new Date(now).toISOString(),
    provider,
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
    createdAt: new Date(now).toISOString(),
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
      ? "Your SkyCity presence is upgraded"
      : r.renewalLeaseId
        ? "Your SkyCity building is renewed"
        : "Welcome to SkyCity",
    `${lease.ad.brand} · ${r.propertyId} · ${lease.presenceTier}. ${r.upgradeLeaseId ? `Upgrade ${r.fromTier} → ${r.presenceTier}: €${r.amount}.` : "Placement confirmed."} Your lease ends ${lease.expiresAt}. Open My Buildings to request a secure access link.`,
    `confirmation:${r.id}`,
  );
  const auction = s.auctions.find((a) => a.reservationId === r.id);
  if (auction) auction.status = "settled";
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
    throw new DomainError("This auction has ended.", 409);
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
    throw new DomainError(`The next bid must be at least €${min}.`);
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
    brand: "A city explorer",
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
      "You have been outbid in SkyCity",
      `The new bid for ${a.propertyId} is €${amount}.`,
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
        ad: { ...emptyAd, brand: "New city resident" },
        days: a.days,
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
          "You won a SkyCity auction",
          `Complete your payment within 24 hours: ${baseUrl}/auction-payment?reservation=${r.id}&access=${secret}`,
          `winner:${a.id}`,
        );
    }
}
