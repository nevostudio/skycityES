"use client";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { CityData, PublicProperty } from "@/types";
import { BuildingArt } from "../property/building-art";
import { euro, offerPrice, offerDays } from "@/lib/client";
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
          <span className="eyebrow">A FEW PLACES YOU MIGHT LOVE</span>
          <h2>Location, location, your location.</h2>
        </div>
        <button
          className="text-button"
          onClick={() => {
            onExplore();
          }}
        >
          Explore all spots <ArrowRight size={16} />
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
                  ? "ICONIC LOCATION"
                  : p.tier === "POPULAR"
                    ? "NEIGHBORHOOD FAVORITE"
                    : p.tier === "PREMIUM"
                      ? "STAND A LITTLE TALLER"
                      : "MAKE YOUR MARK"}
              </span>
              <BuildingArt property={p} brand={p.ad?.brand} />
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
                    ? "Auction live"
                    : p.status === "claimed"
                      ? "Claimed"
                      : "Available to claim"}
                </span>
                <strong>
                  {p.sale === "auction"
                    ? euro(p.auction?.nextBid || 0)
                    : euro(offerPrice(p))}
                  <small>
                    {p.sale === "auction"
                      ? " min. bid"
                      : ` / ${offerDays(p)} days`}
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
