import { readState, transaction } from "@/lib/store";
import { DomainError, hash } from "@/lib/engine";
import { createSession, stripe } from "@/lib/stripe";
import { isDemo } from "@/lib/config";
import { checkOrigin, fail } from "@/lib/http";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    if (isDemo())
      throw new DomainError(
        "Las subastas de demostración se liquidan sin pago.",
      );
    const { reservation, access } = await req.json();
    const s = await readState();
    const r = s.reservations.find((r) => r.id === reservation);
    if (
      !r ||
      typeof access !== "string" ||
      r.accessHash !== hash(access) ||
      r.status !== "reserved" ||
      Date.parse(r.expiresAt) <= Date.now()
    )
      throw new DomainError(
        "El enlace de pago no es válido o ha caducado.",
        403,
      );
    if (!s.auctions.some((a) => a.reservationId === r.id))
      throw new DomainError("Subasta no encontrada");
    if (r.sessionId) {
      const existing = await stripe().checkout.sessions.retrieve(r.sessionId);
      if (existing.status === "open")
        return Response.json({ url: existing.url });
      throw new DomainError("Este pago ya se completó o ha caducado.");
    }
    const session = await createSession(r, access);
    await transaction((s) => {
      s.reservations.find((x) => x.id === r.id)!.sessionId = session.id;
    });
    return Response.json({ url: session.url });
  } catch (e) {
    return fail(e);
  }
}
