import { notFound } from "next/navigation";
import { PublicBuilding } from "@/components/property/public-building";
import { readState } from "@/lib/store";
import { citySnapshot } from "@/lib/engine";
import { isDemo } from "@/lib/config";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ building: string }>;
}) {
  const { building } = await params;
  const p = (await readState()).properties.find((p) => p.id === building);
  return {
    title: `Subasta de ${p?.name || "rascacielos"}`,
    alternates: { canonical: `/auctions/${building}` },
    openGraph: { images: [`/api/og/${building}`] },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ building: string }>;
}) {
  const { building } = await params;
  const data = citySnapshot(await readState(), isDemo());
  const p = data.properties.find(
    (p) => p.id === building && p.sale === "auction",
  );
  if (!p) notFound();
  return <PublicBuilding initial={data} propertyId={p.id} />;
}
