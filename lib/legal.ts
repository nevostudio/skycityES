/**
 * Legal identity and terms version. The holder's personal details are read from environment
 * variables (Vercel / .env.local) so they never live in the public repository; the bracketed
 * placeholders show until they are set. Server-side only: read by the legal pages.
 */
const env = (key: string, fallback: string) =>
  process.env[key]?.trim() || fallback;

export const LEGAL = {
  /** Bump when the purchase terms change: it is stored with every purchase. */
  version: "2026-10-05",
  owner: env("LEGAL_OWNER", "[NOMBRE Y APELLIDOS O RAZÓN SOCIAL]"),
  taxId: env("LEGAL_TAX_ID", "[NIF / CIF]"),
  address: env("LEGAL_ADDRESS", "[DOMICILIO]"),
  /** Commercial registry details, only for companies. */
  registry: env("LEGAL_REGISTRY", ""),
  email: env("LEGAL_EMAIL", "[EMAIL DE CONTACTO]"),
  tradeName: "SkyCity",
  site: "skycityes.com",
};

export const LEGAL_PAGES = [
  { href: "/legal", label: "Centro legal" },
  { href: "/aviso-legal", label: "Aviso legal" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/cookies", label: "Cookies" },
  { href: "/condiciones", label: "Condiciones" },
] as const;
