"use client";
import { Globe2, Check, ArrowUpRight } from "lucide-react";
import type { CityData } from "@/types";
export function DistrictSidebar({
  data,
  district,
  setDistrict,
  sidebar,
  setSidebar,
}: {
  data: CityData;
  district: string;
  setDistrict: (value: string) => void;
  sidebar: boolean;
  setSidebar: (value: boolean) => void;
}) {
  if (!sidebar) return null;
  const select = (id: string) => {
    setDistrict(id);
    setSidebar(false);
  };
  return (
    <div className="district-menu" aria-label="Choose a neighborhood">
      <span className="eyebrow">SEVEN NEIGHBORHOODS. ONE CITY.</span>
      <button
        className={district === "all" ? "selected" : ""}
        onClick={() => select("all")}
      >
        <span className="district-menu-icon">
          <Globe2 size={18} />
        </span>
        <span>
          <strong>All of SkyCity</strong>
          <small>{data.stats.available} spots waiting for an idea</small>
        </span>
        {district === "all" && <Check size={15} />}
      </button>
      {data.districts.map((d) => (
        <button
          className={district === d.id ? "selected" : ""}
          key={d.id}
          onClick={() => select(d.id)}
        >
          <span
            className="district-menu-icon"
            style={{ background: d.color + "25", color: d.color }}
          >
            <span style={{ background: d.color }} />
          </span>
          <span>
            <strong>{d.name}</strong>
            <small>
              {
                data.properties.filter(
                  (p) => p.districtId === d.id && p.status === "available",
                ).length
              }{" "}
              available · {d.subtitle}
            </small>
          </span>
          {district === d.id ? <Check size={15} /> : <ArrowUpRight size={14} />}
        </button>
      ))}
    </div>
  );
}
