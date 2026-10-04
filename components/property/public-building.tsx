"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Share2,
  MapPin,
  Eye,
  Hammer,
} from "lucide-react";
import type { CityData } from "@/types";
import { Header } from "../header";
import { PropertyArt } from "./building-art";
import { ClaimModal } from "../checkout/claim-modal";
import { ShareModal } from "./share-modal";
import { useCity } from "@/hooks/use-city";
import { track } from "@/lib/analytics/client";
import { euro, siteNote, statusLabel } from "@/lib/client";
export function PublicBuilding({
  initial,
  propertyId,
}: {
  initial: CityData;
  propertyId: string;
}) {
  const { data, refresh } = useCity(initial);
  const [claim, setClaim] = useState(false);
  const [share, setShare] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const p = data.properties.find((p) => p.id === propertyId)!;
  const site = p.inventory === "skyscraper" && !p.building;
  useEffect(() => {
    track("property_open", propertyId);
    track("property_impression", propertyId);
  }, [propertyId]);
  return (
    <>
      <Header demo={data.demo} />
      <main className="page-shell">
        <Link className="back-link" href={`/?building=${p.id}`}>
          <ArrowLeft size={14} />
          Verlo en la ciudad
        </Link>
        <article className="property-page">
          <div className="property-page-art">
            <PropertyArt property={p} brand={p.ad?.brand} />
          </div>
          <div>
            <span className="eyebrow">
              <MapPin size={12} />
              {data.districts.find((d) => d.id === p.districtId)?.name} · #
              {p.number}
            </span>
            <h1>{p.ad?.brand || p.name}</h1>
            {p.ad?.logo && (
              <img
                className="public-ad-logo"
                src={p.ad.logo}
                alt={`Logo de ${p.ad.brand}`}
              />
            )}
            <p>
              {p.ad?.description ||
                (p.building?.kind === "public"
                  ? p.description
                  : p.building
                    ? "Un edificio con propietario en SkyCity."
                    : site
                      ? "Parcela reservada para un rascacielos. Inventario premium para grandes marcas."
                      : "Un solar vacío esperando una idea. Construye aquí tu propio edificio: pago único, sin registro.")}
            </p>
            {p.ad?.banner && (
              <img
                className="ad-banner"
                src={p.ad.banner}
                alt={`Banner de ${p.ad.brand}`}
              />
            )}
            <div className="property-facts">
              <span>
                <Eye size={15} />
                {p.views} visitas
              </span>
              <span>
                {p.building
                  ? p.building.kind === "public"
                    ? "EDIFICIO PÚBLICO"
                    : `EDIFICIO ${p.building.tier}`
                  : site
                    ? "PARCELA PREMIUM"
                    : `SOLAR · DESDE ${euro(p.price)}`}
              </span>
              <span>{statusLabel[p.status].toUpperCase()}</span>
            </div>
            {p.status === "available" && (
              <div className="price-row">
                <div>
                  <small>{site ? "Precio" : "Desde"}</small>
                  <strong>{euro(p.price)}</strong>
                </div>
                <span>Pago único</span>
              </div>
            )}
            <div className="public-actions">
              {p.status === "available" ? (
                <button
                  className="button coral"
                  onClick={() => {
                    track("claim_clicked", p.id);
                    setClaim(true);
                  }}
                >
                  {site ? "Construir rascacielos" : "Construir aquí"}
                  <Hammer size={16} />
                </button>
              ) : p.ad?.website ? (
                <a
                  className="button coral"
                  href={p.ad.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("external_link_click", p.id)}
                >
                  {p.ad.cta}
                  <ArrowUpRight size={16} />
                </a>
              ) : p.status === "auction" ? (
                <Link
                  className="button coral"
                  href={`/auctions?property=${p.id}`}
                >
                  Ver subasta
                  <ArrowUpRight size={16} />
                </Link>
              ) : (
                <button className="button outline" disabled>
                  {p.status === "reserved"
                    ? site
                      ? siteNote(p).charAt(0) +
                        siteNote(p).slice(1).toLowerCase()
                      : "Reservado temporalmente"
                    : p.status === "public"
                      ? "Edificio de la ciudad"
                      : "Edificio construido"}
                </button>
              )}
              <button className="button outline" onClick={() => setShare(true)}>
                <Share2 size={15} />
                Compartir
              </button>
            </div>
            <div className="social-links">
              {(["instagram", "tiktok", "x", "linkedin"] as const).map(
                (k) =>
                  p.ad?.[k] && (
                    <a
                      key={k}
                      href={p.ad[k]}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track("external_link_click", p.id)}
                    >
                      {k}
                    </a>
                  ),
              )}
            </div>
            {p.ad?.promo && (
              <p className="promo-code">
                Usa el código: <strong>{p.ad.promo}</strong>
              </p>
            )}
          </div>
        </article>
      </main>
      {claim && (
        <ClaimModal
          property={p}
          demo={data.demo}
          onClose={() => setClaim(false)}
          onComplete={async () => {
            await refresh();
            setClaim(false);
            setCelebrate(true);
            setShare(true);
          }}
        />
      )}
      {share && (
        <ShareModal
          property={p}
          celebrate={celebrate}
          onClose={() => {
            setShare(false);
            setCelebrate(false);
          }}
        />
      )}
    </>
  );
}
