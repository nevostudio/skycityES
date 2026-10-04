"use client";
import { useState } from "react";
import { api } from "@/lib/client";
export default function Page() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="auth-card">
      <span className="eyebrow">YOUR WINNING ADDRESS</span>
      <h1>Make it official.</h1>
      <p>
        Complete your winning auction payment to activate your building. You can
        customize your brand in My Buildings after payment.
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
        Continue to secure payment →
      </button>
    </main>
  );
}
