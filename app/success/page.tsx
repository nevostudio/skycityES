"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { PropertyArt } from "@/components/property/building-art";
import { ShareModal } from "@/components/property/share-modal";
import { api, propertyUrl } from "@/lib/client";
import type { CityData, PublicProperty } from "@/types";
export default function Page() {
  const [p, setP] = useState<PublicProperty | null>(null);
  const [demo, setDemo] = useState(false);
  const [share, setShare] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    let done = false;
    async function poll() {
      try {
        const status = await api<{
          status: string;
          lease?: { propertyId: string };
        }>(`/api/checkout/status?${q}`);
        if (status.status === "paid" && status.lease) {
          const data = await api<CityData>("/api/city");
          setDemo(data.demo);
          setP(
            data.properties.find((p) => p.id === status.lease!.propertyId) ||
              null,
          );
          done = true;
        } else if (status.status === "expired") {
          setError(
            "Esta reserva ha caducado. Si se ha realizado el cobro, contacta con la administración de la ciudad.",
          );
          done = true;
        }
      } catch (e) {
        setError((e as Error).message);
        done = true;
      }
    }
    void poll();
    const t = setInterval(() => {
      if (!done) void poll();
    }, 2500);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <Header demo={demo} />
      <main className="page-shell">
        <div
          className="auth-card"
          style={{ maxWidth: 570, textAlign: "center" }}
        >
          {p ? (
            <>
              <span className="eyebrow">EDIFICIO CONSTRUIDO</span>
              <h1>Ya estás en SkyCity.</h1>
              <PropertyArt property={p} brand={p.ad?.brand} />
              <h2>{p.name}</h2>
              <p>
                {p.ad?.brand} · Edificio {p.building?.tier} · Pago único
              </p>
              <Link
                className="button coral wide"
                href={`/?building=${p.id}&obra=1`}
              >
                Verlo construirse en la ciudad ↗
              </Link>
              <Link className="button outline wide" href={propertyUrl(p)}>
                Página de mi edificio
              </Link>
              <div className="card-actions" style={{ marginTop: 10 }}>
                <button
                  className="button outline"
                  onClick={() => setShare(true)}
                >
                  Compartir
                </button>
                <Link href="/my-buildings" className="button outline">
                  Editar anuncio
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2>
                {error ? "Revisemos tu compra." : "Tu edificio está en camino."}
              </h2>
              <p>
                {error ||
                  "Esperando la confirmación verificada del pago. Esta página se actualizará sola."}
              </p>
              <Link className="button outline" href="/my-buildings">
                Mis edificios
              </Link>
            </>
          )}
        </div>
      </main>
      {share && p && (
        <ShareModal property={p} celebrate onClose={() => setShare(false)} />
      )}
    </>
  );
}
