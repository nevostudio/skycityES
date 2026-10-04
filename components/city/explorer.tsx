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
import type { CityData, PublicProperty } from "@/types";
import { useCity } from "@/hooks/use-city";
import { Header } from "../header";
import { DistrictSidebar } from "./district-sidebar";
import CityScene from "./city-loader";
import { PropertyPanel } from "../property/property-panel";
import { ClaimModal } from "../checkout/claim-modal";
import { ShareModal } from "../property/share-modal";
import { euro, offerPrice, offerDays } from "@/lib/client";
import { track } from "@/lib/analytics/client";
const filters = [
  "All buildings",
  "Available",
  "Claimed",
  "Auction",
  "Under €5",
  "Under €10",
  "Premium",
  "Featured",
];
export function Explorer({
  initial,
  initialProperty,
}: {
  initial: CityData;
  initialProperty?: string;
}) {
  const { data, refresh, error } = useCity(initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All buildings");
  const [district, setDistrict] = useState("all");
  const [selected, setSelected] = useState<string | null>(
    initialProperty || null,
  );
  const [claim, setClaim] = useState(false);
  const [share, setShare] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [reset, setReset] = useState(0);
  const [list, setList] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [introHidden, setIntroHidden] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get("building")) {
      setSelected(q.get("building"));
      setIntroHidden(true);
    }
    if (q.has("available")) {
      setFilter("Available");
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
  }, []);
  const matching = data.properties.filter(
    (p) =>
      (district === "all" || p.districtId === district) &&
      `${p.name} ${p.number} ${p.districtId.replaceAll("-", " ")} ${p.ad?.brand || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All buildings" ||
        (filter === "Available" && p.status === "available") ||
        (filter === "Claimed" && p.status === "claimed") ||
        (filter === "Auction" && p.status === "auction") ||
        (filter === "Under €5" &&
          p.status === "available" &&
          offerPrice(p) <= 5) ||
        (filter === "Under €10" &&
          p.status === "available" &&
          offerPrice(p) <= 10) ||
        (filter === "Premium" &&
          (p.inventory === "skyscraper" ||
            ["PREMIUM", "LANDMARK"].includes(p.presenceTier || ""))) ||
        (filter === "Featured" && p.featured)),
  );
  const p = data.properties.find((p) => p.id === selected);
  const cheapest = data.properties
    .filter((p) => p.status === "available")
    .sort((a, b) => offerPrice(a) - offerPrice(b))[0];
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
        .filter((p) => p.status === "available")
        .sort((a, b) => offerPrice(a) - offerPrice(b))[0] || cheapest;
    if (next) choose(next);
    else {
      setList(true);
      setFilter("All buildings");
    }
  }
  const showIntro = !introHidden && !p && !query && !list;
  return (
    <div className="app immersive-app">
      <Header demo={data.demo} onClaim={findSpot} />
      <main className="city-experience">
        <section
          className="map-shell"
          aria-label="Explore the SkyCity interactive map"
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
            />
          </div>
          {showIntro && (
            <section className="world-intro">
              <button
                className="intro-dismiss icon-button"
                aria-label="Hide introduction"
                onClick={() => setIntroHidden(true)}
              >
                <X size={15} />
              </button>
              <div className="intro-kicker">
                <span />
                AN OPEN CITY FOR BIG IDEAS
              </div>
              <h1>
                Put your brand
                <br />
                on the map<span>.</span>
              </h1>
              <p>Claim your place in SkyCity from €3.</p>
              <button className="intro-claim" onClick={findSpot}>
                Find my spot <ArrowUpRight size={16} />
              </button>
              {cheapest && (
                <small>
                  From {euro(offerPrice(cheapest))} / {offerDays(cheapest)}{" "}
                  days. No account needed.
                </small>
              )}
            </section>
          )}
          <div className="map-toolbar">
            <div className="search-box">
              <Search size={19} />
              <input
                ref={searchRef}
                aria-label="Search SkyCity"
                placeholder="Search buildings, brands, neighborhoods…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query ? (
                <button aria-label="Clear search" onClick={() => setQuery("")}>
                  <X size={15} />
                </button>
              ) : (
                <kbd>/</kbd>
              )}
            </div>
            <div className="quick-filters">
              {filters.slice(0, 4).map((f) => (
                <button
                  key={f}
                  aria-pressed={filter === f}
                  className={filter === f ? "active" : ""}
                  onClick={() => {
                    setFilter(f);
                    setIntroHidden(true);
                  }}
                >
                  {f !== "All buildings" && (
                    <i className={`status-dot ${f.toLowerCase()}`} />
                  )}{" "}
                  {f === "All buildings" ? "All spots" : f}
                </button>
              ))}
            </div>
            <label className="filter-select" title="More filters">
              <SlidersHorizontal size={17} />
              <select
                aria-label="Filter properties"
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
              aria-label="Districts"
              aria-expanded={sidebar}
              onClick={() => setSidebar(!sidebar)}
            >
              <MapPin size={22} />
              <span>
                <strong>{focused?.name || "All of SkyCity"}</strong>
                <small>
                  {focused
                    ? data.properties.filter((p) => p.districtId === focused.id)
                        .length
                    : data.stats.total}{" "}
                  buildings
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
              aria-label="Building directory"
            >
              <div className="section-heading">
                <div>
                  <span className="eyebrow">FIND YOUR CORNER</span>
                  <h2>
                    {matching.length}{" "}
                    {filter === "Featured"
                      ? "featured locations"
                      : "matching buildings"}
                  </h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Close directory"
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
                        {p.districtId.replaceAll("-", " ")} · #{p.number}
                      </small>
                    </span>
                    <b>
                      {p.status === "auction" ? "Auction" : euro(offerPrice(p))}
                    </b>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
              {!matching.length && (
                <p>No buildings match. Try another neighborhood or filter.</p>
              )}
              {matching.length > 60 && (
                <p className="microcopy">
                  Showing 60 locations. Search to narrow it down.
                </p>
              )}
            </section>
          )}
          {p && (
            <PropertyPanel
              property={p}
              district={data.districts.find((d) => d.id === p.districtId)}
              onClose={() => setSelected(null)}
              onClaim={() => {
                track("claim_clicked", p.id);
                setClaim(true);
              }}
              onShare={() => setShare(true)}
            />
          )}
          {error && (
            <p className="error world-error" role="status">
              City updates paused. {error}
            </p>
          )}
          <div className="world-status">
            <div className="world-counters">
              <span>
                <i className="status-dot available" />
                <strong>{data.stats.available}</strong> available
              </span>
              <span>
                <i className="status-dot claimed" />
                <strong>{data.stats.claimed}</strong> claimed
              </span>
              <button
                onClick={() => {
                  setFilter("Auction");
                  setList(true);
                  setIntroHidden(true);
                }}
              >
                <i className="status-dot auction" />
                {data.stats.auctions} auctions
              </button>
            </div>
            <button
              className="world-activity-trigger"
              onClick={() => setActivityOpen(!activityOpen)}
              aria-expanded={activityOpen}
            >
              <Radio size={13} />
              {data.demo ? "Demo city activity" : "Around the city"}
              <ChevronDown size={12} />
            </button>
            {activityOpen && (
              <div className="world-activity">
                <span className="eyebrow">
                  {data.demo ? "DEMO ACTIVITY" : "AROUND THE CITY"}
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
                        {a.action}{" "}
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
                  <p>The city is waiting for its first neighbor.</p>
                )}
                <div className="world-links">
                  <Link href="/about">About SkyCity</Link>
                  <Link href="/admin">City Hall ↗</Link>
                </div>
              </div>
            )}
          </div>
          <div className="world-instructions">
            <Move size={16} />
            <span>Drag to explore</span>
            <i />
            <span>Scroll to zoom</span>
            <i />
            <MousePointer2 size={14} />
            <span>Click to discover</span>
          </div>
          <div className="world-map-controls">
            <div className="map-compass">
              <Compass size={33} strokeWidth={1.3} />
              <span>N</span>
            </div>
            <div className="map-controls">
              <button
                aria-label="Zoom in"
                onClick={() => setZoom((z) => z + 1)}
              >
                <Plus size={19} />
              </button>
              <button
                aria-label="Zoom out"
                onClick={() => setZoom((z) => z - 1)}
              >
                <Minus size={19} />
              </button>
              <span />
              <button
                aria-label="Reset camera"
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
              aria-label={list ? "Hide directory" : "Building directory"}
            >
              <Layers3 size={18} />
            </button>
          </div>
        </section>
      </main>
      {claim && p && (
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
