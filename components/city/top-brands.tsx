"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Trophy, X } from "lucide-react";
import type { CityData, PublicProperty } from "@/types";
import {
  rankBrands,
  latestPurchase,
  purchaseAge,
  socialNumber,
  brandWebsite,
} from "@/lib/city-social";
import { contrastInk } from "@/lib/brand-theme";
import { districtName, euro } from "@/lib/client";
import { track } from "@/lib/analytics/client";

export function TopBrands({
  data,
  selected,
  onSelect,
  hidden = false,
}: {
  data: CityData;
  selected: string | null;
  onSelect: (p: PublicProperty) => void;
  hidden?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const entries = rankBrands(data.properties);
  const latest = latestPurchase(data.properties);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (mobileOpen) closeButton.current?.focus();
  }, [mobileOpen]);
  const close = () => {
    setOpen(false);
    setMobileOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  const select = (p: PublicProperty) => {
    setMobileOpen(false);
    onSelect(p);
  };
  return (
    <div hidden={hidden}>
      <button
        ref={trigger}
        className={`ranking-trigger ${open ? "desktop-open" : ""} ${mobileOpen ? "mobile-open" : ""}`}
        aria-controls="top-brands"
        aria-label="Abrir Top marcas"
        onClick={() => {
          setOpen(true);
          setMobileOpen(true);
        }}
      >
        <Trophy size={17} /> Top marcas
      </button>
      <aside
        id="top-brands"
        aria-labelledby="top-brands-title"
        className={`top-brands ${open ? "desktop-open" : ""} ${mobileOpen ? "mobile-open" : ""} ${selected ? "has-selection" : ""}`}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            close();
          }
        }}
      >
        <header className="ranking-heading">
          <div>
            <h2 id="top-brands-title">Top marcas</h2>
            <p>Las que más han pagado por estar aquí</p>
          </div>
          <button
            ref={closeButton}
            className="icon-button"
            onClick={close}
            aria-label="Cerrar Top marcas"
          >
            <X size={18} />
          </button>
        </header>
        {data.demo && (
          <span className="ranking-demo">Ciudad demo · compras de prueba</span>
        )}
        {latest && (
          <button
            className="latest-purchase"
            onClick={() => select(latest.property)}
          >
            <span className="latest-heading">
              <b>
                <i /> ÚLTIMA COMPRA
              </b>
              <time dateTime={latest.payment.at}>
                {now ? purchaseAge(latest.payment.at, now) : "Reciente"}
              </time>
            </span>
            <span className="latest-copy">
              <strong>{latest.payment.brand}</strong>{" "}
              {latest.payment.kind === "takeover"
                ? "acaba de tomar una ubicación en"
                : "acaba de construir en"}{" "}
              {districtName(latest.property.districtId, data.districts)}
            </span>
          </button>
        )}
        <ol className="ranking-list">
          {entries.map(({ property: p, value }, i) => {
            const ad = p.ad!;
            const website = brandWebsite(ad.website);
            return (
              <li key={p.id} className={selected === p.id ? "selected" : ""}>
                <button
                  className="ranking-item"
                  aria-label={`Ver ${ad.brand} en ${p.name}`}
                  aria-pressed={selected === p.id}
                  onClick={() => select(p)}
                >
                  <span
                    className="ranking-avatar"
                    style={{
                      background: ad.primary,
                      color: contrastInk(ad.primary),
                    }}
                  >
                    <span
                      className={`ranking-position ${i < 3 ? "podium" : ""}`}
                    >
                      {i + 1}
                    </span>
                    {ad.brand.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="ranking-copy">
                    <span className="ranking-name">
                      <strong>{ad.brand}</strong>
                      <b>{euro(value)}</b>
                    </span>
                    {(ad.tagline || ad.description) && (
                      <span className="ranking-description">
                        {ad.tagline || ad.description}
                      </span>
                    )}
                    <span className="ranking-location">
                      {p.name} · {socialNumber(p.views)} visitas
                    </span>
                  </span>
                </button>
                {website && (
                  <a
                    className="ranking-website"
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visitar web de ${ad.brand}`}
                    onClick={() => track("external_link_click", p.id)}
                  >
                    Visitar web <ArrowUpRight size={12} />
                  </a>
                )}
              </li>
            );
          })}
        </ol>
        {!entries.length && (
          <div className="ranking-empty">
            <Trophy size={28} />
            <h3>Tu marca puede ser la primera.</h3>
            <p>
              Las compras confirmadas aparecerán aquí. Construye tu lugar en
              SkyCity desde 3 €.
            </p>
          </div>
        )}
        <p className="ranking-footnote">
          Ordenado por el valor actual de cada ubicación.
        </p>
      </aside>
    </div>
  );
}
