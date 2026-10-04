import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireIdentity } from "@/lib/auth";
import { readState, transaction } from "@/lib/store";
import { DomainError, citySnapshot, closeAuctions, sweep } from "@/lib/engine";
import { isDemo, appUrl } from "@/lib/config";
import { checkOrigin, fail } from "@/lib/http";
import { adSchema, emailSchema } from "@/lib/validation";
import { assignSkyscraper } from "@/lib/admin-inventory";
import type { Ad } from "@/types";
const propertySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  districtId: z.string(),
  type: z.enum([
    "house",
    "shop",
    "restaurant",
    "office",
    "apartment",
    "tower",
    "warehouse",
    "nightclub",
    "hotel",
    "mall",
    "billboard",
    "landmark",
  ]),
  tier: z.enum(["STANDARD", "POPULAR", "PREMIUM", "ICONIC"]),
  x: z.number().min(-60).max(60),
  z: z.number().min(-60).max(60),
  height: z.number().min(1).max(35),
  width: z.number().min(1).max(10),
  depth: z.number().min(1).max(10),
  rotation: z.number().min(-7).max(7),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  prices: z.record(z.string().regex(/^\d+$/), z.number().min(1).max(100000)),
  sale: z.enum(["rental", "auction"]),
  featured: z.boolean(),
  enabled: z.boolean(),
  inventory: z.enum(["normal", "skyscraper"]).default("normal"),
  reservedForBrands: z.boolean().default(false),
});
export async function GET() {
  try {
    await requireIdentity(true);
    const s = await readState();
    return Response.json(
      {
        properties: s.properties,
        districts: s.districts,
        leases: s.leases,
        auctions: s.auctions,
        bids: s.bids,
        transactions: s.transactions,
        settings: s.settings[0],
        mail: s.mail,
        stats: citySnapshot(s, isDemo()).stats,
        customers: [...new Set(s.leases.map((l) => l.email))],
        revenue: s.transactions.reduce((a, t) => a + t.amount, 0),
        clicks: s.analytics
          .filter((e) => e.event === "external_link_click")
          .reduce((a, e) => a + e.count, 0),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const admin = await requireIdentity(true);
    const input = await req.json();
    await transaction((s) => {
      sweep(s);
      if (input.action === "property") {
        const p = propertySchema.parse(input.property);
        if (!s.districts.some((d) => d.id === p.districtId))
          throw new DomainError("Invalid district");
        if (p.inventory === "normal") {
          p.prices = { "30": 3 };
          p.reservedForBrands = false;
          if (p.sale !== "rental")
            throw new DomainError(
              "Normal properties use presence tiers. Use a skyscraper for auctions.",
            );
        }
        if (
          p.inventory === "skyscraper" &&
          !s.settings[0].durations.every((d) => p.prices[String(d)])
        )
          throw new DomainError("Set a price for every lease duration.");
        const prev = s.properties.find((v) => v.id === p.id);
        if (
          p.inventory === "skyscraper" &&
          prev?.inventory !== "skyscraper" &&
          s.properties.filter((p) => p.inventory === "skyscraper").length >= 10
        )
          throw new DomainError(
            "The initial city is limited to 10 major skyscrapers.",
          );
        const busy =
          s.leases.some(
            (l) =>
              l.propertyId === p.id &&
              l.status === "active" &&
              Date.parse(l.expiresAt) > Date.now(),
          ) ||
          s.reservations.some(
            (r) => r.propertyId === p.id && r.status === "reserved",
          ) ||
          s.auctions.some(
            (a) =>
              a.propertyId === p.id &&
              ["live", "awaiting_payment"].includes(a.status),
          );
        if (
          prev &&
          busy &&
          (p.sale !== prev.sale ||
            !p.enabled ||
            p.inventory !== prev.inventory ||
            p.reservedForBrands !== !!prev.reservedForBrands)
        )
          throw new DomainError(
            "An occupied, reserved, or auctioned property cannot be deactivated or change sale type.",
          );
        if (prev) Object.assign(prev, p);
        else
          s.properties.push({
            ...p,
            id: `building-${randomUUID()}`,
            number: Math.max(...s.properties.map((p) => p.number)) + 1,
            model: 0,
          });
      } else if (input.action === "assign-skyscraper") {
        const assignment = z
          .object({
            propertyId: z.string(),
            email: emailSchema,
            ad: adSchema,
            days: z.number().int().min(1).max(365),
          })
          .parse(input);
        assignSkyscraper(
          s,
          { ...assignment, ad: assignment.ad as Ad },
          admin.email,
          isDemo(),
        );
      } else if (input.action === "moderate") {
        const status = z
          .enum(["active", "pending", "suspended", "rejected"])
          .parse(input.status);
        const l = s.leases.find((l) => l.id === input.leaseId);
        if (!l) throw new DomainError("Lease not found", 404);
        l.ad.status = status;
      } else if (input.action === "settings") {
        const settings = z
          .object({
            durations: z.array(z.number().int().min(1).max(365)).min(1).max(8),
            reservationMinutes: z.number().int().min(1).max(30),
            moderation: z.enum(["automatic", "review"]),
          })
          .parse(input.settings);
        settings.durations = [...new Set(settings.durations)];
        if (!settings.durations.includes(30))
          throw new DomainError(
            "30 days must remain available for normal presence tiers.",
          );
        Object.assign(s.settings[0], settings);
        for (const p of s.properties)
          for (const d of settings.durations)
            if (p.inventory === "skyscraper" && !p.prices[String(d)])
              p.prices[String(d)] = Math.max(
                1,
                Math.round(
                  ((p.prices["30"] || Object.values(p.prices)[0]) * d) / 30,
                ),
              );
      } else if (input.action === "auction") {
        const property = s.properties.find((p) => p.id === input.propertyId);
        if (
          !property ||
          !property.enabled ||
          property.inventory !== "skyscraper"
        )
          throw new DomainError("Property not found", 404);
        if (
          s.auctions.some(
            (a) =>
              a.propertyId === property.id &&
              ["live", "awaiting_payment"].includes(a.status),
          ) ||
          s.leases.some(
            (l) =>
              l.propertyId === property.id &&
              l.status === "active" &&
              Date.parse(l.expiresAt) > Date.now(),
          ) ||
          s.reservations.some(
            (r) => r.propertyId === property.id && r.status === "reserved",
          )
        )
          throw new DomainError(
            "Property already occupied, reserved, or in an auction.",
          );
        const opts = z
          .object({
            hours: z.number().int().min(1).max(720),
            startingBid: z.number().min(1).max(100000),
            increment: z.number().min(1).max(1000),
            days: z.number().int().min(1).max(365),
          })
          .parse(input);
        property.sale = "auction";
        property.reservedForBrands = false;
        s.auctions.push({
          id: randomUUID(),
          propertyId: property.id,
          endsAt: new Date(Date.now() + opts.hours * 3600000).toISOString(),
          startingBid: opts.startingBid,
          increment: opts.increment,
          days: opts.days,
          status: "live",
        });
      } else if (input.action === "district") {
        const d = s.districts.find((d) => d.id === input.id);
        if (!d) throw new DomainError("District not found");
        Object.assign(
          d,
          z
            .object({
              name: z.string().min(2).max(60),
              subtitle: z.string().max(100),
              color: z.string().regex(/^#[0-9a-f]{6}$/i),
            })
            .parse(input.district),
        );
      } else if (input.action === "maintenance") {
        sweep(s);
        closeAuctions(s, isDemo(), appUrl());
      } else throw new DomainError("Unknown action");
    });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
