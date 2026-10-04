import { readState, transaction } from "@/lib/store";
import { sweep, closeAuctions } from "@/lib/engine";
import { settleStripeSession } from "@/lib/stripe/settlement";
import { isDemo, appUrl } from "@/lib/config";
import { stripe } from "@/lib/stripe";
import { flushMail } from "@/lib/email";
import { fail } from "@/lib/http";
import { flushTakeoverRefunds } from "@/lib/stripe/refunds";
export async function GET(req: Request) {
  if (
    !process.env.CRON_SECRET ||
    req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return Response.json({ error: "No autorizado" }, { status: 401 });
  try {
    if (!isDemo())
      for (const r of (await readState()).reservations
        .filter(
          (r) =>
            r.status === "reserved" &&
            r.sessionId &&
            Date.parse(r.expiresAt) < Date.now(),
        )
        .slice(0, 30)) {
        const session = await stripe().checkout.sessions.retrieve(r.sessionId!);
        if (session.status === "expired")
          await transaction((s) => {
            const r2 = s.reservations.find((x) => x.id === r.id);
            if (r2?.status === "reserved") r2.status = "expired";
          });
        // Paid sessions are reconciled via a verified Stripe API response if a webhook was missed.
        else if (
          session.payment_status === "paid" &&
          session.currency === "eur"
        )
          await transaction((s) => settleStripeSession(s, session));
      }
    await transaction((s) => {
      sweep(s);
      closeAuctions(s, isDemo(), appUrl());
    });
    const mail = await flushMail();
    await flushTakeoverRefunds();
    return Response.json({ ok: true, ...mail });
  } catch (e) {
    return fail(e);
  }
}
