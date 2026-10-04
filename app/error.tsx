"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="auth-card">
      <span className="eyebrow">UN PEQUEÑO DESVÍO</span>
      <h1>La ciudad necesita un momento.</h1>
      <p className="muted">
        No hemos podido cargar esta parte de SkyCity. Inténtalo de nuevo.
      </p>
      <button className="button coral" onClick={reset}>
        Reintentar
      </button>
    </main>
  );
}
