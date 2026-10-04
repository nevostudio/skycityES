import { DomainError } from "./engine";
import { ZodError } from "zod";
import { appUrl } from "./config";
export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (
    origin &&
    origin !== new URL(req.url).origin &&
    origin !== new URL(appUrl()).origin
  )
    throw new DomainError("Origen de la petición no válido.", 403);
}
export function fail(error: unknown) {
  if (error instanceof ZodError)
    return Response.json(
      { error: error.issues[0]?.message || "Datos no válidos" },
      { status: 400 },
    );
  if (error instanceof DomainError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error(error);
  return Response.json(
    { error: "No se ha podido completar la petición. Inténtalo de nuevo." },
    { status: 500 },
  );
}
const buckets = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, limit = 30) {
  const now = Date.now();
  if (buckets.size > 10000)
    for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.until < now) buckets.set(key, { count: 1, until: now + 60000 });
  else if (++b.count > limit)
    throw new DomainError(
      "Espera un momento antes de volver a intentarlo.",
      429,
    );
}
