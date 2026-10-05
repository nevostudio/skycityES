import Link from "next/link";
import { LEGAL_PAGES } from "@/lib/legal";

/** Links between the legal pages (also shown, discreetly, on the city home). */
export function LegalLinks({ className = "legal-links" }) {
  return (
    <nav className={className} aria-label="Información legal">
      {LEGAL_PAGES.map((p) => (
        <Link key={p.href} href={p.href}>
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
