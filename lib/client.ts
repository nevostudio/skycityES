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
    throw new Error(result.error || "Something went wrong. Please try again.");
  return result;
}
export const euro = (n: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
export const propertyUrl = (p: { id: string; districtId: string }) =>
  `/city/${p.districtId}/${p.id}`;
export const offerDays = (p: { prices: Record<string, number> }) =>
  p.prices["30"] ? 30 : Number(Object.keys(p.prices)[0]);
export const offerPrice = (p: { prices: Record<string, number> }) =>
  p.prices[String(offerDays(p))];
