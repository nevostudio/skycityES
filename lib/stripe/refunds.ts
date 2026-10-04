import type Stripe from "stripe";
import { stripe } from "./index";
import { readState, transaction } from "../store";
import { queueMail } from "../engine";
import { isDemo } from "../config";

/** Resolve by stored refund ID or metadata before create, including retries beyond Stripe's key TTL. */
export async function ensureRefund(
  client: Stripe,
  paymentId: string,
  reservationId: string,
  amount: number,
  refundId?: string,
) {
  if (refundId) return client.refunds.retrieve(refundId);
  for await (const refund of client.refunds.list({
    payment_intent: paymentId,
    limit: 100,
  })) {
    if (refund.metadata?.skycity_reservation === reservationId) return refund;
  }
  return client.refunds.create(
    {
      payment_intent: paymentId,
      amount: Math.round(amount * 100),
      metadata: { skycity_reservation: reservationId },
    },
    { idempotencyKey: `takeover-refund-${reservationId}` },
  );
}
/** Durable refund work is committed before contacting Stripe; webhook retries and cron recover it. */
export async function flushTakeoverRefunds(reservationId?: string) {
  if (isDemo()) return;
  const pending = (await readState()).propertyTakeovers
    .filter(
      (t) =>
        t.status === "refund_pending" &&
        (!reservationId || t.reservation_id === reservationId),
    )
    .slice(0, 30);
  for (const t of pending) {
    if (!t.stripe_payment_id)
      throw new Error("Takeover refund missing payment ID");
    const refund = await ensureRefund(
      stripe(),
      t.stripe_payment_id,
      t.reservation_id,
      t.takeover_amount,
      t.refund_id,
    );
    await transaction((s) => {
      const row = s.propertyTakeovers.find((v) => v.id === t.id)!;
      row.refund_id = refund.id;
      if (refund.status === "succeeded") {
        row.status = "refunded";
        const tx = s.transactions.find((v) => v.id === row.transaction_id)!;
        tx.outcome = "refunded";
        queueMail(
          s,
          tx.email,
          "Pago de takeover devuelto",
          `Se han devuelto íntegramente ${tx.amount} € al método de pago original. No se ha transferido el control de esta ubicación.`,
          `takeover-refund:${t.id}`,
        );
      }
    });
    if (refund.status === "failed" || refund.status === "canceled")
      throw new Error(`Refund ${refund.id} requires Stripe review`);
  }
}
