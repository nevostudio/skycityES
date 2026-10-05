import { Header } from "../header";
import { isDemo } from "@/lib/config";
import { LEGAL } from "@/lib/legal";
import { LegalLinks } from "./legal-links";

/** Shared shell of the legal pages: header, readable column and links between them. */
export function LegalPage({
  title,
  eyebrow = "INFORMACIÓN LEGAL",
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header demo={isDemo()} />
      <main className="page-shell legal-page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h1>
              {title}
              <span>.</span>
            </h1>
            <p>Versión del {formatVersion(LEGAL.version)}</p>
          </div>
        </div>
        <article className="legal-body">{children}</article>
        <LegalLinks />
      </main>
    </>
  );
}

const formatVersion = (v: string) =>
  new Date(`${v}T12:00:00Z`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
