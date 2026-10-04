import { Auctions } from "@/components/auctions";
import { citySnapshot } from "@/lib/engine";
import { readState } from "@/lib/store";
import { isDemo } from "@/lib/config";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Iconic locations — Live auctions",
  description: "Bid for a landmark advertising placement in SkyCity.",
};
export default async function Page() {
  return <Auctions initial={citySnapshot(await readState(), isDemo())} />;
}
