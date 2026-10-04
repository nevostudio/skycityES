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
      <nav aria-label="Main navigation">
        <Link className={pathname === "/" ? "active" : ""} href="/">
          Explore
        </Link>
        <Link
          className={pathname === "/auctions" ? "active" : ""}
          href="/auctions"
        >
          Auctions
          <span className="nav-dot" />
        </Link>
        <Link
          className={pathname === "/my-buildings" ? "active" : ""}
          href="/my-buildings"
        >
          <Building2 size={15} />
          My buildings
        </Link>
      </nav>
      <div className="header-right">
        {demo && <span className="demo-label">DEMO CITY</span>}
        {onClaim ? (
          <button className="button dark small" onClick={onClaim}>
            Claim a spot <ArrowUpRight size={16} />
          </button>
        ) : (
          <Link href="/?available=1" className="button dark small">
            Claim a spot <ArrowUpRight size={16} />
          </Link>
        )}
      </div>
    </header>
  );
}
