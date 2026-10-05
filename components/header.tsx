"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Building2, Plus } from "lucide-react";
import { Brand } from "./brand";
import type { CityMetrics as Metrics } from "@/types";
import { CityMetrics } from "./city/city-metrics";
export function Header({
  demo = true,
  onClaim,
  metrics,
  nav = true,
}: {
  demo?: boolean;
  onClaim?: () => void;
  metrics?: Metrics;
  /** The city home leaves the whole top to the map: no section links. */
  nav?: boolean;
}) {
  const pathname = usePathname();
  return (
    <header className="header">
      <Brand />
      {nav && (
        <nav aria-label="Navegación principal">
          <Link className={pathname === "/" ? "active" : ""} href="/">
            Explorar
          </Link>
          <Link
            className={pathname === "/auctions" ? "active" : ""}
            href="/auctions"
          >
            Subastas
            <span className="nav-dot" />
          </Link>
          <Link
            className={pathname === "/my-buildings" ? "active" : ""}
            href="/my-buildings"
          >
            <Building2 size={15} />
            Mis edificios
          </Link>
        </nav>
      )}
      <div className="header-right">
        {metrics && <CityMetrics metrics={metrics} />}
        {demo && !metrics && <span className="demo-label">CIUDAD DEMO</span>}
        {onClaim ? (
          <button className="button dark small" onClick={onClaim}>
            <Plus size={16} /> Construir desde 3 €
          </button>
        ) : (
          <Link href="/?available=1" className="button dark small">
            Construir <ArrowUpRight size={16} />
          </Link>
        )}
      </div>
    </header>
  );
}
