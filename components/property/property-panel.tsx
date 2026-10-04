"use client";
import {
  X,
  ArrowUpRight,
  MapPin,
  Eye,
  ShieldCheck,
  Clock,
  ExternalLink,
  Share2,
} from "lucide-react";
import Link from "next/link";
import type { PublicProperty, District } from "@/types";
import { euro, propertyUrl } from "@/lib/client";
import { track } from "@/lib/analytics/client";
import { BuildingArt } from "./building-art";
export function PropertyPanel({
  property: p,
  district,
  onClose,
  onClaim,
  onShare,
}: {
  property: PublicProperty;
  district?: District;
  onClose: () => void;
  onClaim: () => void;
  onShare: () => void;
}) {
  return (
    <aside className="property-panel" aria-label="Selected building">
      <div className="panel-top">
        <span className="eyebrow">YOUR NEXT ADDRESS</span>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close property"
        >
          <X size={18} />
        </button>
      </div>
      {p.ad ? (
        <div className="panel-brand-header">
          <span
            className="panel-brand-avatar"
            style={{ background: p.ad.primary + "18", color: p.ad.primary }}
          >
            {p.ad.logo ? (
              <img src={p.ad.logo} alt="" />
            ) : (
              p.ad.brand.slice(0, 1)
            )}
          </span>
          <div>
            <strong>{p.ad.brand}</strong>
            <span className="panel-claimed">
              <ShieldCheck size={13} /> Claimed
            </span>
          </div>
        </div>
      ) : (
        <div className="property-art">
          <span className={`tier ${p.tier.toLowerCase()}`}>
            {p.inventory === "skyscraper"
              ? "EXCLUSIVE SKYSCRAPER"
              : p.status === "claimed"
                ? p.presenceTier
                : "FROM €3"}
          </span>
          <BuildingArt property={p} />
          <span className={`status-pill ${p.status}`}>
            <i />
            {p.status}
          </span>
        </div>
      )}
      <div className="panel-content">
        <span className="eyebrow">
          <MapPin size={12} />
          {district?.name}
        </span>
        <h2 className={p.ad ? "panel-brand-title" : undefined}>
          {p.ad?.brand || p.name}
        </h2>
        <p className="muted">
          {p.ad?.description ||
            "A place for your next big idea. Give your brand a home in the city."}
        </p>
        <div className="property-facts">
          <span>
            <Eye size={15} />
            {p.views} views
          </span>
          <span>
            <ShieldCheck size={15} />
            One advertiser
          </span>
        </div>
        {p.ad ? (
          <>
            <div className="claimed-note">
              CLAIMED BY <strong>{p.ad.brand}</strong>
              <small>
                Active until{" "}
                {new Date(p.expiresAt!).toLocaleDateString("en-GB")}
              </small>
            </div>
            {p.ad.website && (
              <a
                className="button coral wide"
                href={p.ad.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("external_link_click", p.id)}
              >
                {p.ad.cta}
                <ExternalLink size={16} />
              </a>
            )}
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
            {p.ad.promo && (
              <p className="promo-code">
                Use code: <strong>{p.ad.promo}</strong>
              </p>
            )}
          </>
        ) : p.status === "auction" ? (
          <>
            <div className="price-row">
              <div>
                <small>
                  {p.auction?.currentBid ? "Current bid" : "Starting bid"}
                </small>
                <strong>
                  {euro(p.auction?.currentBid || p.auction?.nextBid || 0)}
                </strong>
              </div>
              <span className="tag gold">Auction</span>
            </div>
            <Link
              href={`/auctions?property=${p.id}`}
              className="button coral wide"
            >
              View auction <ArrowUpRight size={18} />
            </Link>
          </>
        ) : (
          <>
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
              <span className="tag">One-time payment</span>
            </div>
            <button
              disabled={p.status !== "available"}
              className="button coral wide"
              onClick={onClaim}
            >
              {p.status === "reserved"
                ? p.reservedForBrands
                  ? "Reserved for major brands"
                  : "Temporarily reserved"
                : p.status === "claimed"
                  ? "Claimed · ad under review"
                  : `Claim this building`}
              <ArrowUpRight size={18} />
            </button>
            <div className="microcopy">
              <Clock size={12} />
              No account needed. Yours in a minute.
            </div>
          </>
        )}
        <div className="panel-footer">
          <Link href={propertyUrl(p)}>
            View building page <ArrowUpRight size={13} />
          </Link>
          <button onClick={onShare} aria-label="Share this building">
            <Share2 size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
