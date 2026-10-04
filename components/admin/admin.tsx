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
  Building,
  Auction,
  Bid,
  Transaction,
  Settings,
  Mail,
  CityData,
  PropertyTakeover,
} from "@/types";
import { Header } from "../header";
import { Login } from "../dashboard/login";
import { PropertyEditor } from "./property-editor";
import { api, euro, shortDate } from "@/lib/client";
const tabs = [
  "Solares",
  "Barrios",
  "Edificios y anuncios",
  "Subastas",
  "Pujas",
  "Clientes",
  "Transacciones",
  "Takeovers",
  "Correos",
  "Ajustes",
];
const adStatus: Record<string, string> = {
  active: "activo",
  pending: "en revisión",
  draft: "borrador",
  rejected: "rechazado",
  suspended: "suspendido",
};
type AdminData = {
  properties: Property[];
  districts: District[];
  leases: Lease[];
  buildings: Building[];
  auctions: Auction[];
  bids: Bid[];
  transactions: Transaction[];
  propertyTakeovers: PropertyTakeover[];
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
  const [tab, setTab] = useState("Solares");
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
      setMessage("Cambios guardados.");
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
      name: "Nuevo solar",
      districtId: data!.districts[0].id,
      type: "shop",
      tier: "STANDARD",
      inventory: "normal",
      reservedForBrands: false,
      x: -36,
      z: 42,
      width: 3,
      depth: 3,
      height: 0.3,
      rotation: 0,
      model: 0,
      color: "#d5c3a7",
      price: 3,
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
            <span className="eyebrow">DETRÁS DEL BARRIO</span>
            <h1>Ayuntamiento.</h1>
            <p>Da forma a la ciudad. Haz sitio a lo que viene.</p>
          </div>
          <Link href="/" className="button outline">
            Explorar SkyCity
            <ArrowUpRight size={15} />
          </Link>
        </div>
        {auth === "login" ? (
          <Login demo={demo} admin />
        ) : auth === "forbidden" ? (
          <div className="error">
            Este email no tiene acceso de administrador.{" "}
            <Link href="/my-buildings">Cambia de cuenta en Mis edificios.</Link>
          </div>
        ) : !data ? (
          <p className="muted">Abriendo el Ayuntamiento…</p>
        ) : (
          <>
            {demo && (
              <div className="inline-notice">
                ADMIN DEMO · Los cambios se guardan en esta ciudad local. No se
                envían pagos ni correos reales.
              </div>
            )}
            <div className="admin-stats">
              {[
                ["Ingresos", euro(data.revenue)],
                ["Edificios construidos", data.stats.built],
                ["Porcentaje construido", `${data.stats.builtPercent}%`],
                ["Solares disponibles", data.stats.available],
                ["Construidos hoy", data.stats.builtToday],
                ["Propietarios", data.stats.owners],
                ["Subastas activas", data.stats.auctions],
                ["Clics externos", data.clicks],
              ].map(([label, value]) => (
                <div key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="admin-tabs">
              {tabs.map((t) => (
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
            {tab === "Solares" && (
              <>
                <div className="admin-toolbar">
                  <input
                    aria-label="Buscar solares"
                    placeholder="Busca un solar…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button className="button dark" onClick={newProperty}>
                    <Plus size={15} />
                    Añadir solar
                  </button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>SOLAR</th>
                        <th>BARRIO</th>
                        <th>PRECIO</th>
                        <th>EDIFICIO</th>
                        <th>ESTADO</th>
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
                              {p.inventory === "public"
                                ? "—"
                                : p.inventory === "skyscraper"
                                  ? euro(p.price)
                                  : "3–60 €"}
                            </td>
                            <td>
                              {data.buildings.find((b) => b.propertyId === p.id)
                                ?.tier ||
                                (p.inventory === "skyscraper"
                                  ? "Parcela premium"
                                  : "Solar vacío")}
                            </td>
                            <td>
                              {p.enabled
                                ? p.inventory === "public"
                                  ? "Público"
                                  : p.reservedForBrands
                                    ? "Reservado para marcas"
                                    : p.sale === "auction"
                                      ? "Subasta"
                                      : "Venta directa"
                                : "Inactivo"}
                            </td>
                            <td>
                              <button
                                className="text-button"
                                onClick={() => setEdit(p)}
                              >
                                <Pencil size={13} />
                                Editar
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {tab === "Barrios" && (
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
                      Nombre
                      <input name="name" defaultValue={d.name} required />
                    </label>
                    <label>
                      Subtítulo
                      <input name="subtitle" defaultValue={d.subtitle} />
                    </label>
                    <label>
                      Color
                      <input type="color" name="color" defaultValue={d.color} />
                    </label>
                    <button className="button outline" disabled={busy}>
                      Guardar barrio
                    </button>
                  </form>
                ))}
              </div>
            )}
            {tab === "Edificios y anuncios" && (
              <div className="admin-records">
                {data.leases
                  .filter((l) => !l.retired)
                  .map((l) => (
                    <div className="admin-record" key={l.id}>
                      <div>
                        <strong>{l.ad.brand}</strong> · {l.propertyId}
                        <small>
                          {l.email} · edificio{" "}
                          {data.buildings.find((b) => b.leaseId === l.id)
                            ?.tier || l.presenceTier}{" "}
                          · desde {shortDate(l.startsAt)} ·{" "}
                          {l.status === "active" ? "en pie" : "inactivo"}
                        </small>
                      </div>
                      <span className="tag">{adStatus[l.ad.status]}</span>
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
                        {l.ad.status === "active"
                          ? "Suspender anuncio"
                          : "Activar anuncio"}
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
                        Rechazar
                      </button>
                    </div>
                  ))}
              </div>
            )}
            {tab === "Subastas" && (
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
                          Termina {new Date(a.endsAt).toLocaleString("es-ES")} ·
                          salida {euro(a.startingBid)}
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
                      startingBid: Number(f.get("startingBid")),
                      increment: Number(f.get("increment")),
                    });
                  }}
                >
                  <h2>Abrir una subasta.</h2>
                  <label>
                    Rascacielos
                    <select name="propertyId">
                      {data.properties
                        .filter(
                          (p) =>
                            p.inventory === "skyscraper" &&
                            !data.buildings.some((b) => b.propertyId === p.id),
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="form-row">
                    <label>
                      Puja de salida (€)
                      <input
                        name="startingBid"
                        type="number"
                        min="1"
                        defaultValue="200"
                      />
                    </label>
                    <label>
                      Incremento de puja (€)
                      <input
                        name="increment"
                        type="number"
                        min="1"
                        defaultValue="5"
                      />
                    </label>
                  </div>
                  <label>
                    Duración de la subasta (horas)
                    <input
                      name="hours"
                      type="number"
                      min="1"
                      max="720"
                      defaultValue="48"
                    />
                  </label>
                  <button disabled={busy} className="button dark wide">
                    Crear subasta
                  </button>
                </form>
              </>
            )}
            {tab === "Pujas" && (
              <div className="admin-records">
                {data.bids.map((b) => (
                  <div className="admin-record" key={b.id}>
                    <div>
                      {b.email}
                      <small>
                        {b.auctionId} ·{" "}
                        {new Date(b.createdAt).toLocaleString("es-ES")}
                      </small>
                    </div>
                    <strong>{euro(b.amount)}</strong>
                  </div>
                ))}
                {!data.bids.length && (
                  <p className="muted">Todavía no hay pujas.</p>
                )}
              </div>
            )}
            {tab === "Clientes" && (
              <div className="admin-records">
                {data.customers.map((email) => (
                  <div className="admin-record" key={email}>
                    <strong>{email}</strong>
                    <span>
                      {
                        data.leases.filter(
                          (l) => l.email === email && l.status === "active",
                        ).length
                      }{" "}
                      edificios
                    </span>
                  </div>
                ))}
              </div>
            )}
            {tab === "Transacciones" && (
              <div className="admin-records">
                {data.transactions.map((t) => (
                  <div className="admin-record" key={t.id}>
                    <div>
                      <strong>{t.email}</strong>
                      <small>
                        {new Date(t.createdAt).toLocaleString("es-ES")} ·{" "}
                        {t.provider} · {t.id}
                      </small>
                    </div>
                    <strong>
                      {euro(t.amount)}
                      {t.outcome && <small>{t.outcome}</small>}
                    </strong>
                  </div>
                ))}
                {!data.transactions.length && (
                  <p className="muted">
                    Las transacciones aparecen tras un pago completado.
                  </p>
                )}
              </div>
            )}
            {tab === "Correos" && (
              <div className="admin-records">
                {data.mail.map((m) => (
                  <div className="admin-record" key={m.id}>
                    <div>
                      <strong>{m.subject}</strong>
                      <small>
                        Para {m.email} ·{" "}
                        {m.status === "sent" ? "enviado" : "pendiente"}
                      </small>
                      <p className="muted">{m.text}</p>
                    </div>
                  </div>
                ))}
                {!data.mail.length && (
                  <p className="muted">No hay correos en cola.</p>
                )}
              </div>
            )}
            {tab === "Takeovers" && (
              <div className="admin-records">
                {data.propertyTakeovers.length === 0 && (
                  <p>No hay takeovers registrados.</p>
                )}
                {data.propertyTakeovers
                  .slice()
                  .reverse()
                  .map((t) => (
                    <article className="admin-record" key={t.id}>
                      <div>
                        <strong>
                          {t.property_id} · {euro(t.previous_value)} →{" "}
                          {euro(t.takeover_amount)}
                        </strong>
                        <p>
                          {t.previous_controller_id} →{" "}
                          {t.new_controller_id || "Sin transferencia"}
                        </p>
                        <small>
                          {t.status} ·{" "}
                          {new Date(t.created_at).toLocaleString("es-ES")} ·{" "}
                          {t.stripe_payment_id || "Demo"}
                        </small>
                        {t.conflict_reason && <p>{t.conflict_reason}</p>}
                        {t.refund_id && <small>Reembolso: {t.refund_id}</small>}
                      </div>
                    </article>
                  ))}
              </div>
            )}
            {tab === "Ajustes" && (
              <form
                className="auth-card"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  await action({
                    action: "settings",
                    settings: {
                      reservationMinutes: Number(f.get("reservationMinutes")),
                      moderation: f.get("moderation"),
                      takeoverEnabled: f.get("takeoverEnabled") === "on",
                      takeoverMinimumIncrement: Number(
                        f.get("takeoverMinimumIncrement"),
                      ),
                      takeoverProtectionHours: Number(
                        f.get("takeoverProtectionHours"),
                      ),
                    },
                  });
                }}
              >
                <h2>Ajustes de la ciudad.</h2>
                <label>
                  <input
                    type="checkbox"
                    name="takeoverEnabled"
                    defaultChecked={data.settings.takeoverEnabled}
                  />
                  Takeover global activado
                </label>
                <label>
                  Incremento mínimo de takeover (€)
                  <input
                    name="takeoverMinimumIncrement"
                    type="number"
                    min="1"
                    max="100000"
                    step="0.01"
                    defaultValue={data.settings.takeoverMinimumIncrement ?? 1}
                    required
                  />
                </label>
                <label>
                  Horas de protección tras claim o takeover
                  <input
                    name="takeoverProtectionHours"
                    type="number"
                    min="0"
                    max="8760"
                    step="0.01"
                    defaultValue={data.settings.takeoverProtectionHours ?? 24}
                    required
                  />
                </label>
                <p className="field-hint">
                  Edificios de pago único: STARTER 3 € · PLUS 7 € · PRO 15 € ·
                  PREMIUM 30 € · LANDMARK 60 €. Los rascacielos son inventario
                  premium.
                </p>
                <label>
                  Minutos de reserva en demo
                  <input
                    type="number"
                    name="reservationMinutes"
                    min="1"
                    max="30"
                    defaultValue={data.settings.reservationMinutes}
                  />
                  <small className="field-hint">
                    Stripe Checkout usa 30 minutos, su caducidad mínima.
                  </small>
                </label>
                <label>
                  Moderación de anuncios
                  <select
                    name="moderation"
                    defaultValue={data.settings.moderation}
                  >
                    <option value="automatic">Activar y moderar después</option>
                    <option value="review">Revisar antes de mostrar</option>
                  </select>
                </label>
                <button disabled={busy} className="button dark wide">
                  Guardar ajustes
                </button>
                <button
                  type="button"
                  className="button outline wide"
                  style={{ marginTop: 12 }}
                  disabled={busy}
                  onClick={() => action({ action: "maintenance" })}
                >
                  <RefreshCw size={14} />
                  Procesar reservas caducadas y subastas
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
