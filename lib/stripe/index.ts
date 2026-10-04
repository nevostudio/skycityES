import Stripe from "stripe";
import type { Reservation } from "@/types";
import { appUrl } from "../config";
export function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}
export async function createSession(r: Reservation, access: string) {
  return stripe().checkout.sessions.create(
    {
      mode: "payment",
      customer_email: r.email,
      allowed_payment_method_types: ["card"],
      expires_at: Math.floor(Date.now() / 1000) + 1830,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: Math.round(r.amount * 100),
            product_data: {
              name: r.upgradeLeaseId
                ? `SkyCity · ${r.propertyId} · upgrade ${r.fromTier} to ${r.presenceTier}`
                : `SkyCity · ${r.propertyId} · ${r.presenceTier || "STARTER"} · ${r.days} days`,
            },
          },
        },
      ],
      metadata: {
        property_id: r.propertyId,
        reservation_id: r.id,
        lease_duration: String(r.days),
        presence_tier: r.presenceTier || "STARTER",
        purpose: r.upgradeLeaseId
          ? "upgrade"
          : r.renewalLeaseId
            ? "renewal"
            : "claim",
      },
      success_url: `${appUrl()}/success?reservation=${r.id}&access=${access}`,
      cancel_url: `${appUrl()}/?building=${r.propertyId}&cancelled=1`,
    },
    { idempotencyKey: `checkout-${r.id}` },
  );
}
