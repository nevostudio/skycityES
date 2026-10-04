"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Building2 } from "lucide-react";
import { Brand } from "./brand";
export function Header({
  demo = true,
  onClaim,
}: {
  demo?: boolean;
  onClaim?: () => void;
}) {
  const pathname = usePathname();
  return (
    <header className="header">
      <Brand />
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
      <div className="header-right">
        {demo && <span className="demo-label">CIUDAD DEMO</span>}
        {onClaim ? (
          <button className="button dark small" onClick={onClaim}>
            Construir <ArrowUpRight size={16} />
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
