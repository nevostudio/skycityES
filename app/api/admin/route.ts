import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireIdentity } from "@/lib/auth";
import { readState, transaction } from "@/lib/store";
import {
  DomainError,
  buildingFor,
  citySnapshot,
  closeAuctions,
  sweep,
} from "@/lib/engine";
import { isDemo, appUrl } from "@/lib/config";
import { checkOrigin, fail } from "@/lib/http";
import { adSchema, emailSchema } from "@/lib/validation";
import { assignSkyscraper } from "@/lib/admin-inventory";
import { PLOT_HEIGHT } from "@/lib/presence";
import type { Ad } from "@/types";
import { validMoney } from "@/lib/takeover-policy";
import { AUCTIONS_ENABLED } from "@/lib/features";
import { flushMail } from "@/lib/email";
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
  width: z.number().min(1).max(10),
  depth: z.number().min(1).max(10),
  rotation: z.number().min(-7).max(7),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  price: z.number().min(1).max(100000),
  sale: z.enum(["rental", "auction"]),
  featured: z.boolean(),
  enabled: z.boolean(),
  inventory: z.enum(["normal", "skyscraper", "public"]).default("normal"),
  reservedForBrands: z.boolean().default(false),
  premiumNote: z.enum(["major_brands", "auction_soon"]).optional(),
  description: z.string().max(180).optional(),
  takeover_enabled: z.boolean().optional(),
  takeover_blocked: z.boolean().optional(),
  current_property_value: z.number().refine(validMoney).optional(),
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
        buildings: s.buildings,
        auctions: s.auctions,
        bids: s.bids,
        transactions: s.transactions,
        propertyTakeovers: s.propertyTakeovers,
        settings: s.settings[0],
        mail: s.mail,
        stats: citySnapshot(s, isDemo()).stats,
        customers: [
          ...new Set(s.leases.filter((l) => !l.retired).map((l) => l.email)),
        ],
        revenue: s.transactions
          .filter((t) => !t.outcome || t.outcome === "fulfilled")
          .reduce((a, t) => a + t.amount, 0),
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
          throw new DomainError("Barrio no válido");
        const prev = s.properties.find((v) => v.id === p.id);
        if (p.inventory === "public" && prev?.inventory !== "public")
          throw new DomainError(
            "Los edificios públicos forman parte del trazado inicial de la ciudad.",
          );
        if (
          p.sale === "auction" &&
          !AUCTIONS_ENABLED &&
          prev?.sale !== "auction"
        )
          throw new DomainError("Las subastas no están disponibles.");
        if (p.inventory !== "skyscraper") {
          p.price = 3;
          p.reservedForBrands = false;
          p.premiumNote = undefined;
          if (p.sale !== "rental")
            throw new DomainError(
              "Los solares normales usan los tamaños de 3 € a 60 €. Las subastas son para rascacielos.",
            );
        }
        const busy =
          (!!prev && !!buildingFor(s, prev.id)) ||
          s.leases.some(
            (l) => l.propertyId === p.id && l.status === "active",
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
            p.inventory !== (prev.inventory || "normal") ||
            p.reservedForBrands !== !!prev.reservedForBrands)
        )
          throw new DomainError(
            "Un solar con edificio, reserva o subasta no puede desactivarse ni cambiar de tipo.",
          );
        if (p.inventory !== "normal") p.takeover_enabled = false;
        if (prev) {
          if (
            (p.current_property_value !== undefined &&
              p.current_property_value !== prev.current_property_value) ||
            (p.takeover_enabled !== undefined &&
              p.takeover_enabled !== prev.takeover_enabled) ||
            (p.takeover_blocked !== undefined &&
              p.takeover_blocked !== prev.takeover_blocked)
          )
            prev.control_version = (prev.control_version || 0) + 1;
          Object.assign(prev, p);
        } else
          s.properties.push({
            ...p,
            height: PLOT_HEIGHT,
            id: `building-${randomUUID()}`,
            number: Math.max(...s.properties.map((p) => p.number)) + 1,
            model: 0,
            current_property_value: p.current_property_value ?? 0,
            takeover_enabled: p.takeover_enabled ?? p.inventory === "normal",
            takeover_blocked: p.takeover_blocked ?? false,
            takeover_count: 0,
            control_version: 0,
          });
      } else if (input.action === "assign-skyscraper") {
        const assignment = z
          .object({
            propertyId: z.string(),
            email: emailSchema,
            ad: adSchema,
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
        if (!l) throw new DomainError("Edificio no encontrado", 404);
        l.ad.status = status;
      } else if (input.action === "settings") {
        const settings = z
          .object({
            reservationMinutes: z.number().int().min(1).max(30),
            moderation: z.enum(["automatic", "review"]),
            takeoverEnabled: z.boolean().optional(),
            takeoverMinimumIncrement: z
              .number()
              .min(1)
              .max(100000)
              .refine(validMoney)
              .optional(),
            takeoverProtectionHours: z.number().min(0).max(8760).optional(),
          })
          .parse(input.settings);
        Object.assign(s.settings[0], settings);
      } else if (input.action === "auction") {
        if (!AUCTIONS_ENABLED)
          throw new DomainError("Las subastas no están disponibles.");
        const property = s.properties.find((p) => p.id === input.propertyId);
        if (
          !property ||
          !property.enabled ||
          property.inventory !== "skyscraper"
        )
          throw new DomainError("Rascacielos no encontrado", 404);
        if (
          !!buildingFor(s, property.id) ||
          s.auctions.some(
            (a) =>
              a.propertyId === property.id &&
              ["live", "awaiting_payment"].includes(a.status),
          ) ||
          s.leases.some(
            (l) => l.propertyId === property.id && l.status === "active",
          ) ||
          s.reservations.some(
            (r) => r.propertyId === property.id && r.status === "reserved",
          )
        )
          throw new DomainError(
            "El solar ya tiene edificio, reserva o subasta en curso.",
          );
        const opts = z
          .object({
            hours: z.number().int().min(1).max(720),
            startingBid: z.number().min(1).max(100000),
            increment: z.number().min(1).max(1000),
          })
          .parse(input);
        property.sale = "auction";
        property.reservedForBrands = false;
        property.premiumNote = undefined;
        s.auctions.push({
          id: randomUUID(),
          propertyId: property.id,
          endsAt: new Date(Date.now() + opts.hours * 3600000).toISOString(),
          startingBid: opts.startingBid,
          increment: opts.increment,
          status: "live",
        });
      } else if (input.action === "district") {
        const d = s.districts.find((d) => d.id === input.id);
        if (!d) throw new DomainError("Barrio no encontrado");
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
      } else throw new DomainError("Acción desconocida");
    });
    // Maintenance also delivers the email queue, like the scheduled cron.
    if (input.action === "maintenance")
      return Response.json({ ok: true, mail: await flushMail() });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
