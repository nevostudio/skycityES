"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { BuildingArt } from "@/components/property/building-art";
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
            "This reservation has expired. If you were charged, please contact the city administrator.",
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
              <span className="eyebrow">BUILDING CLAIMED</span>
              <h1>You’re in SkyCity.</h1>
              <BuildingArt property={p} brand={p.ad?.brand} />
              <h2>{p.name}</h2>
              <p>
                {p.ad?.brand} · Active until{" "}
                {new Date(p.expiresAt!).toLocaleDateString("en-GB")}
              </p>
              <Link className="button coral wide" href={propertyUrl(p)}>
                View my building ↗
              </Link>
              <div className="card-actions" style={{ marginTop: 10 }}>
                <button
                  className="button outline"
                  onClick={() => setShare(true)}
                >
                  Share my spot
                </button>
                <Link href="/my-buildings" className="button outline">
                  Edit advertisement
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2>
                {error
                  ? "Let’s check your claim."
                  : "Your new address is on its way."}
              </h2>
              <p>
                {error ||
                  "Waiting for verified payment confirmation. This page will update automatically."}
              </p>
              <Link className="button outline" href="/my-buildings">
                My buildings
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
