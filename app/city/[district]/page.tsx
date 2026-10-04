import { notFound } from "next/navigation";
import Link from "next/link";
import { readState } from "@/lib/store";
import { citySnapshot } from "@/lib/engine";
import { isDemo } from "@/lib/config";
import { Header } from "@/components/header";
import { PropertyArt } from "@/components/property/building-art";
import { euro, propertyUrl, statusLabel } from "@/lib/client";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ district: string }>;
}) {
  const { district } = await params;
  const d = (await readState()).districts.find((d) => d.id === district);
  return {
    title: d?.name || "Barrio",
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
            <span className="eyebrow">BARRIOS DE SKYCITY</span>
            <h1>{d.name}.</h1>
            <p>
              {d.subtitle} ·{" "}
              {properties.filter((p) => p.status === "available").length}{" "}
              solares disponibles.
            </p>
          </div>
          <Link href={`/?district=${d.id}`} className="button coral">
            Explorar el barrio ↗
          </Link>
        </div>
        <div className="featured-grid">
          {properties.map((p) => (
            <Link className="featured-card" href={propertyUrl(p)} key={p.id}>
              <div className="featured-art">
                <PropertyArt property={p} brand={p.ad?.brand} />
              </div>
              <div className="featured-info">
                <span className="eyebrow">{statusLabel[p.status]}</span>
                <h3>{p.ad?.brand || p.name}</h3>
                <p>
                  {p.building
                    ? p.building.kind === "public"
                      ? "Edificio de la ciudad"
                      : `Edificio ${p.building.tier}`
                    : p.status === "auction"
                      ? "Subasta de rascacielos"
                      : p.status === "available"
                        ? `Desde ${euro(p.price)} · pago único`
                        : "Parcela reservada"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
