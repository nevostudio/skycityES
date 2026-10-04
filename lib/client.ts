export async function api<T = Record<string, unknown>>(
  url: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const res = await fetch(url, {
    method: method || (body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await res.json();
  if (!res.ok)
    throw new Error(result.error || "Algo ha salido mal. Inténtalo de nuevo.");
  return result;
}
export const euro = (n: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES");
export const propertyUrl = (p: { id: string; districtId: string }) =>
  `/city/${p.districtId}/${p.id}`;
/** One-time "from" price of a plot. */
export const offerPrice = (p: { price: number }) => p.price;
export const districtName = (
  id: string,
  districts: { id: string; name: string }[],
) => districts.find((d) => d.id === id)?.name || id.replaceAll("-", " ");
export const statusLabel: Record<string, string> = {
  available: "Disponible",
  reserved: "Reservado",
  claimed: "Construido",
  auction: "En subasta",
  public: "Edificio público",
};
/** Sign text of a skyscraper plot that is still waiting for its tower. */
export function siteNote(p: {
  status: string;
  price: number;
  premiumNote?: string;
}) {
  return p.status === "auction"
    ? "SUBASTA EN CURSO"
    : p.status === "available"
      ? `DESDE ${p.price} €`
      : p.premiumNote === "auction_soon"
        ? "SUBASTA PRÓXIMAMENTE"
        : "RESERVADO PARA GRANDES MARCAS";
}
