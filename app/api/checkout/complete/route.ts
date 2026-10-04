import { cookies } from "next/headers";
import { transaction } from "@/lib/store";
import { DomainError, fulfill, hash, token } from "@/lib/engine";
import { isDemo } from "@/lib/config";
import { checkOrigin, fail } from "@/lib/http";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    if (!isDemo()) throw new DomainError("Demo checkout is disabled.", 403);
    const { reservation, access } = await req.json();
    const session = token();
    const lease = await transaction((s) => {
      const r = s.reservations.find((r) => r.id === reservation);
      if (!r || typeof access !== "string" || r.accessHash !== hash(access))
        throw new DomainError("Invalid checkout access.", 403);
      const lease = fulfill(s, r.id, `demo-${r.id}`, r.amount, "demo");
      s.access.push({
        id: hash(session),
        email: r.email,
        kind: "session",
        used: false,
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
      return lease;
    });
    (await cookies()).set("skycity-session", session, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 604800,
      path: "/",
    });
    return Response.json({ lease });
  } catch (e) {
    return fail(e);
  }
}
