"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ArrowUpRight,
  LogOut,
  Pencil,
  RefreshCw,
  Share2,
  Loader2,
} from "lucide-react";
import type { Ad, CityData, Lease, Property, PublicProperty } from "@/types";
import { Header } from "../header";
import { Login } from "./login";
import { api, euro } from "@/lib/client";
import { visualProperty } from "@/lib/presence";
import { BuildingArt } from "../property/building-art";
import { ShareModal } from "../property/share-modal";
import { ClaimModal } from "../checkout/claim-modal";
import { Modal } from "../modal";
import { AdFields } from "../checkout/ad-fields";
import { useCity } from "@/hooks/use-city";
type MyLease = Lease & {
  property: Property;
  analytics: Record<string, number>;
};
type Me = {
  user: { email: string; admin: boolean } | null;
  leases?: MyLease[];
};
export function Dashboard({ initial }: { initial: CityData }) {
  const { data, refresh } = useCity(initial);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState<MyLease | null>(null);
  const [ad, setAd] = useState<Ad | null>(null);
  const [renew, setRenew] = useState<MyLease | null>(null);
  const [upgrade, setUpgrade] = useState<MyLease | null>(null);
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
  return (
    <>
      <Header demo={data.demo} />
      <main className="page-shell">
        <div className="page-heading">
          <div>
            <span className="eyebrow">YOUR CORNER OF THE CITY</span>
            <h1>
              My buildings<span>.</span>
            </h1>
            <p>
              {me?.user
                ? `Good to see you, ${me.user.email}.`
                : "Make yourself at home."}
            </p>
          </div>
          {me?.user && (
            <div className="card-actions">
              {me.user.admin && (
                <Link className="button outline" href="/admin">
                  City Hall
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
                Sign out
              </button>
            </div>
          )}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!me ? (
          <p className="muted">Opening your buildings…</p>
        ) : !me.user ? (
          <Login demo={data.demo} />
        ) : me.leases?.length ? (
          <div className="dashboard-grid">
            {me.leases.map((l) => {
              const p = data.properties.find((p) => p.id === l.propertyId);
              const days = Math.max(
                0,
                Math.ceil((Date.parse(l.expiresAt) - Date.now()) / 86400000),
              );
              const opens = l.analytics.property_open || 0;
              const clicks = l.analytics.external_link_click || 0;
              return (
                <article className="lease-card" key={l.id}>
                  <BuildingArt
                    property={visualProperty(l.property, l.presenceTier)}
                    brand={l.ad.brand}
                  />
                  <div className="lease-details">
                    <span className="eyebrow">
                      {l.property.districtId.replaceAll("-", " ")} ·{" "}
                      {l.property.name}
                    </span>
                    <h2>{l.ad.brand}</h2>
                    <span className="tag">
                      {l.property.inventory === "skyscraper"
                        ? "EXCLUSIVE SKYSCRAPER"
                        : `${l.presenceTier || "STARTER"} PRESENCE`}
                    </span>
                    <p>
                      {days ? `${days} days remaining` : "Lease expired"} · Ad{" "}
                      {l.ad.status}
                    </p>
                    <div className="stats-row">
                      <div>
                        <strong>{l.analytics.property_impression || 0}</strong>
                        <small>Impressions</small>
                      </div>
                      <div>
                        <strong>{opens}</strong>
                        <small>Profile views</small>
                      </div>
                      <div>
                        <strong>{clicks}</strong>
                        <small>Website clicks</small>
                      </div>
                    </div>
                    <p>
                      {opens ? ((clicks / opens) * 100).toFixed(1) : "0"}% CTR ·
                      Expires{" "}
                      {new Date(l.expiresAt).toLocaleDateString("en-GB")}
                    </p>
                    <div className="card-actions">
                      {!!days &&
                        p &&
                        p.inventory !== "skyscraper" &&
                        l.presenceTier !== "LANDMARK" && (
                          <button
                            className="button coral"
                            onClick={() => setUpgrade(l)}
                          >
                            <ArrowUpRight size={14} />
                            Upgrade presence
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
                        Edit ad
                      </button>
                      <button
                        className="button outline"
                        disabled={!p}
                        onClick={() => {
                          if (days) setRenew(l);
                          else location.assign(`/?building=${l.propertyId}`);
                        }}
                      >
                        <RefreshCw size={12} />
                        {days ? "Renew" : "Reclaim"}
                      </button>
                      <button
                        className="button dark"
                        disabled={!p}
                        onClick={() => p && setShare(p)}
                      >
                        <Share2 size={12} />
                        Share
                      </button>
                    </div>
                    {!!l.upgradeHistory?.length && (
                      <details className="upgrade-history">
                        <summary>
                          Upgrade history ({l.upgradeHistory.length})
                        </summary>
                        {l.upgradeHistory.map((h) => (
                          <p key={h.reservationId}>
                            {h.from} → {h.to} · {euro(h.amount)}
                            <small>
                              {new Date(h.createdAt).toLocaleString("en-GB")}
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
            <h2>Your first address is waiting.</h2>
            <p>Find a building, add your brand, and move right in.</p>
            <Link href="/?available=1" className="button coral">
              Find my spot <ArrowUpRight size={16} />
            </Link>
          </div>
        )}
      </main>
      {edit && ad && (
        <Modal title="FRESHEN UP YOUR SPACE" onClose={() => setEdit(null)}>
          <h2>Edit your advertisement.</h2>
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
            <AdFields ad={ad} onChange={setAd} />
            {error && <p className="error">{error}</p>}
            <button disabled={busy} className="button coral wide">
              {busy ? (
                <Loader2 className="spin" size={16} />
              ) : (
                <>
                  Save advertisement
                  <Pencil size={14} />
                </>
              )}
            </button>
          </form>
        </Modal>
      )}
      {renew && data.properties.find((p) => p.id === renew.propertyId) && (
        <ClaimModal
          property={data.properties.find((p) => p.id === renew.propertyId)!}
          durations={data.durations}
          demo={data.demo}
          renewalLeaseId={renew.id}
          initialAd={renew.ad}
          email={renew.email}
          onClose={() => setRenew(null)}
          onComplete={async () => {
            setRenew(null);
            await load();
            await refresh();
          }}
        />
      )}
      {share && <ShareModal property={share} onClose={() => setShare(null)} />}
      {upgrade && data.properties.find((p) => p.id === upgrade.propertyId) && (
        <ClaimModal
          property={data.properties.find((p) => p.id === upgrade.propertyId)!}
          durations={data.durations}
          demo={data.demo}
          upgradeLeaseId={upgrade.id}
          initialAd={upgrade.ad}
          email={upgrade.email}
          onClose={() => setUpgrade(null)}
          onComplete={async () => {
            setUpgrade(null);
            await load();
            await refresh();
          }}
        />
      )}
    </>
  );
}
