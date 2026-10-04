"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ArrowUpRight,
  LogOut,
  Pencil,
  Share2,
  Loader2,
  TrendingUp,
} from "lucide-react";
import type {
  Ad,
  Building,
  CityData,
  Lease,
  Property,
  PublicProperty,
} from "@/types";
import { Header } from "../header";
import { Login } from "./login";
import { api, euro, shortDate } from "@/lib/client";
import { withBuilding } from "@/lib/presence";
import { BuildingArt } from "../property/building-art";
import { ShareModal } from "../property/share-modal";
import { ClaimModal } from "../checkout/claim-modal";
import { Modal } from "../modal";
import { AdFields } from "../checkout/ad-fields";
import { useCity } from "@/hooks/use-city";
import { TakeoverCard } from "../property/takeover-card";
type MyLease = Lease & {
  property: Property;
  building: Building | null;
  analytics: Record<string, number>;
};
type Me = {
  user: { email: string; admin: boolean } | null;
  leases?: MyLease[];
};
const adStatus: Record<string, string> = {
  active: "activo",
  pending: "en revisión",
  draft: "borrador",
  rejected: "rechazado",
  suspended: "suspendido",
};
export function Dashboard({ initial }: { initial: CityData }) {
  const { data, refresh } = useCity(initial);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState<MyLease | null>(null);
  const [ad, setAd] = useState<Ad | null>(null);
  const [upgrade, setUpgrade] = useState<MyLease | null>(null);
  const [grown, setGrown] = useState<string | null>(null);
  const [share, setShare] = useState<PublicProperty | null>(null);
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      setMe(await api<Me>("/api/me"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const standing = me?.leases?.filter((l) => l.status === "active") || [];
  return (
    <>
      <Header demo={data.demo} />
      <main className="page-shell">
        <div className="page-heading">
          <div>
            <span className="eyebrow">TU RINCÓN DE LA CIUDAD</span>
            <h1>
              Mis edificios<span>.</span>
            </h1>
            <p>
              {me?.user
                ? `Qué alegría verte, ${me.user.email}.`
                : "Estás en tu casa."}
            </p>
          </div>
          {me?.user && (
            <div className="card-actions">
              {me.user.admin && (
                <Link className="button outline" href="/admin">
                  Ayuntamiento
                </Link>
              )}
              <button
                className="button outline"
                onClick={async () => {
                  await api("/api/me", undefined, "DELETE");
                  setMe({ user: null });
                }}
              >
                <LogOut size={14} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {grown && (
          <div className="notice" role="status">
            Tu edificio ha crecido.{" "}
            <Link href={`/?building=${grown}&obra=1`}>
              Verlo crecer en la ciudad ↗
            </Link>
          </div>
        )}
        {!me ? (
          <p className="muted">Abriendo tus edificios…</p>
        ) : !me.user ? (
          <Login demo={data.demo} />
        ) : standing.length ? (
          <div className="dashboard-grid">
            {standing.map((l) => {
              const p = data.properties.find((p) => p.id === l.propertyId);
              const tier = l.building?.tier || l.presenceTier || "STARTER";
              const opens = l.analytics.property_open || 0;
              const clicks = l.analytics.external_link_click || 0;
              return (
                <article className="lease-card" key={l.id}>
                  <BuildingArt
                    property={withBuilding(l.property, tier)}
                    brand={l.ad.brand}
                  />
                  <div className="lease-details">
                    <span className="eyebrow">
                      {
                        data.districts.find(
                          (d) => d.id === l.property.districtId,
                        )?.name
                      }{" "}
                      · {l.property.name}
                    </span>
                    <h2>{l.ad.brand}</h2>
                    {p && <TakeoverCard property={p} owned />}
                    <span className="tag">
                      {tier === "SKYSCRAPER"
                        ? "RASCACIELOS"
                        : `EDIFICIO ${tier}`}
                    </span>
                    <p>
                      Construido el{" "}
                      {shortDate(l.building?.builtAt || l.startsAt)} · Pago
                      único · Anuncio {adStatus[l.ad.status] || l.ad.status}
                    </p>
                    <div className="stats-row">
                      <div>
                        <strong>{l.analytics.property_impression || 0}</strong>
                        <small>Impresiones</small>
                      </div>
                      <div>
                        <strong>{opens}</strong>
                        <small>Visitas a la ficha</small>
                      </div>
                      <div>
                        <strong>{clicks}</strong>
                        <small>Clics a la web</small>
                      </div>
                    </div>
                    <p>
                      {opens ? ((clicks / opens) * 100).toFixed(1) : "0"}% CTR
                    </p>
                    <div className="card-actions">
                      {p && tier !== "SKYSCRAPER" && tier !== "LANDMARK" && (
                        <button
                          className="button coral"
                          onClick={() => setUpgrade(l)}
                        >
                          <TrendingUp size={14} />
                          Mejorar edificio
                        </button>
                      )}
                      <button
                        className="button outline"
                        onClick={() => {
                          setEdit(l);
                          setAd(l.ad);
                        }}
                      >
                        <Pencil size={12} />
                        Editar marca
                      </button>
                      <Link
                        className="button outline"
                        href={`/?building=${l.propertyId}`}
                      >
                        <ArrowUpRight size={12} />
                        Ver en la ciudad
                      </Link>
                      <button
                        className="button dark"
                        disabled={!p}
                        onClick={() => p && setShare(p)}
                      >
                        <Share2 size={12} />
                        Compartir
                      </button>
                    </div>
                    {!!l.upgradeHistory?.length && (
                      <details className="upgrade-history">
                        <summary>
                          Historial de mejoras ({l.upgradeHistory.length})
                        </summary>
                        {l.upgradeHistory.map((h) => (
                          <p key={h.reservationId}>
                            {h.from} → {h.to} · {euro(h.amount)}
                            <small>
                              {new Date(h.createdAt).toLocaleString("es-ES")}
                            </small>
                          </p>
                        ))}
                      </details>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Building2 size={35} />
            <h2>Tu primer solar te está esperando.</h2>
            <p>Elige un solar, añade tu marca y construye tu edificio.</p>
            <Link href="/?available=1" className="button coral">
              Elegir mi solar <ArrowUpRight size={16} />
            </Link>
          </div>
        )}
      </main>
      {edit && ad && (
        <Modal
          title="EDITAR MARCA"
          onClose={() => setEdit(null)}
          className="claim-modal"
        >
          <h2>Tu marca, en tu edificio.</h2>
          <p className="muted">
            Nombre, logo, colores y frase se muestran en el cartel de la azotea.
            Los cambios se ven en la ciudad al guardar.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api("/api/me", { leaseId: edit.id, ad }, "PATCH");
                await load();
                await refresh();
                setEdit(null);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <AdFields
              ad={ad}
              onChange={setAd}
              tier={edit.building?.tier || edit.presenceTier || "STARTER"}
            />
            {error && <p className="error">{error}</p>}
            <button disabled={busy} className="button coral wide">
              {busy ? (
                <Loader2 className="spin" size={16} />
              ) : (
                <>
                  Guardar marca
                  <Pencil size={14} />
                </>
              )}
            </button>
          </form>
        </Modal>
      )}
      {share && <ShareModal property={share} onClose={() => setShare(null)} />}
      {upgrade && data.properties.find((p) => p.id === upgrade.propertyId) && (
        <ClaimModal
          property={data.properties.find((p) => p.id === upgrade.propertyId)!}
          demo={data.demo}
          upgradeLeaseId={upgrade.id}
          initialAd={upgrade.ad}
          email={upgrade.email}
          onClose={() => setUpgrade(null)}
          onComplete={async () => {
            setGrown(upgrade.propertyId);
            setUpgrade(null);
            await load();
            await refresh();
          }}
        />
      )}
    </>
  );
}
