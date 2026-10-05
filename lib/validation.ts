import { z } from "zod";
import { CTAS, LEGACY_CTAS } from "./plots";
import { IMAGE_SUPPORTS, TAGLINE_MAX } from "./branding";
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
/** Uploaded or bundled images may also be referenced by their own relative path. */
const ownImage =
  /^\/(brands\/[a-z0-9-]+\.(svg|png|webp)|api\/uploads\/[0-9a-f-]{36}\.(png|jpg|webp))$/;
const imageUrl = z
  .string()
  .max(2048)
  .refine(
    (v) => ownImage.test(v) || url.safeParse(v).success,
    "Usa una imagen subida o una URL HTTPS válida",
  );
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const adSchema = z.object({
  brand: z.string().trim().min(2).max(40),
  tagline: z.string().trim().max(TAGLINE_MAX).default(""),
  description: z.string().trim().max(180),
  website: url,
  instagram: url,
  tiktok: url,
  x: url,
  linkedin: url,
  logo: imageUrl,
  banner: imageUrl,
  promo: z.string().max(40),
  cta: z.preprocess(
    (v) => (typeof v === "string" && LEGACY_CTAS[v]) || v,
    z.enum(CTAS),
  ),
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  support: z.enum(IMAGE_SUPPORTS).default("SIDE_BILLBOARD"),
  style: z.enum(["rooftop", "facade", "billboard"]).optional(),
  status: z
    .enum(["draft", "pending", "active", "rejected", "suspended"])
    .optional(),
});
/** Explicit acceptance before paying: purchase terms + immediate delivery (withdrawal waiver). */
export const consentSchema = z
  .object({ terms: z.boolean(), immediate: z.boolean() })
  .refine((c) => c.terms && c.immediate, {
    message:
      "Para continuar, acepta las condiciones de compra y la construcción inmediata del edificio.",
  });
export const claimSchema = z.object({
  consent: consentSchema,
  propertyId: z.string().max(80),
  email: emailSchema,
  ad: adSchema,
  upgradeLeaseId: z.string().optional(),
  presenceTier: z
    .enum(["STARTER", "PLUS", "PRO", "PREMIUM", "LANDMARK"])
    .default("STARTER"),
});
export const takeoverSchema = z.object({
  consent: consentSchema,
  propertyId: z.string().max(80),
  email: emailSchema,
  ad: adSchema,
  offerAmount: z.number().positive().max(999999.99),
});
