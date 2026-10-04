import type Stripe from "stripe";
import type { State } from "@/types";
import { DomainError, fulfill } from "../engine";

/** Only call with a signature-verified webhook object or a session retrieved from Stripe. */
export type PaidSession = Pick<
  Stripe.Checkout.Session,
  | "id"
  | "mode"
  | "payment_status"
  | "currency"
  | "amount_total"
  | "payment_intent"
  | "metadata"
>;
export function settleStripeSession(
  s: State,
  session: PaidSession,
  now = Date.now(),
) {
  if (session.payment_status !== "paid") return;
  if (session.currency !== "eur" || session.mode !== "payment")
    throw new DomainError("Moneda o tipo de pago inesperado.", 409);
  const r = s.reservations.find(
    (r) => r.id === session.metadata?.reservation_id,
  );
  if (
    !r ||
    r.propertyId !== session.metadata?.property_id ||
    (r.sessionId && r.sessionId !== session.id) ||
    (r.purpose === "takeover" && session.metadata?.purpose !== "takeover")
  )
    throw new DomainError("Metadatos de pago no válidos.", 409);
  r.sessionId ??= session.id;
  return fulfill(
    s,
    r.id,
    session.id,
    (session.amount_total ?? 0) / 100,
    "stripe",
    now,
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id,
  );
}
