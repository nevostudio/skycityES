import { requireIdentity } from "@/lib/auth";
import { transaction } from "@/lib/store";
import { placeBid } from "@/lib/engine";
import { isDemo } from "@/lib/config";
import { checkOrigin, fail, rateLimit } from "@/lib/http";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireIdentity();
    rateLimit(`bid:${user.email}`, 15);
    const { auctionId, amount } = await req.json();
    await transaction((s) =>
      placeBid(s, auctionId, user.email, Number(amount), isDemo()),
    );
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
