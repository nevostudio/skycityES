import { cookies } from "next/headers";
import { transaction } from "@/lib/store";
import { metric } from "@/lib/engine";
import { checkOrigin, fail, rateLimit } from "@/lib/http";
import type { EventName } from "@/types";
const allowed: EventName[] = [
  "city_impression",
  "property_impression",
  "property_open",
  "external_link_click",
  "share_clicked",
  "claim_clicked",
];
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    rateLimit(
      `analytics:${req.headers.get("x-forwarded-for") || "local"}`,
      120,
    );
    const { event, propertyId = "" } = await req.json();
    if (!allowed.includes(event))
      return Response.json({ error: "Invalid event" }, { status: 400 });
    const jar = await cookies();
    const key = `sc_${event}_${String(propertyId).replace(/[^a-z0-9-]/gi, "")}`;
    if (jar.has(key)) return Response.json({ ok: true });
    await transaction((s) => {
      if (propertyId && !s.properties.some((p) => p.id === propertyId)) return;
      metric(s, event, propertyId);
    });
    jar.set(key, "1", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1800,
      path: "/",
    });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
