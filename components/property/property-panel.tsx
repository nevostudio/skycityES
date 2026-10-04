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
  Hammer,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { PublicProperty, District } from "@/types";
import { euro, propertyUrl, siteNote, statusLabel } from "@/lib/client";
import { PRESENCE } from "@/lib/presence";
import { track } from "@/lib/analytics/client";
import { PropertyArt } from "./building-art";
import { TakeoverCard } from "./takeover-card";
export function PropertyPanel({
  property: p,
  district,
  owned = false,
  demo = false,
  onClose,
  onClaim,
  onUpgrade,
  onShare,
}: {
  property: PublicProperty;
  district?: District;
  owned?: boolean;
  demo?: boolean;
  onClose: () => void;
  onClaim: () => void;
  onUpgrade?: () => void;
  onShare: () => void;
}) {
  const site = p.inventory === "skyscraper" && !p.building;
  const tier = p.building?.tier;
  const canUpgrade =
    owned &&
    !!onUpgrade &&
    p.building?.kind === "private" &&
    tier !== "SKYSCRAPER" &&
    tier !== "LANDMARK";
  const upgrade = canUpgrade && (
    <button className="button outline wide" onClick={onUpgrade}>
      <TrendingUp size={16} />
      Mejorar edificio
    </button>
  );
  return (
    <aside className="property-panel" aria-label="Solar seleccionado">
      <div className="panel-top">
        <span className="eyebrow">
          {p.building
            ? p.building.kind === "public"
              ? "EDIFICIO DE LA CIUDAD"
              : `EDIFICIO ${tier}`
            : site
              ? "PARCELA PREMIUM"
              : p.name.toUpperCase()}
        </span>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Cerrar ficha"
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
              <ShieldCheck size={13} /> Construido
            </span>
          </div>
        </div>
      ) : (
        <div className="property-art">
          <span className={`tier ${p.tier.toLowerCase()}`}>
            {site
              ? `DESDE ${euro(p.price)}`
              : p.building
                ? p.building.kind === "public"
                  ? "PÚBLICO"
                  : tier
                : `DESDE ${euro(p.price)}`}
          </span>
          <PropertyArt property={p} />
          <span className={`status-pill ${p.status}`}>
            <i />
            {statusLabel[p.status]}
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
            (p.building?.kind === "public"
              ? p.description
              : p.building
                ? "Este edificio ya tiene propietario."
                : site
                  ? "Parcela reservada para un rascacielos. Inventario premium para grandes marcas."
                  : p.status === "reserved"
                    ? "Alguien está construyendo aquí ahora mismo. Elige otro solar o vuelve en unos minutos."
                    : "Construye aquí tu propio edificio.")}
        </p>
        <div className="property-facts">
          <span>
            <Eye size={15} />
            {p.views} visitas
          </span>
          <span>
            <ShieldCheck size={15} />
            {p.building
              ? `${p.building.floors} ${p.building.floors === 1 ? "planta" : "plantas"}`
              : "Un solo propietario"}
          </span>
        </div>
        {p.ad ? (
          <>
            <div className="claimed-note">
              CONSTRUIDO POR <strong>{p.ad.brand}</strong>
              <small>
                Edificio {tier}
                {tier !== "SKYSCRAPER" && tier && tier in PRESENCE
                  ? ` · ${PRESENCE[tier as keyof typeof PRESENCE].floors}`
                  : ""}
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
            {upgrade}
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
                Usa el código: <strong>{p.ad.promo}</strong>
              </p>
            )}
          </>
        ) : p.building ? (
          <>
            <div className="claimed-note">
              {p.building.kind === "public"
                ? "EDIFICIO PÚBLICO"
                : "EDIFICIO PRIVADO"}
              <small>
                {p.building.kind === "public"
                  ? "Forma parte de la ciudad. No está a la venta."
                  : "Su propietario lo está preparando."}
              </small>
            </div>
            {upgrade}
          </>
        ) : p.status === "auction" ? (
          <>
            <div className="price-row">
              <div>
                <small>
                  {p.auction?.currentBid ? "Puja actual" : "Puja inicial"}
                </small>
                <strong>
                  {euro(p.auction?.currentBid || p.auction?.nextBid || 0)}
                </strong>
              </div>
              <span className="tag gold">Subasta</span>
            </div>
            <Link
              href={`/auctions?property=${p.id}`}
              className="button coral wide"
            >
              Ver subasta <ArrowUpRight size={18} />
            </Link>
          </>
        ) : (
          <>
            <div className="price-row">
              <div>
                <small>{site ? "Precio orientativo" : "Desde"}</small>
                <strong>{euro(p.price)}</strong>
              </div>
              <span className="tag">
                {site ? "Inventario premium" : "Pago único"}
              </span>
            </div>
            <button
              disabled={p.status !== "available"}
              className="button coral wide"
              onClick={onClaim}
            >
              {p.status === "reserved"
                ? site
                  ? siteNote(p).charAt(0) + siteNote(p).slice(1).toLowerCase()
                  : "Reservado temporalmente"
                : site
                  ? "Construir rascacielos"
                  : "CONSTRUIR AQUÍ"}
              {p.status === "available" ? (
                <Hammer size={17} />
              ) : (
                <ArrowUpRight size={18} />
              )}
            </button>
            <div className="microcopy">
              <Clock size={12} />
              Pago único · Sin registro
            </div>
          </>
        )}
        <TakeoverCard key={p.id} property={p} owned={owned} demo={demo} />
        <div className="panel-footer">
          <Link href={propertyUrl(p)}>
            {p.building ? "Ver página del edificio" : "Ver página del solar"}{" "}
            <ArrowUpRight size={13} />
          </Link>
          <button onClick={onShare} aria-label="Compartir">
            <Share2 size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
