import { stripe } from "@/lib/stripe";
import { transaction } from "@/lib/store";
import { fulfill, DomainError } from "@/lib/engine";
import { isDemo } from "@/lib/config";
import { fail } from "@/lib/http";
import { after } from "next/server";
import { flushMail } from "@/lib/email";
export async function POST(req: Request) {
  if (isDemo())
    return Response.json(
      { error: "Stripe está desactivado en modo demo." },
      { status: 404 },
    );
  let event;
  try {
    event = stripe().webhooks.constructEvent(
      await req.text(),
      req.headers.get("stripe-signature") || "",
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return Response.json({ error: "Firma no válida" }, { status: 400 });
  }
  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object;
      if (session.payment_status === "paid") {
        if (session.currency !== "eur")
          throw new DomainError("Moneda inesperada", 409);
        await transaction((s) => {
          const r = s.reservations.find(
            (r) => r.id === session.metadata?.reservation_id,
          );
          if (
            !r ||
            r.propertyId !== session.metadata?.property_id ||
            (r.sessionId && r.sessionId !== session.id)
          )
            throw new DomainError("Metadatos de pago no válidos", 409);
          fulfill(
            s,
            r.id,
            session.id,
            (session.amount_total ?? 0) / 100,
            "stripe",
          );
        });
      }
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      await transaction((s) => {
        const r = s.reservations.find((r) => r.sessionId === session.id);
        if (r?.status === "reserved") r.status = "expired";
      });
    }
    after(async () => {
      try {
        await flushMail();
      } catch (e) {
        console.error("Email outbox deferred for retry", e);
      }
    });
    return Response.json({ received: true });
  } catch (e) {
    return fail(e);
  }
}
