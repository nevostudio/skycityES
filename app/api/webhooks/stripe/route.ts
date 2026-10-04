import { stripe } from "@/lib/stripe";
import { transaction } from "@/lib/store";
import { settleStripeSession } from "@/lib/stripe/settlement";
import { isDemo } from "@/lib/config";
import { fail } from "@/lib/http";
import { after } from "next/server";
import { flushMail } from "@/lib/email";
import { flushTakeoverRefunds } from "@/lib/stripe/refunds";
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
        await transaction((s) => settleStripeSession(s, session));
        await flushTakeoverRefunds(session.metadata?.reservation_id);
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
