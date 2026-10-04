import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readState } from "@/lib/store";
import { citySnapshot } from "@/lib/engine";
import { isDemo } from "@/lib/config";
import { PublicBuilding } from "@/components/property/public-building";
type Props = { params: Promise<{ district: string; building: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { district, building } = await params;
  const data = citySnapshot(await readState(), isDemo());
  const p = data.properties.find(
    (p) => p.id === building && p.districtId === district,
  );
  if (!p) return { title: "Building not found" };
  const title = `${p.ad?.brand || p.name} in ${data.districts.find((d) => d.id === district)?.name}`;
  return {
    title,
    description:
      p.ad?.description ||
      `Claim ${p.name} in SkyCity and put your brand on the map.`,
    alternates: { canonical: `/city/${district}/${building}` },
    openGraph: {
      title,
      images: [{ url: `/api/og/${building}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [`/api/og/${building}`] },
  };
}
export default async function Page({ params }: Props) {
  const { district, building } = await params;
  const data = citySnapshot(await readState(), isDemo());
  const p = data.properties.find(
    (p) => p.id === building && p.districtId === district,
  );
  if (!p) notFound();
  return <PublicBuilding initial={data} propertyId={p.id} />;
}
