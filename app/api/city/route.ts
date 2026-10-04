import { readState, transaction } from "@/lib/store";
import { citySnapshot, sweep, closeAuctions } from "@/lib/engine";
import { isDemo, appUrl } from "@/lib/config";
import { fail } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const demo = isDemo();
    if (demo)
      await transaction((s) => {
        sweep(s);
        closeAuctions(s, true, appUrl());
      });
    return Response.json(citySnapshot(await readState(), demo), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return fail(e);
  }
}
