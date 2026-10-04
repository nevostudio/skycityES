"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, ArrowUpRight, Gavel, Loader2 } from "lucide-react";
import type { CityData, PublicProperty } from "@/types";
import { Header } from "./header";
import { BuildingArt } from "./property/building-art";
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
    return <span>Closes {new Date(ends).toISOString().slice(0, 10)}</span>;
  const s = Math.max(0, Math.floor((Date.parse(ends) - now) / 1000));
  return (
    <span>
      {s
        ? `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s remaining`
        : "Auction ended"}
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
            <span className="eyebrow">SOME ADDRESSES ARE ONE OF A KIND</span>
            <h1>A little more iconic.</h1>
            <p>Landmark buildings. Unmissable placements. One winning brand.</p>
          </div>
          <Link href="/" className="button outline">
            Back to the city <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="inline-notice">
          {data.demo
            ? "Demo auctions · no real money is collected."
            : "Winning bids secure the right to a temporary advertising placement."}{" "}
          Bids are binding in live mode. The winner has 24 hours to complete
          payment.
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
                <BuildingArt property={p} />
                <div className="auction-details">
                  <span className="eyebrow">
                    {p.districtId.replaceAll("-", " ")} / ICONIC
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
                        {p.auction!.currentBid ? "Current bid" : "Opening bid"}
                      </small>
                      <strong>
                        {euro(p.auction!.currentBid || p.auction!.nextBid)}
                      </strong>
                    </div>
                    <div>
                      <small>Unique bidders</small>
                      <strong>{p.auction!.bidders}</strong>
                    </div>
                    <div>
                      <small>Lease duration</small>
                      <strong>
                        {p.auction!.days}
                        <small>days</small>
                      </strong>
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
                    Place a bid <ArrowUpRight size={16} />
                  </button>
                  <details className="bid-history">
                    <summary>
                      Bid history · {p.auction!.history.length} recent bids
                    </summary>
                    {p.auction!.history.map((b, i) => (
                      <div key={i}>
                        <span>{b.bidder}</span>
                        <strong>{euro(b.amount)}</strong>
                      </div>
                    ))}
                    {!p.auction!.history.length && (
                      <p>Be the first to make your mark.</p>
                    )}
                  </details>
                </div>
              </article>
            ))}
        </div>
        {!data.stats.auctions && (
          <div className="empty-state">
            <Gavel size={35} />
            <h2>All quiet on the auction block.</h2>
            <p>New landmark placements will appear here.</p>
          </div>
        )}
      </main>
      {selected && (
        <Modal
          title="AN ADDRESS WORTH TALKING ABOUT"
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
                    `Your bid of ${euro(amount)} on ${selected.name} is in.`,
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
                The next bid is {euro(selected.auction!.nextBid)} or more. The
                winning placement lasts {selected.auction!.days} days.
              </p>
              <label>
                Your bid (€)
                <input
                  type="number"
                  required
                  min={selected.auction!.nextBid}
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </label>
              <p className="microcopy">Bidding as {user.email}</p>
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
                    Place bid · {euro(amount)}
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
