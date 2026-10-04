import { Explorer } from "@/components/city/explorer";
import { readState } from "@/lib/store";
import { citySnapshot } from "@/lib/engine";
import { isDemo } from "@/lib/config";
export const dynamic = "force-dynamic";
export default async function Home() {
  return <Explorer initial={citySnapshot(await readState(), isDemo())} />;
}
