"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, ArrowUpRight, Gavel, Loader2 } from "lucide-react";
import type { CityData, PublicProperty } from "@/types";
import { Header } from "./header";
import { PropertyArt } from "./property/building-art";
import { Modal } from "./modal";
import { Login } from "./dashboard/login";
import { useCity } from "@/hooks/use-city";
import { api, euro } from "@/lib/client";
function Countdown({ ends }: { ends: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now)
    return <span>Cierra el {new Date(ends).toISOString().slice(0, 10)}</span>;
  const s = Math.max(0, Math.floor((Date.parse(ends) - now) / 1000));
  return (
    <span>
      {s
        ? `Quedan ${Math.floor(s / 86400)} d ${Math.floor((s % 86400) / 3600)} h ${Math.floor((s % 3600) / 60)} min ${s % 60} s`
        : "Subasta terminada"}
    </span>
  );
}
export function Auctions({ initial }: { initial: CityData }) {
  const { data, refresh } = useCity(initial);
  const [selected, setSelected] = useState<PublicProperty | null>(null);
  const [amount, setAmount] = useState(0);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  useEffect(() => {
    api<{ user: { email: string } | null }>("/api/me")
      .then((r) => setUser(r.user))
      .catch(() => {});
  }, []);
  return (
    <>
      <Header demo={data.demo} />
      <main className="page-shell">
        <div className="page-heading">
          <div>
            <span className="eyebrow">ALGUNAS DIRECCIONES SON ÚNICAS</span>
            <h1>Parcelas para rascacielos.</h1>
            <p>Inventario premium. Una marca ganadora levanta su torre.</p>
          </div>
          <Link href="/" className="button outline">
            Volver a la ciudad <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="inline-notice">
          {data.demo
            ? "Subastas de demostración · no se cobra dinero real."
            : "La puja ganadora construye un rascacielos en la parcela, con pago único."}{" "}
          Las pujas son vinculantes en modo real. El ganador tiene 24 horas para
          completar el pago.
        </div>
        {success && (
          <div className="notice" role="status">
            {success}
          </div>
        )}
        <div className="auction-grid">
          {data.properties
            .filter((p) => p.auction)
            .map((p) => (
              <article className="auction-card" key={p.id}>
                <PropertyArt property={p} />
                <div className="auction-details">
                  <span className="eyebrow">
                    {data.districts.find((d) => d.id === p.districtId)?.name} /
                    RASCACIELOS
                  </span>
                  <h2>
                    <Link href={`/auctions/${p.id}`}>{p.name}</Link>
                  </h2>
                  <div className="auction-time">
                    <Clock size={13} />
                    <Countdown ends={p.auction!.endsAt} />
                  </div>
                  <div className="auction-numbers">
                    <div>
                      <small>
                        {p.auction!.currentBid ? "Puja actual" : "Puja inicial"}
                      </small>
                      <strong>
                        {euro(p.auction!.currentBid || p.auction!.nextBid)}
                      </strong>
                    </div>
                    <div>
                      <small>Postores</small>
                      <strong>{p.auction!.bidders}</strong>
                    </div>
                    <div>
                      <small>Edificio</small>
                      <strong>Rascacielos</strong>
                    </div>
                  </div>
                  <button
                    className="button coral wide"
                    onClick={() => {
                      setSelected(p);
                      setAmount(p.auction!.nextBid);
                      setError("");
                    }}
                  >
                    <Gavel size={15} />
                    Pujar <ArrowUpRight size={16} />
                  </button>
                  <details className="bid-history">
                    <summary>
                      Historial · {p.auction!.history.length} pujas recientes
                    </summary>
                    {p.auction!.history.map((b, i) => (
                      <div key={i}>
                        <span>{b.bidder}</span>
                        <strong>{euro(b.amount)}</strong>
                      </div>
                    ))}
                    {!p.auction!.history.length && (
                      <p>Sé el primero en dejar tu huella.</p>
                    )}
                  </details>
                </div>
              </article>
            ))}
        </div>
        {!data.stats.auctions && (
          <div className="empty-state">
            <Gavel size={35} />
            <h2>No hay subastas abiertas.</h2>
            <p>Las nuevas parcelas premium aparecerán aquí.</p>
          </div>
        )}
      </main>
      {selected && (
        <Modal
          title="UNA DIRECCIÓN DE LA QUE SE HABLA"
          onClose={() => setSelected(null)}
        >
          {!user ? (
            <Login demo={data.demo} />
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  await api("/api/bids", {
                    auctionId: selected.auction!.id,
                    amount,
                  });
                  await refresh();
                  setSuccess(
                    `Tu puja de ${euro(amount)} por ${selected.name} está registrada.`,
                  );
                  setSelected(null);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>{selected.name}</h2>
              <p className="muted">
                La siguiente puja es de {euro(selected.auction!.nextBid)} o más.
                La marca ganadora construye aquí su rascacielos.
              </p>
              <label>
                Tu puja (€)
                <input
                  type="number"
                  required
                  min={selected.auction!.nextBid}
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </label>
              <p className="microcopy">Pujas como {user.email}</p>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="button coral wide" disabled={busy}>
                {busy ? (
                  <Loader2 className="spin" size={17} />
                ) : (
                  <>
                    Pujar · {euro(amount)}
                    <Gavel size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
