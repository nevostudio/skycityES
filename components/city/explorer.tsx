"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  ArrowUpRight,
  SlidersHorizontal,
  Plus,
  Minus,
  Maximize,
  Move,
  MousePointer2,
  Compass,
  Layers3,
  X,
  Radio,
  ChevronDown,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import type { BuildingTier, CityData, Lease, PublicProperty } from "@/types";
import { useCity } from "@/hooks/use-city";
import { Header } from "../header";
import { DistrictSidebar } from "./district-sidebar";
import CityScene from "./city-loader";
import type { Construction } from "./building";
import { PropertyPanel } from "../property/property-panel";
import { ClaimModal } from "../checkout/claim-modal";
import { ShareModal } from "../property/share-modal";
import { api, districtName, euro, statusLabel } from "@/lib/client";
import { buildingHeight } from "@/lib/presence";
import { track } from "@/lib/analytics/client";
const filters = [
  "Todos",
  "Disponibles",
  "Construidos",
  "Subastas",
  "Públicos",
  "Premium",
  "Destacados",
];
const quickFilters: Record<string, string> = {
  Todos: "Todo",
  Disponibles: "Solares libres",
  Construidos: "Construidos",
  Subastas: "Subastas",
};
const dotClass: Record<string, string> = {
  Disponibles: "available",
  Construidos: "claimed",
  Subastas: "auction",
};
const activityLabel: Record<string, string> = {
  claimed: "ha construido en",
  upgraded: "ha hecho crecer",
  renewed: "ha renovado",
  bid: "ha pujado por",
};
type Owned = Pick<Lease, "id" | "propertyId" | "email" | "ad" | "presenceTier">;
function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
export function Explorer({
  initial,
  initialProperty,
}: {
  initial: CityData;
  initialProperty?: string;
}) {
  const { data, refresh, error } = useCity(initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [district, setDistrict] = useState("all");
  const [selected, setSelected] = useState<string | null>(
    initialProperty || null,
  );
  const [claim, setClaim] = useState(false);
  const [upgrade, setUpgrade] = useState<Owned | null>(null);
  const [share, setShare] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [reset, setReset] = useState(0);
  const [list, setList] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [introHidden, setIntroHidden] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [owned, setOwned] = useState<Owned[]>([]);
  const [constructing, setConstructing] = useState<
    Record<string, Construction>
  >({});
  const shareAfterBuild = useRef<string | null>(null);
  const previous = useRef<Map<string, BuildingTier | undefined> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const loadOwned = useCallback(async () => {
    try {
      const me = await api<{ leases?: Owned[] }>("/api/me");
      setOwned(me.leases || []);
    } catch {
      setOwned([]);
    }
  }, []);
  /** Plot → foundations → structure → growth → building, for every new or grown building. */
  const build = useCallback((p: PublicProperty, from?: BuildingTier) => {
    if (reducedMotion() || !p.building) return false;
    const ratio =
      from && from !== p.building.tier
        ? Math.min(0.95, buildingHeight(from, p.model) / p.height)
        : 0;
    setConstructing((c) => ({
      ...c,
      [p.id]: { from: ratio, start: performance.now() },
    }));
    return true;
  }, []);
  const built = useCallback((id: string) => {
    setConstructing((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
    if (shareAfterBuild.current === id) {
      shareAfterBuild.current = null;
      setCelebrate(true);
      setShare(true);
    }
  }, []);
  useEffect(() => {
    // The city grows live: animate any building that appeared or grew since the last refresh.
    const now = new Map(data.properties.map((p) => [p.id, p.building?.tier]));
    const before = previous.current;
    previous.current = now;
    if (!before) {
      const q = new URLSearchParams(location.search);
      for (const p of data.properties)
        if (
          p.building &&
          (p.building.state === "CONSTRUCTING" ||
            (q.has("obra") && q.get("building") === p.id))
        )
          build(p, p.building.upgradedAt ? p.building.previousTier : undefined);
      return;
    }
    for (const p of data.properties)
      if (p.building && before.get(p.id) !== p.building.tier)
        build(p, before.get(p.id));
  }, [data.properties, build]);
  useEffect(() => {
    void loadOwned();
    const q = new URLSearchParams(location.search);
    if (q.get("building")) {
      setSelected(q.get("building"));
      setIntroHidden(true);
    }
    if (q.has("available")) {
      setFilter("Disponibles");
      setList(true);
      setIntroHidden(true);
    }
    if (q.has("district")) {
      setDistrict(q.get("district")!);
      setIntroHidden(true);
    }
    track("city_impression");
    function keyboard(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && !document.querySelector("[role=dialog]")) {
        setSidebar(false);
        setList(false);
        setQuery("");
        setSelected(null);
      }
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [loadOwned]);
  const matching = data.properties.filter(
    (p) =>
      (district === "all" || p.districtId === district) &&
      `${p.name} ${p.number} ${districtName(p.districtId, data.districts)} ${p.ad?.brand || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "Todos" ||
        (filter === "Disponibles" && p.status === "available") ||
        (filter === "Construidos" && !!p.building) ||
        (filter === "Subastas" && p.status === "auction") ||
        (filter === "Públicos" && p.status === "public") ||
        (filter === "Premium" &&
          (p.inventory === "skyscraper" ||
            ["PREMIUM", "LANDMARK"].includes(p.building?.tier || ""))) ||
        (filter === "Destacados" && p.featured)),
  );
  const p = data.properties.find((p) => p.id === selected);
  const mine = p && owned.find((l) => l.propertyId === p.id);
  const cheapest = data.properties
    .filter((p) => p.status === "available")
    .sort((a, b) => a.price - b.price)[0];
  const focused = data.districts.find((d) => d.id === district) || null;
  const choose = useCallback((p: PublicProperty) => {
    setSelected(p.id);
    setIntroHidden(true);
    setSidebar(false);
    setList(false);
    setQuery("");
    track("property_open", p.id);
    track("property_impression", p.id);
  }, []);
  function findSpot() {
    const next =
      matching
        .filter((p) => p.status === "available" && p.inventory === "normal")
        .sort((a, b) => a.price - b.price)[0] || cheapest;
    if (next) choose(next);
    else {
      setList(true);
      setFilter("Todos");
    }
  }
  async function completed(id: string) {
    const next = await refresh();
    await loadOwned();
    setClaim(false);
    setUpgrade(null);
    const after = next?.properties.find((v) => v.id === id);
    // Share once the building has finished rising (or right away without motion).
    if (after?.building && !reducedMotion()) shareAfterBuild.current = id;
    else {
      setCelebrate(true);
      setShare(true);
    }
  }
  const showIntro = !introHidden && !p && !query && !list;
  return (
    <div className="app immersive-app">
      <Header demo={data.demo} onClaim={findSpot} />
      <main className="city-experience">
        <section
          className="map-shell"
          aria-label="Explora el mapa interactivo de SkyCity"
        >
          <div className="map-canvas">
            <CityScene
              properties={data.properties}
              districts={data.districts}
              selected={selected}
              onSelect={choose}
              matching={matching.map((p) => p.id)}
              focus={focused}
              zoomAction={zoom}
              resetKey={reset}
              constructing={constructing}
              highlightPlots={filter === "Disponibles"}
              onBuilt={built}
            />
          </div>
          {showIntro && (
            <section className="world-intro">
              <button
                className="intro-dismiss icon-button"
                aria-label="Ocultar introducción"
                onClick={() => setIntroHidden(true)}
              >
                <X size={15} />
              </button>
              <div className="intro-kicker">
                <span />
                UNA CIUDAD POR CONSTRUIR
              </div>
              <h1>
                Construye tu marca
                <br />
                en el mapa<span>.</span>
              </h1>
              <p>
                Elige un solar y levanta tu edificio desde{" "}
                {euro(cheapest?.price ?? 3)}.
              </p>
              <button className="intro-claim" onClick={findSpot}>
                Elegir mi solar <ArrowUpRight size={16} />
              </button>
              <ul className="intro-legend" aria-label="Leyenda del mapa">
                <li>
                  <i className="legend-brand" />
                  {data.stats.privateBuilt} marcas ya han construido
                </li>
                <li>
                  <i className="legend-plot" />
                  {data.stats.available} solares libres desde{" "}
                  {euro(cheapest?.price ?? 3)}
                </li>
              </ul>
              <small>Pago único, sin registro.</small>
            </section>
          )}
          <div className="map-toolbar">
            <div className="search-box">
              <Search size={19} />
              <input
                ref={searchRef}
                aria-label="Buscar en SkyCity"
                placeholder="Busca solares, marcas, barrios…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query ? (
                <button
                  aria-label="Borrar búsqueda"
                  onClick={() => setQuery("")}
                >
                  <X size={15} />
                </button>
              ) : (
                <kbd>/</kbd>
              )}
            </div>
            <div className="quick-filters">
              {Object.entries(quickFilters).map(([f, label]) => (
                <button
                  key={f}
                  aria-pressed={filter === f}
                  className={filter === f ? "active" : ""}
                  onClick={() => {
                    setFilter(f);
                    setIntroHidden(true);
                  }}
                >
                  {dotClass[f] && <i className={`status-dot ${dotClass[f]}`} />}{" "}
                  {label}
                </button>
              ))}
            </div>
            <label className="filter-select" title="Más filtros">
              <SlidersHorizontal size={17} />
              <select
                aria-label="Filtrar solares"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setIntroHidden(true);
                }}
              >
                {filters.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="world-district-control">
            <button
              className={`district-trigger ${sidebar ? "active" : ""}`}
              aria-label="Barrios"
              aria-expanded={sidebar}
              onClick={() => setSidebar(!sidebar)}
            >
              <MapPin size={22} />
              <span>
                <strong>{focused?.name || "Toda SkyCity"}</strong>
                <small>
                  {focused
                    ? data.properties.filter((p) => p.districtId === focused.id)
                        .length
                    : data.stats.plots}{" "}
                  solares
                </small>
              </span>
              <ChevronDown size={15} />
            </button>
            <DistrictSidebar
              data={data}
              district={district}
              setDistrict={(value) => {
                setDistrict(value);
                setSelected(null);
                setIntroHidden(true);
              }}
              sidebar={sidebar}
              setSidebar={setSidebar}
            />
          </div>
          {(list || query) && (
            <section
              className="directory world-directory"
              aria-label="Directorio de solares"
            >
              <div className="section-heading">
                <div>
                  <span className="eyebrow">ENCUENTRA TU RINCÓN</span>
                  <h2>
                    {matching.length}{" "}
                    {filter === "Destacados"
                      ? "ubicaciones destacadas"
                      : "resultados"}
                  </h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Cerrar directorio"
                  onClick={() => {
                    setList(false);
                    setQuery("");
                  }}
                >
                  <X size={17} />
                </button>
              </div>
              <div className="directory-grid">
                {matching.slice(0, 60).map((p) => (
                  <button key={p.id} onClick={() => choose(p)}>
                    <span className={`status-dot ${p.status}`} />
                    <span>
                      <strong>{p.ad?.brand || p.name}</strong>
                      <small>
                        {districtName(p.districtId, data.districts)} · #
                        {p.number}
                      </small>
                    </span>
                    <b>
                      {p.status === "available"
                        ? `Desde ${euro(p.price)}`
                        : statusLabel[p.status]}
                    </b>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
              {!matching.length && (
                <p>Ningún resultado. Prueba otro barrio u otro filtro.</p>
              )}
              {matching.length > 60 && (
                <p className="microcopy">
                  Mostrando 60 ubicaciones. Busca para afinar.
                </p>
              )}
            </section>
          )}
          {p && (
            <PropertyPanel
              demo={data.demo}
              property={p}
              district={data.districts.find((d) => d.id === p.districtId)}
              owned={!!mine}
              onClose={() => setSelected(null)}
              onClaim={() => {
                track("claim_clicked", p.id);
                setClaim(true);
              }}
              onUpgrade={() => mine && setUpgrade(mine)}
              onShare={() => setShare(true)}
            />
          )}
          {error && (
            <p className="error world-error" role="status">
              Actualizaciones de la ciudad en pausa. {error}
            </p>
          )}
          <div className="world-status">
            <div className="world-counters">
              <span>
                <i className="status-dot claimed" />
                <strong>{data.stats.built}</strong> edificios construidos
              </span>
              <span>
                <i className="status-dot available" />
                <strong>{data.stats.available}</strong> solares disponibles
              </span>
              <span>
                <strong>{data.stats.builtPercent}%</strong> construido
              </span>
              <button
                onClick={() => {
                  setFilter("Subastas");
                  setList(true);
                  setIntroHidden(true);
                }}
              >
                <i className="status-dot auction" />
                {data.stats.auctions} subastas
              </button>
            </div>
            <button
              className="world-activity-trigger"
              onClick={() => setActivityOpen(!activityOpen)}
              aria-expanded={activityOpen}
            >
              <Radio size={13} />
              {data.demo ? "Actividad demo" : "Por la ciudad"}
              <ChevronDown size={12} />
            </button>
            {activityOpen && (
              <div className="world-activity">
                <span className="eyebrow">
                  {data.demo ? "ACTIVIDAD DEMO" : "POR LA CIUDAD"}
                </span>
                {data.activity.slice(0, 5).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      const p = data.properties.find(
                        (p) => p.id === a.propertyId,
                      );
                      if (p) choose(p);
                      setActivityOpen(false);
                    }}
                  >
                    <i>{a.brand[0]}</i>
                    <span>
                      <strong>{a.brand}</strong>
                      <small>
                        {activityLabel[a.action] || a.action}{" "}
                        {
                          data.properties.find((p) => p.id === a.propertyId)
                            ?.name
                        }
                      </small>
                    </span>
                    <ArrowUpRight size={13} />
                  </button>
                ))}
                {!data.activity.length && (
                  <p>La ciudad espera a su primer vecino.</p>
                )}
                <div className="world-links">
                  <Link href="/about">Sobre SkyCity</Link>
                  <Link href="/admin">Ayuntamiento ↗</Link>
                </div>
              </div>
            )}
          </div>
          <div className="world-instructions">
            <Move size={16} />
            <span>Arrastra para explorar</span>
            <i />
            <span>Rueda para hacer zoom</span>
            <i />
            <MousePointer2 size={14} />
            <span>Haz clic para descubrir</span>
          </div>
          <div className="world-map-controls">
            <div className="map-compass">
              <Compass size={33} strokeWidth={1.3} />
              <span>N</span>
            </div>
            <div className="map-controls">
              <button
                aria-label="Acercar"
                onClick={() => setZoom((z) => z + 1)}
              >
                <Plus size={19} />
              </button>
              <button aria-label="Alejar" onClick={() => setZoom((z) => z - 1)}>
                <Minus size={19} />
              </button>
              <span />
              <button
                aria-label="Restablecer cámara"
                onClick={() => {
                  setSelected(null);
                  setDistrict("all");
                  setReset((r) => r + 1);
                }}
              >
                <Maximize size={17} />
              </button>
            </div>
            <button
              className={`world-directory-button ${list ? "active" : ""}`}
              onClick={() => {
                setList(!list);
                setSidebar(false);
                setIntroHidden(true);
              }}
              aria-label={list ? "Ocultar directorio" : "Directorio de solares"}
            >
              <Layers3 size={18} />
            </button>
          </div>
        </section>
      </main>
      {claim && p && (
        <ClaimModal
          property={p}
          demo={data.demo}
          onClose={() => setClaim(false)}
          onComplete={() => completed(p.id)}
        />
      )}
      {upgrade && p && (
        <ClaimModal
          property={p}
          demo={data.demo}
          upgradeLeaseId={upgrade.id}
          initialAd={upgrade.ad}
          email={upgrade.email}
          onClose={() => setUpgrade(null)}
          onComplete={() => completed(p.id)}
        />
      )}
      {share && p && (
        <ShareModal
          property={p}
          celebrate={celebrate}
          onClose={() => {
            setShare(false);
            setCelebrate(false);
          }}
        />
      )}
    </div>
  );
}
