/**
 * Legal identity and terms version. The owner fields are placeholders until the holder's
 * details are confirmed; every legal page and the checkout read them from here.
 */
export const LEGAL = {
  /** Bump when the purchase terms change: it is stored with every purchase. */
  version: "2026-10-05",
  owner: "[NOMBRE Y APELLIDOS O RAZÓN SOCIAL]",
  taxId: "[NIF / CIF]",
  address: "[DOMICILIO COMPLETO]",
  /** Commercial registry details, only for companies. */
  registry: "",
  email: "[EMAIL DE CONTACTO]",
  site: "skycityes.com",
};

export const LEGAL_PAGES = [
  { href: "/aviso-legal", label: "Aviso legal" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/cookies", label: "Cookies" },
  { href: "/condiciones", label: "Condiciones" },
] as const;
