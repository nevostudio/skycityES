import { cookies } from "next/headers";
import { identity, requireIdentity } from "@/lib/auth";
import { readState, transaction } from "@/lib/store";
import { adSchema } from "@/lib/validation";
import { DomainError, hash } from "@/lib/engine";
import { checkOrigin, fail } from "@/lib/http";
import { isDemo } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";
export async function GET() {
  try {
    const user = await identity();
    if (!user) return Response.json({ user: null });
    const s = await readState();
    return Response.json(
      {
        user,
        leases: s.leases
          .filter((l) => l.email === user.email && !l.retired)
          .map((l) => ({
            ...l,
            property: s.properties.find((p) => p.id === l.propertyId),
            building: s.buildings.find((b) => b.leaseId === l.id) || null,
            analytics: s.analytics
              .filter((e) => e.propertyId === l.propertyId)
              .reduce(
                (a, e) => ({ ...a, [e.event]: (a[e.event] || 0) + e.count }),
                {} as Record<string, number>,
              ),
          })),
        demo: isDemo(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
export async function PATCH(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireIdentity();
    const input = await req.json();
    const ad = adSchema.parse(input.ad);
    await transaction((s) => {
      const l = s.leases.find(
        (l) =>
          l.id === input.leaseId &&
          l.email === user.email &&
          l.status === "active" &&
          s.buildings.some((b) => b.leaseId === l.id),
      );
      if (!l) throw new DomainError("Edificio no encontrado.", 404);
      l.ad = {
        ...ad,
        status: ["suspended", "rejected"].includes(l.ad.status)
          ? l.ad.status
          : s.settings[0].moderation === "review"
            ? "pending"
            : "active",
      };
    });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(req: Request) {
  try {
    checkOrigin(req);
    if (isDemo()) {
      const jar = await cookies();
      const value = jar.get("skycity-session")?.value;
      if (value)
        await transaction((s) => {
          const a = s.access.find((a) => a.id === hash(value));
          if (a) a.expiresAt = new Date(0).toISOString();
        });
      jar.delete("skycity-session");
    } else await (await supabaseServer()).auth.signOut();
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
