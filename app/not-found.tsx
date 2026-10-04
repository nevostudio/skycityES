import Link from "next/link";
export default function NotFound() {
  return (
    <main className="auth-card">
      <span className="eyebrow">FUERA DEL MAPA</span>
      <h1>Esta dirección todavía es un sueño.</h1>
      <p className="muted">
        No encontramos este solar. Hay muchos más por explorar.
      </p>
      <Link href="/" className="button coral">
        Volver a SkyCity ↗
      </Link>
    </main>
  );
}
