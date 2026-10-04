import { z } from "zod";
import { CTAS, LEGACY_CTAS } from "./plots";
// Validation messages reach the interface: keep them in Spanish.
z.config(z.locales.es());
const url = z
  .string()
  .max(2048)
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return (
        (u.protocol === "https:" ||
          (process.env.NODE_ENV !== "production" &&
            u.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(u.hostname))) &&
        !u.username &&
        !u.password
      );
    } catch {
      return false;
    }
  }, "Usa una URL HTTPS válida");
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const adSchema = z.object({
  brand: z.string().trim().min(2).max(40),
  description: z.string().trim().max(180),
  website: url,
  instagram: url,
  tiktok: url,
  x: url,
  linkedin: url,
  logo: url,
  banner: url,
  promo: z.string().max(40),
  cta: z.preprocess(
    (v) => (typeof v === "string" && LEGACY_CTAS[v]) || v,
    z.enum(CTAS),
  ),
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  style: z.enum(["rooftop", "facade", "billboard"]),
  status: z
    .enum(["draft", "pending", "active", "rejected", "suspended"])
    .optional(),
});
export const claimSchema = z.object({
  propertyId: z.string().max(80),
  email: emailSchema,
  ad: adSchema,
  upgradeLeaseId: z.string().optional(),
  presenceTier: z
    .enum(["STARTER", "PLUS", "PRO", "PREMIUM", "LANDMARK"])
    .default("STARTER"),
});
