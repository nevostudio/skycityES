"use client";
import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import type {
  Property,
  District,
  Lease,
  Auction,
  Bid,
  Transaction,
  Settings,
  Mail,
  CityData,
} from "@/types";
import { Header } from "../header";
import { Login } from "../dashboard/login";
import { PropertyEditor } from "./property-editor";
import { api, euro } from "@/lib/client";
type AdminData = {
  properties: Property[];
  districts: District[];
  leases: Lease[];
  auctions: Auction[];
  bids: Bid[];
  transactions: Transaction[];
  settings: Settings;
  mail: Mail[];
  stats: CityData["stats"];
  customers: string[];
  revenue: number;
  clicks: number;
};
export function Admin({ demo }: { demo: boolean }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [auth, setAuth] = useState("loading");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Properties");
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<Property | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function load() {
    try {
      const user = await api<{ user: { admin: boolean } | null }>("/api/me");
      if (!user.user?.admin) {
        setAuth(user.user ? "forbidden" : "login");
        return;
      }
      setData(await api<AdminData>("/api/admin"));
      setAuth("ready");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function action(body: unknown) {
    setBusy(true);
    setError("");
    try {
      await api("/api/admin", body);
      await load();
      setMessage("Changes saved.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const newProperty = () =>
    setEdit({
      id: "",
      number: 0,
      name: "New building",
      districtId: data!.districts[0].id,
      type: "shop",
      tier: "STANDARD",
      inventory: "normal",
      reservedForBrands: false,
      x: -36,
      z: 42,
      width: 3,
      depth: 3,
      height: 3,
      rotation: 0,
      model: 0,
      color: "#d5c3a7",
      prices: Object.fromEntries([30].map((d) => [String(d), 3])),
      sale: "rental",
      featured: false,
      enabled: true,
    });
  return (
    <>
      <Header demo={demo} />
      <main className="page-shell">
        <div className="page-heading">
          <div>
            <span className="eyebrow">BEHIND THE NEIGHBORHOOD</span>
            <h1>City Hall.</h1>
            <p>Shape the city. Make room for what comes next.</p>
          </div>
          <Link href="/" className="button outline">
            Explore SkyCity
            <ArrowUpRight size={15} />
          </Link>
        </div>
        {auth === "login" ? (
          <Login demo={demo} admin />
        ) : auth === "forbidden" ? (
          <div className="error">
            This email does not have administrator access.{" "}
            <Link href="/my-buildings">Switch account in My Buildings.</Link>
          </div>
        ) : !data ? (
          <p className="muted">Opening City Hall…</p>
        ) : (
          <>
            {demo && (
              <div className="inline-notice">
                DEMO ADMIN · Changes persist in this local city. No real
                payments or emails are sent.
              </div>
            )}
            <div className="admin-stats">
              {[
                ["Revenue", euro(data.revenue)],
                ["Active leases", data.stats.claimed],
                ["Occupancy", `${data.stats.occupancy}%`],
                ["Available spots", data.stats.available],
                ["Claims today", data.stats.claimsToday],
                ["Advertisers", data.stats.advertisers],
                ["Live auctions", data.stats.auctions],
                ["External clicks", data.clicks],
              ].map(([label, value]) => (
                <div key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="admin-tabs">
              {[
                "Properties",
                "Districts",
                "Leases & ads",
                "Auctions",
                "Bids",
                "Customers",
                "Transactions",
                "Email outbox",
                "Settings",
              ].map((t) => (
                <button
                  key={t}
                  className={t === tab ? "active" : ""}
                  onClick={() => {
                    setTab(t);
                    setMessage("");
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            {message && (
              <div className="inline-notice" role="status">
                {message}
              </div>
            )}
            {tab === "Properties" && (
              <>
                <div className="admin-toolbar">
                  <input
                    aria-label="Search properties"
                    placeholder="Find a building…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button className="button dark" onClick={newProperty}>
                    <Plus size={15} />
                    Add property
                  </button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>PROPERTY</th>
                        <th>DISTRICT</th>
                        <th>30 DAYS</th>
                        <th>TIER</th>
                        <th>STATUS</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {data.properties
                        .filter((p) =>
                          `${p.name} ${p.number}`
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                        )
                        .map((p) => (
                          <tr key={p.id}>
                            <td>
                              {p.name}
                              <small> #{p.number}</small>
                            </td>
                            <td>
                              {
                                data.districts.find(
                                  (d) => d.id === p.districtId,
                                )?.name
                              }
                            </td>
                            <td>
                              {euro(
                                p.prices["30"] || Object.values(p.prices)[0],
                              )}
                            </td>
                            <td>
                              {p.inventory === "skyscraper"
                                ? "SKYSCRAPER"
                                : "€3–€60"}
                            </td>
                            <td>
                              {p.enabled
                                ? p.reservedForBrands
                                  ? "Reserved for brands"
                                  : p.sale
                                : "Inactive"}
                            </td>
                            <td>
                              <button
                                className="text-button"
                                onClick={() => setEdit(p)}
                              >
                                <Pencil size={13} />
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {tab === "Districts" && (
              <div className="admin-records">
                {data.districts.map((d) => (
                  <form
                    className="admin-record"
                    key={d.id}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      await action({
                        action: "district",
                        id: d.id,
                        district: {
                          name: f.get("name"),
                          subtitle: f.get("subtitle"),
                          color: f.get("color"),
                        },
                      });
                    }}
                  >
                    <label>
                      Name
                      <input name="name" defaultValue={d.name} required />
                    </label>
                    <label>
                      Subtitle
                      <input name="subtitle" defaultValue={d.subtitle} />
                    </label>
                    <label>
                      Color
                      <input type="color" name="color" defaultValue={d.color} />
                    </label>
                    <button className="button outline" disabled={busy}>
                      Save district
                    </button>
                  </form>
                ))}
              </div>
            )}
            {tab === "Leases & ads" && (
              <div className="admin-records">
                {data.leases.map((l) => (
                  <div className="admin-record" key={l.id}>
                    <div>
                      <strong>{l.ad.brand}</strong> · {l.propertyId}
                      <small>
                        {l.email} · until{" "}
                        {new Date(l.expiresAt).toLocaleDateString("en-GB")} ·{" "}
                        {l.status}
                      </small>
                    </div>
                    <span className="tag">{l.ad.status}</span>
                    <button
                      className="button outline"
                      disabled={busy}
                      onClick={() =>
                        action({
                          action: "moderate",
                          leaseId: l.id,
                          status:
                            l.ad.status === "active" ? "suspended" : "active",
                        })
                      }
                    >
                      <ShieldCheck size={14} />
                      {l.ad.status === "active" ? "Suspend ad" : "Activate ad"}
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        action({
                          action: "moderate",
                          leaseId: l.id,
                          status: "rejected",
                        })
                      }
                    >
                      Reject
                    </button>
                  </div>
                ))}
              </div>
            )}
            {tab === "Auctions" && (
              <>
                <div className="admin-records">
                  {data.auctions.map((a) => (
                    <div key={a.id} className="admin-record">
                      <div>
                        <strong>
                          {
                            data.properties.find((p) => p.id === a.propertyId)
                              ?.name
                          }
                        </strong>
                        <small>
                          Ends {new Date(a.endsAt).toLocaleString("en-GB")} ·{" "}
                          {a.days} days · starting {euro(a.startingBid)}
                        </small>
                      </div>
                      <span className="tag">{a.status}</span>
                    </div>
                  ))}
                </div>
                <form
                  className="auth-card"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    await action({
                      action: "auction",
                      propertyId: f.get("propertyId"),
                      hours: Number(f.get("hours")),
                      days: Number(f.get("days")),
                      startingBid: Number(f.get("startingBid")),
                      increment: Number(f.get("increment")),
                    });
                  }}
                >
                  <h2>Open an auction.</h2>
                  <label>
                    Property
                    <select name="propertyId">
                      {data.properties
                        .filter((p) => p.inventory === "skyscraper")
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="form-row">
                    <label>
                      Starting bid (€)
                      <input
                        name="startingBid"
                        type="number"
                        min="1"
                        defaultValue="200"
                      />
                    </label>
                    <label>
                      Bid increment (€)
                      <input
                        name="increment"
                        type="number"
                        min="1"
                        defaultValue="5"
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      Auction hours
                      <input
                        name="hours"
                        type="number"
                        min="1"
                        max="720"
                        defaultValue="48"
                      />
                    </label>
                    <label>
                      Lease days
                      <input
                        name="days"
                        type="number"
                        min="1"
                        max="365"
                        defaultValue="30"
                      />
                    </label>
                  </div>
                  <button disabled={busy} className="button dark wide">
                    Create auction
                  </button>
                </form>
              </>
            )}
            {tab === "Bids" && (
              <div className="admin-records">
                {data.bids.map((b) => (
                  <div className="admin-record" key={b.id}>
                    <div>
                      {b.email}
                      <small>
                        {b.auctionId} ·{" "}
                        {new Date(b.createdAt).toLocaleString("en-GB")}
                      </small>
                    </div>
                    <strong>{euro(b.amount)}</strong>
                  </div>
                ))}
                {!data.bids.length && <p className="muted">No bids yet.</p>}
              </div>
            )}
            {tab === "Customers" && (
              <div className="admin-records">
                {data.customers.map((email) => (
                  <div className="admin-record" key={email}>
                    <strong>{email}</strong>
                    <span>
                      {data.leases.filter((l) => l.email === email).length}{" "}
                      leases
                    </span>
                  </div>
                ))}
              </div>
            )}
            {tab === "Transactions" && (
              <div className="admin-records">
                {data.transactions.map((t) => (
                  <div className="admin-record" key={t.id}>
                    <div>
                      <strong>{t.email}</strong>
                      <small>
                        {new Date(t.createdAt).toLocaleString("en-GB")} ·{" "}
                        {t.provider} · {t.id}
                      </small>
                    </div>
                    <strong>{euro(t.amount)}</strong>
                  </div>
                ))}
                {!data.transactions.length && (
                  <p className="muted">
                    Transactions appear after a completed checkout.
                  </p>
                )}
              </div>
            )}
            {tab === "Email outbox" && (
              <div className="admin-records">
                {data.mail.map((m) => (
                  <div className="admin-record" key={m.id}>
                    <div>
                      <strong>{m.subject}</strong>
                      <small>
                        To {m.email} · {m.status}
                      </small>
                      <p className="muted">{m.text}</p>
                    </div>
                  </div>
                ))}
                {!data.mail.length && (
                  <p className="muted">No queued emails.</p>
                )}
              </div>
            )}
            {tab === "Settings" && (
              <form
                className="auth-card"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  await action({
                    action: "settings",
                    settings: {
                      durations: String(f.get("durations"))
                        .split(",")
                        .map(Number),
                      reservationMinutes: Number(f.get("reservationMinutes")),
                      moderation: f.get("moderation"),
                    },
                  });
                }}
              >
                <h2>City settings.</h2>
                <label>
                  Lease durations (days, comma separated)
                  <input
                    name="durations"
                    defaultValue={data.settings.durations.join(", ")}
                  />
                  <small className="field-hint">
                    Normal properties use 30-day presence tiers. Other durations
                    apply to skyscrapers only.
                  </small>
                </label>
                <label>
                  Demo reservation minutes
                  <input
                    type="number"
                    name="reservationMinutes"
                    min="1"
                    max="30"
                    defaultValue={data.settings.reservationMinutes}
                  />
                  <small className="field-hint">
                    Stripe Checkout uses 30 minutes, its minimum expiration
                    window.
                  </small>
                </label>
                <label>
                  Advertisement moderation
                  <select
                    name="moderation"
                    defaultValue={data.settings.moderation}
                  >
                    <option value="automatic">Activate, then moderate</option>
                    <option value="review">
                      Require review before display
                    </option>
                  </select>
                </label>
                <button disabled={busy} className="button dark wide">
                  Save settings
                </button>
                <button
                  type="button"
                  className="button outline wide"
                  style={{ marginTop: 12 }}
                  disabled={busy}
                  onClick={() => action({ action: "maintenance" })}
                >
                  <RefreshCw size={14} />
                  Process expirations & auctions
                </button>
              </form>
            )}
          </>
        )}
        {error && !edit && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </main>
      {edit && data && (
        <PropertyEditor
          edit={edit}
          setEdit={setEdit}
          data={data}
          action={action}
          error={error}
          busy={busy}
        />
      )}
    </>
  );
}
