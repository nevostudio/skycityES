import { transaction } from "@/lib/store";
import { claimSchema } from "@/lib/validation";
import { reserve } from "@/lib/engine";
import { isDemo } from "@/lib/config";
import { checkOrigin, fail, rateLimit } from "@/lib/http";
import { requireIdentity } from "@/lib/auth";
import { createSession } from "@/lib/stripe";
import type { Ad } from "@/types";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    rateLimit(`checkout:${req.headers.get("x-forwarded-for") || "local"}`, 20);
    const input = claimSchema.parse(await req.json());
    if (input.renewalLeaseId || input.upgradeLeaseId)
      input.email = (await requireIdentity()).email;
    const demo = isDemo();
    const result = await transaction((s) =>
      reserve(s, { ...input, ad: input.ad as Ad }, demo),
    );
    if (demo)
      return Response.json({
        reservation: result.reservation.id,
        access: result.access,
        expiresAt: result.reservation.expiresAt,
        amount: result.reservation.amount,
        demo: true,
      });
    try {
      const session = await createSession(result.reservation, result.access);
      await transaction((s) => {
        const r = s.reservations.find((r) => r.id === result.reservation.id)!;
        r.sessionId = session.id;
      });
      return Response.json({ url: session.url, demo: false });
    } catch (e) {
      /* Keep the reservation until its deadline if Stripe's response is ambiguous. */ throw e;
    }
  } catch (e) {
    return fail(e);
  }
}
