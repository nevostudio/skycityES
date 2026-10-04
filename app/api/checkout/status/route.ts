import { readState } from "@/lib/store";
import { hash, DomainError } from "@/lib/engine";
import { fail } from "@/lib/http";
export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const s = await readState();
    const r = s.reservations.find(
      (r) => r.id === u.searchParams.get("reservation"),
    );
    if (!r || r.accessHash !== hash(u.searchParams.get("access") || ""))
      throw new DomainError("Acceso al pago no válido.", 403);
    const lease = s.leases.find(
      (l) => l.id === (r.upgradeLeaseId || r.renewalLeaseId || `lease-${r.id}`),
    );
    return Response.json(
      {
        status: r.status,
        purpose: r.upgradeLeaseId
          ? "upgrade"
          : r.renewalLeaseId
            ? "renewal"
            : "claim",
        lease: lease
          ? {
              propertyId: lease.propertyId,
              ad: lease.ad,
            }
          : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
