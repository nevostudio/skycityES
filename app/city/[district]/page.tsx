import { notFound } from "next/navigation";
import Link from "next/link";
import { readState } from "@/lib/store";
import { citySnapshot } from "@/lib/engine";
import { isDemo } from "@/lib/config";
import { Header } from "@/components/header";
import { BuildingArt } from "@/components/property/building-art";
import { euro, propertyUrl } from "@/lib/client";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ district: string }>;
}) {
  const { district } = await params;
  const d = (await readState()).districts.find((d) => d.id === district);
  return {
    title: d?.name || "Neighborhood",
    alternates: { canonical: `/city/${district}` },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ district: string }>;
}) {
  const { district } = await params;
  const data = citySnapshot(await readState(), isDemo());
  const d = data.districts.find((d) => d.id === district);
  if (!d) notFound();
  const properties = data.properties.filter((p) => p.districtId === district);
  return (
    <>
      <Header demo={data.demo} />
      <main className="page-shell">
        <div className="page-heading">
          <div>
            <span className="eyebrow">SKYCITY NEIGHBORHOODS</span>
            <h1>{d.name}.</h1>
            <p>
              {d.subtitle} ·{" "}
              {properties.filter((p) => p.status === "available").length}{" "}
              buildings available.
            </p>
          </div>
          <Link href={`/?district=${d.id}`} className="button coral">
            Explore neighborhood ↗
          </Link>
        </div>
        <div className="featured-grid">
          {properties.map((p) => (
            <Link className="featured-card" href={propertyUrl(p)} key={p.id}>
              <div className="featured-art">
                <BuildingArt property={p} brand={p.ad?.brand} />
              </div>
              <div className="featured-info">
                <span className="eyebrow">{p.status}</span>
                <h3>{p.ad?.brand || p.name}</h3>
                <p>
                  {p.sale === "rental"
                    ? `${euro(p.prices["30"] || Object.values(p.prices)[0])} / ${p.prices["30"] ? "30" : Object.keys(p.prices)[0]} days`
                    : "Iconic auction"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
