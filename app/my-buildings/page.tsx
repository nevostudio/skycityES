import { Dashboard } from "@/components/dashboard/dashboard";
import { citySnapshot } from "@/lib/engine";
import { readState } from "@/lib/store";
import { isDemo } from "@/lib/config";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "My buildings",
  robots: { index: false, follow: false },
};
export default async function Page() {
  return <Dashboard initial={citySnapshot(await readState(), isDemo())} />;
}
