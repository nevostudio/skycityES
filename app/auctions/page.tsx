import { Auctions } from "@/components/auctions";
import { citySnapshot } from "@/lib/engine";
import { readState } from "@/lib/store";
import { isDemo } from "@/lib/config";
import { redirect } from "next/navigation";
import { AUCTIONS_ENABLED } from "@/lib/features";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Parcelas premium — Subastas en directo",
  description: "Puja por una parcela para levantar un rascacielos en SkyCity.",
};
export default async function Page() {
  // Auctions are retired for now: skyscrapers are bought from the map.
  if (!AUCTIONS_ENABLED) redirect("/");
  return <Auctions initial={citySnapshot(await readState(), isDemo())} />;
}
