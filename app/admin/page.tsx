import { Admin } from "@/components/admin/admin";
import { isDemo } from "@/lib/config";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Ayuntamiento",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <Admin demo={isDemo()} />;
}
