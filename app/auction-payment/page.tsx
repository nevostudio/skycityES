"use client";
import { useState } from "react";
import { api } from "@/lib/client";
export default function Page() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="auth-card">
      <span className="eyebrow">TU PARCELA GANADORA</span>
      <h1>Hazlo oficial.</h1>
      <p>
        Completa el pago de tu subasta para construir tu rascacielos. Podrás
        personalizar tu marca en Mis edificios después del pago.
      </p>
      {error && <p className="error">{error}</p>}
      <button
        className="button coral wide"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const q = new URLSearchParams(location.search);
            const r = await api<{ url: string }>("/api/auction-payment", {
              reservation: q.get("reservation"),
              access: q.get("access"),
            });
            location.assign(r.url);
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        Continuar al pago seguro →
      </button>
    </main>
  );
}
