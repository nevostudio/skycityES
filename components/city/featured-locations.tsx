"use client";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { CityData, PublicProperty } from "@/types";
import { PropertyArt } from "../property/building-art";
import { euro } from "@/lib/client";
export function FeaturedLocations({
  data,
  choose,
  onExplore,
}: {
  data: CityData;
  choose: (p: PublicProperty) => void;
  onExplore: () => void;
}) {
  const featured = data.properties.filter((p) => p.featured).slice(0, 4);
  return (
    <section className="featured">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ALGUNOS SITIOS QUE TE PUEDEN ENCANTAR</span>
          <h2>Ubicación, ubicación, tu ubicación.</h2>
        </div>
        <button
          className="text-button"
          onClick={() => {
            onExplore();
          }}
        >
          Ver todos los solares <ArrowRight size={16} />
        </button>
      </div>
      <div className="featured-grid">
        {featured.map((p, i) => (
          <button
            className="featured-card"
            key={p.id}
            onClick={() => {
              choose(p);
              document
                .querySelector(".map-shell")
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            <div className={`featured-art art-${i}`}>
              <span
                className={`card-badge ${p.sale === "auction" ? "gold" : ""}`}
              >
                {p.sale === "auction"
                  ? "PARCELA PREMIUM"
                  : p.tier === "POPULAR"
                    ? "FAVORITO DEL BARRIO"
                    : "DEJA TU HUELLA"}
              </span>
              <PropertyArt property={p} brand={p.ad?.brand} />
              <span className="card-arrow">
                <ArrowUpRight size={19} />
              </span>
            </div>
            <div className="featured-info">
              <span className="eyebrow">
                {data.districts.find((d) => d.id === p.districtId)?.name}
              </span>
              <h3>{p.name}</h3>
              <div>
                <span>
                  <i className={`status-dot ${p.status}`} />
                  {p.status === "auction"
                    ? "Subasta en directo"
                    : p.building
                      ? "Construido"
                      : "Disponible para construir"}
                </span>
                <strong>
                  {p.sale === "auction"
                    ? euro(p.auction?.nextBid || 0)
                    : euro(p.price)}
                  <small>
                    {p.sale === "auction" ? " puja mín." : " pago único"}
                  </small>
                </strong>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
