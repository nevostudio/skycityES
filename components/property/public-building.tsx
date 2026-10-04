"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Share2, MapPin, Eye } from "lucide-react";
import type { CityData } from "@/types";
import { Header } from "../header";
import { BuildingArt } from "./building-art";
import { ClaimModal } from "../checkout/claim-modal";
import { ShareModal } from "./share-modal";
import { useCity } from "@/hooks/use-city";
import { track } from "@/lib/analytics/client";
import { euro } from "@/lib/client";
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
          Find it in the city
        </Link>
        <article className="property-page">
          <div className="property-page-art">
            <BuildingArt property={p} brand={p.ad?.brand} />
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
                alt={`${p.ad.brand} logo`}
              />
            )}
            <p>
              {p.ad?.description ||
                "A home for your brand in a city built for discovery. One building, one advertiser, and a whole neighborhood of possibilities."}
            </p>
            {p.ad?.banner && (
              <img
                className="ad-banner"
                src={p.ad.banner}
                alt={`${p.ad.brand} banner`}
              />
            )}
            <div className="property-facts">
              <span>
                <Eye size={15} />
                {p.views} profile views
              </span>
              <span>
                {p.inventory === "skyscraper"
                  ? "EXCLUSIVE SKYSCRAPER"
                  : p.status === "claimed"
                    ? p.presenceTier
                    : "PRESENCE FROM €3"}
              </span>
              <span>{p.status.toUpperCase()}</span>
            </div>
            {p.status === "available" && (
              <div className="price-row">
                <div>
                  <strong>
                    {euro(p.prices["30"] || Object.values(p.prices)[0])}
                  </strong>
                  <span>
                    {" "}
                    / {p.prices["30"] ? "30" : Object.keys(p.prices)[0]} days
                  </span>
                </div>
                <span>One-time payment</span>
              </div>
            )}
            {p.expiresAt && (
              <p className="microcopy">
                Advertising placement active until{" "}
                {new Date(p.expiresAt).toLocaleDateString("en-GB")}
              </p>
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
                  Claim this building
                  <ArrowUpRight size={16} />
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
                  View auction
                  <ArrowUpRight size={16} />
                </Link>
              ) : (
                <span className="button outline">
                  {p.status === "reserved"
                    ? p.reservedForBrands
                      ? "Reserved for major brands"
                      : "Temporarily reserved"
                    : "Placement claimed"}
                </span>
              )}
              <button className="button outline" onClick={() => setShare(true)}>
                <Share2 size={15} />
                Share
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
                Use code: <strong>{p.ad.promo}</strong>
              </p>
            )}
          </div>
        </article>
      </main>
      {claim && (
        <ClaimModal
          property={p}
          durations={data.durations}
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
