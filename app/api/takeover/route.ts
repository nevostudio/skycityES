import { transaction } from "@/lib/store";
import { takeoverSchema } from "@/lib/validation";
import { reserveTakeover } from "@/lib/engine";
import { isDemo } from "@/lib/config";
import { checkOrigin, fail, rateLimit } from "@/lib/http";
import { createSession } from "@/lib/stripe";
import type { Ad } from "@/types";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    rateLimit(`takeover:${req.headers.get("x-forwarded-for") || "local"}`, 20);
    const input = takeoverSchema.parse(await req.json());
    const demo = isDemo();
    const result = await transaction((s) =>
      reserveTakeover(s, { ...input, ad: input.ad as Ad }, demo),
    );
    if (demo)
      return Response.json({
        reservation: result.reservation.id,
        access: result.access,
        expiresAt: result.reservation.expiresAt,
        amount: result.reservation.amount,
        demo: true,
      });
    const session = await createSession(result.reservation, result.access);
    await transaction((s) => {
      s.reservations.find((r) => r.id === result.reservation.id)!.sessionId =
        session.id;
    });
    return Response.json({ url: session.url, demo: false });
  } catch (e) {
    return fail(e);
  }
}
