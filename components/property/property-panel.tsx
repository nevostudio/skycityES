"use client";
import { useState } from "react";
import {
  X,
  ArrowUpRight,
  ExternalLink,
  Share2,
  Hammer,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { PublicProperty, District } from "@/types";
import { euro, propertyUrl, siteNote, statusLabel } from "@/lib/client";
import { PRESENCE, PRESENCE_TIERS } from "@/lib/presence";
import { architectureOf } from "@/lib/massing";
import { CONTROL_NOTICE } from "@/lib/takeover-policy";
import { track } from "@/lib/analytics/client";
import { TierArt } from "./tier-art";
import { ValueHistory } from "./value-history";
import { ClaimModal } from "../checkout/claim-modal";

const count = (n: number) => new Intl.NumberFormat("es-ES").format(n);

/** Brand tile (PDF page 4): the brand colour with its initial. The logo lives on the sign. */
function BrandTile({ p }: { p: PublicProperty }) {
  return (
    <span
      className="sc-tile"
      style={{ background: p.ad?.primary || "#17322a" }}
    >
      {(p.ad?.brand || p.name).trim().charAt(0).toUpperCase()}
    </span>
  );
}

/** Takeover call to action with the real minimum offer; the logic stays server-side. */
function TakeoverAction({ p, demo }: { p: PublicProperty; demo: boolean }) {
  const min = p.takeover!.minimumOffer;
  const [offer, setOffer] = useState(min);
  const [custom, setCustom] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const value = p.current_property_value ?? 0;
  return (
    <div className="sc-takeover">
      <button
        className="sc-cta"
        disabled={!Number.isFinite(offer) || offer < min}
        onClick={() => setCheckout(true)}
      >
        Hacerme con este edificio
        <span className="sc-chip">{euro(offer)}</span>
      </button>
      <button
        type="button"
        className="sc-link"
        aria-expanded={custom}
        onClick={() => setCustom(!custom)}
      >
        {custom ? "Usar el mínimo" : "Elegir otro importe"}
      </button>
      {custom && (
        <div className="sc-offer">
          <label>
            Tu oferta (€)
            <input
              type="number"
              min={min}
              step="0.01"
              value={offer}
              onChange={(e) => setOffer(Number(e.target.value))}
            />
          </label>
          <div className="takeover-increments">
            {[1, 5, 10, 25, 50].map((n) => (
              <button
                key={n}
                type="button"
                className="button outline"
                onClick={() =>
                  setOffer(Math.max(min, Math.round((value + n) * 100) / 100))
                }
              >
                +{n} €
              </button>
            ))}
          </div>
          <p>
            Tu importe se convertirá en el nuevo valor que deberá superar la
            siguiente persona.
          </p>
        </div>
      )}
      {checkout && (
        <ClaimModal
          property={p}
          demo={demo}
          takeoverOffer={offer}
          onClose={() => setCheckout(false)}
          onComplete={() => location.assign(`/?building=${p.id}`)}
        />
      )}
    </div>
  );
}

/**
 * Property side panel (PDF page 4): ~408 px on the left, almost full height, internal
 * scroll, the city still visible behind. Built buildings show who controls the location,
 * what it is worth and its history; free plots show what can be built.
 */
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
  const policy = p.takeover;
  const history = p.valueHistory || [];
  const isPrivate = p.building?.kind === "private";
  const canUpgrade =
    owned &&
    !!onUpgrade &&
    isPrivate &&
    tier !== "SKYSCRAPER" &&
    tier !== "LANDMARK";
  const arch = architectureOf(p.districtId);
  const free = !p.building && !site;
  return (
    <aside className="sc-panel" aria-label="Solar seleccionado">
      <button
        className="sc-close icon-button"
        onClick={onClose}
        aria-label="Cerrar ficha"
      >
        <X size={18} />
      </button>
      {p.building ? (
        <>
          <header className="sc-head">
            <BrandTile p={p} />
            <div>
              <h2>{p.ad?.brand || p.name}</h2>
              <p>
                <b>{tier === "SKYSCRAPER" ? "RASCACIELOS" : tier}</b> ·{" "}
                {district?.name}
              </p>
            </div>
          </header>
          <span className="sc-sr">
            {p.building.kind === "public"
              ? "EDIFICIO DE LA CIUDAD"
              : `EDIFICIO ${tier}`}
          </span>
          <p className="sc-desc">
            {p.ad?.description ||
              (p.building.kind === "public"
                ? p.description
                : "Este edificio ya tiene propietario.")}
          </p>
          <dl className="sc-stats">
            <div>
              <dt>Visitas</dt>
              <dd>{count(p.views)}</dd>
            </div>
            <div>
              <dt>{isPrivate ? "Valor actual" : "Estado"}</dt>
              <dd>
                {isPrivate
                  ? euro(p.current_property_value ?? 0)
                  : statusLabel[p.status]}
              </dd>
            </div>
          </dl>
          {isPrivate && history.length > 0 && <ValueHistory steps={history} />}
          {isPrivate && !history.length && (
            <p className="sc-note">
              Sin pagos registrados para esta ubicación todavía.
            </p>
          )}
          {canUpgrade && (
            <button className="sc-cta light" onClick={onUpgrade}>
              <TrendingUp size={16} />
              Mejorar edificio
            </button>
          )}
          {isPrivate && policy?.eligible && !owned && policy.open && (
            <TakeoverAction key={p.id} p={p} demo={demo} />
          )}
          {isPrivate && policy?.eligible && (
            <div className="sc-info">
              {policy.reason === "PROTEGIDO" ? (
                <p>
                  <ShieldCheck size={14} /> <b>PROTEGIDO</b>
                  {p.protection_until &&
                    ` hasta ${new Date(p.protection_until).toLocaleString(
                      "es-ES",
                      {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}`}
                  . Cualquier usuario puede superar este valor cuando termine el
                  periodo de protección.
                </p>
              ) : owned ? (
                <p>
                  Cualquier usuario puede superar este valor cuando termine el
                  periodo de protección.
                </p>
              ) : (
                <p>
                  <b>Takeover en una frase:</b>{" "}
                  {CONTROL_NOTICE.charAt(0).toLowerCase() +
                    CONTROL_NOTICE.slice(1)}{" "}
                  Tras el pago tendrás {policy.protectionHours} horas de
                  protección.
                </p>
              )}
            </div>
          )}
          {p.ad?.website && (
            <a
              className="sc-secondary"
              href={p.ad.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("external_link_click", p.id)}
            >
              {p.ad.cta}
              <ExternalLink size={15} />
            </a>
          )}
          {p.ad && (
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
          )}
          {p.ad?.promo && (
            <p className="promo-code">
              Usa el código: <strong>{p.ad.promo}</strong>
            </p>
          )}
        </>
      ) : (
        <>
          <span className="sc-eyebrow">
            {site ? "PARCELA PREMIUM" : p.name.toUpperCase()}
          </span>
          <h2 className="sc-title">{p.name}</h2>
          <p className="sc-meta">
            {district?.name} ·{" "}
            <span className={`sc-status ${p.status}`}>
              {statusLabel[p.status]}
            </span>
          </p>
          <p className="sc-desc">
            {site
              ? p.status === "available"
                ? "Solar para un rascacielos, a precio fijo. Como en el resto de la ciudad, otra marca podrá quedárselo más adelante pagando más."
                : "Parcela reservada para un rascacielos. Inventario premium para grandes marcas."
              : p.status === "reserved"
                ? "Alguien está construyendo aquí ahora mismo. Elige otro solar o vuelve en unos minutos."
                : "Construye aquí tu propio edificio."}
          </p>
          {p.status === "auction" ? (
            <>
              <div className="sc-price">
                <small>
                  {p.auction?.currentBid ? "Puja actual" : "Puja inicial"}
                </small>
                <strong>
                  {euro(p.auction?.currentBid || p.auction?.nextBid || 0)}
                </strong>
              </div>
              <Link href={`/auctions?property=${p.id}`} className="sc-cta">
                Ver subasta <ArrowUpRight size={18} />
              </Link>
            </>
          ) : (
            <>
              <div className="sc-price">
                <small>{site ? "Precio fijo" : "Desde"}</small>
                <strong>{euro(p.price)}</strong>
              </div>
              <button
                disabled={p.status !== "available"}
                className="sc-cta orange"
                onClick={onClaim}
              >
                {p.status === "reserved"
                  ? site
                    ? siteNote(p).charAt(0) + siteNote(p).slice(1).toLowerCase()
                    : "Reservado temporalmente"
                  : site
                    ? "Construir rascacielos"
                    : "CONSTRUIR AQUÍ"}
                {p.status === "available" && <Hammer size={17} />}
              </button>
              <p className="sc-micro">Pago único · Sin registro</p>
            </>
          )}
          {free && (
            <section className="sc-tiers" aria-label="Tamaños de edificio">
              <h3>Qué puedes construir aquí</h3>
              <ol>
                {PRESENCE_TIERS.map((t) => (
                  <li key={t}>
                    <TierArt
                      tier={t}
                      glass={arch === "corporate" || arch === "tech"}
                      fit="row"
                      initial="T"
                    />
                    <b>{t}</b>
                    <span>{euro(PRESENCE[t].price)}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
      <footer className="sc-foot">
        <Link href={propertyUrl(p)}>
          {p.building ? "Ver página del edificio" : "Ver página del solar"}{" "}
          <ArrowUpRight size={13} />
        </Link>
        <button onClick={onShare} aria-label="Compartir">
          <Share2 size={15} />
        </button>
      </footer>
    </aside>
  );
}
