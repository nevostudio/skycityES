"use client";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Check,
  Loader2,
  Mail,
  Hammer,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import type { Ad, PublicProperty, PresenceTier } from "@/types";
import {
  PRESENCE,
  PRESENCE_TIERS,
  claimPrice,
  presenceLevel,
  upgradePrice,
} from "@/lib/presence";
import { architectureOf, massing } from "@/lib/massing";
import { DISTRICTS_ES } from "@/lib/plots";
import { PresenceSelector } from "./presence-selector";
import { emptyAd } from "@/lib/seed";
import { api, euro } from "@/lib/client";
import { Modal } from "../modal";
import { AdFields } from "./ad-fields";
import { TierArt } from "../property/tier-art";
import { CONTROL_NOTICE, TRANSFER_NOTICE } from "@/lib/takeover-policy";
type Checkout = {
  reservation: string;
  access: string;
  expiresAt: string;
  amount: number;
  demo: boolean;
  url?: string;
};
type Step = "size" | "brand" | "pay";
const STEP_LABEL: Record<Step, string> = {
  size: "Tamaño",
  brand: "Marca",
  pay: "Pago",
};
/**
 * Three steps (PDF): Tamaño → Marca → Pago, with a live preview of the building and its
 * brand. Upgrades skip the brand; takeovers and skyscrapers skip the size. Same logic and
 * endpoints as before.
 */
export function ClaimModal({
  property: p,
  demo,
  onClose,
  onComplete,
  upgradeLeaseId,
  initialAd,
  email: initialEmail,
  takeoverOffer,
}: {
  property: PublicProperty;
  demo: boolean;
  onClose: () => void;
  onComplete: () => void;
  upgradeLeaseId?: string;
  initialAd?: Ad;
  email?: string;
  takeoverOffer?: number;
}) {
  const [ad, setAd] = useState<Ad>(initialAd || { ...emptyAd });
  const [email, setEmail] = useState(initialEmail || "");
  const sky = p.inventory === "skyscraper";
  const takeover = takeoverOffer !== undefined;
  const currentTier = p.presenceTier || "STARTER";
  const [presenceTier, setPresenceTier] = useState<PresenceTier>(
    takeover
      ? currentTier
      : upgradeLeaseId
        ? PRESENCE_TIERS[Math.min(4, presenceLevel(currentTier) + 1)]
        : "STARTER",
  );
  const amount = takeover
    ? takeoverOffer
    : upgradeLeaseId
      ? upgradePrice(currentTier, presenceTier)
      : claimPrice(p, presenceTier);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [remaining, setRemaining] = useState("");
  const steps: Step[] =
    takeover || sky
      ? ["brand", "pay"]
      : upgradeLeaseId
        ? ["size", "pay"]
        : ["size", "brand", "pay"];
  const [step, setStep] = useState(0);
  const current = steps[step];
  const last = step === steps.length - 1;
  function next() {
    if (current === "brand" && ad.brand.trim().length < 2) {
      setError("Escribe el nombre de tu marca (mínimo 2 caracteres).");
      return;
    }
    setError("");
    setStep((s) => Math.min(steps.length - 1, s + 1));
  }
  useEffect(() => {
    if (!checkout) return;
    const tick = () => {
      const seconds = Math.max(
        0,
        Math.floor((Date.parse(checkout.expiresAt) - Date.now()) / 1000),
      );
      setRemaining(
        `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
      );
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [checkout]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!last) return next();
    setBusy(true);
    setError("");
    try {
      const result = await api<Checkout>(
        takeover ? "/api/takeover" : "/api/checkout",
        {
          propertyId: p.id,
          ad,
          email,
          upgradeLeaseId,
          presenceTier,
          offerAmount: takeoverOffer,
        },
      );
      if (result.url) {
        location.assign(result.url);
        return;
      }
      setCheckout(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    if (!checkout) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/checkout/complete", {
        reservation: checkout.reservation,
        access: checkout.access,
      });
      onComplete();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const tierLabel = sky ? "RASCACIELOS" : presenceTier;
  const arch = architectureOf(p.districtId);
  const previewTier = sky ? "SKYSCRAPER" : presenceTier;
  const headline = takeover
    ? "Tu marca. Este edificio."
    : checkout
      ? "Un último paso."
      : upgradeLeaseId
        ? "Más altura. Mismo solar."
        : current === "brand"
          ? "Tu marca. Tu edificio."
          : "Pago único.";
  return (
    <Modal
      title={
        takeover
          ? "CONTROLAR ESTA UBICACIÓN"
          : checkout
            ? "TU SOLAR ESTÁ RESERVADO"
            : upgradeLeaseId
              ? "HAZ CRECER TU EDIFICIO"
              : "CONSTRUYE AQUÍ"
      }
      onClose={onClose}
      className="claim-modal sc-checkout"
    >
      <div className="sc-checkout-grid">
        <aside className="sc-checkout-preview" aria-label="Vista previa">
          <div className="sc-checkout-art">
            <TierArt
              tier={previewTier}
              color={ad.primary}
              initial={ad.brand || "T"}
              glass={arch === "corporate" || arch === "tech"}
              roof={massing({ ...p, building: { tier: previewTier } }).roof}
              fit="single"
              label={`Vista previa del edificio ${tierLabel} con tu marca`}
            />
          </div>
          <span className="eyebrow">
            {DISTRICTS_ES[p.districtId]?.name || p.districtId}
          </span>
          <h3>{p.name}</h3>
          <span className="tag">{tierLabel}</span>
          <div className="sc-total">
            <small>
              {takeover ? "Tu oferta" : upgradeLeaseId ? "Pagas" : "Total"}
            </small>
            <strong>{euro(amount)}</strong>
            <span>Pago único</span>
          </div>
          {!sky && (
            <div className="takeover-notice">
              <strong>{CONTROL_NOTICE}</strong>
              <p>{TRANSFER_NOTICE}</p>
              <p>
                Tras el pago tendrás {p.takeover?.protectionHours ?? 24} horas
                de protección. El anterior controlador no recibe dinero ni
                compensación.
              </p>
              {takeover && (
                <p>
                  Tu importe se convertirá en el nuevo valor que deberá superar
                  la siguiente persona. Si el control cambia durante el pago, no
                  recibirás la ubicación y se devolverá íntegramente tu pago.
                </p>
              )}
            </div>
          )}
        </aside>
        <div className="sc-checkout-main">
          {!checkout && (
            <ol className="sc-steps" aria-label="Pasos">
              {steps.map((st, i) => (
                <li
                  key={st}
                  className={i === step ? "active" : i < step ? "done" : ""}
                  aria-current={i === step ? "step" : undefined}
                >
                  <span>{i < step ? <Check size={12} /> : i + 1}</span>
                  {STEP_LABEL[st]}
                </li>
              ))}
            </ol>
          )}
          {current !== "size" && (
            <div className="claim-heading">
              <h2>{headline}</h2>
            </div>
          )}
          {checkout ? (
            <div className="checkout-confirm">
              <div className="notice">
                <ShieldCheck size={20} />
                <div>
                  <strong>Pago de demostración · sin cargo</strong>
                  <p>Simula un pago correcto. No hace falta tarjeta.</p>
                </div>
              </div>
              <div className="receipt">
                <span>
                  {ad.brand} ·{" "}
                  {upgradeLeaseId
                    ? `${currentTier} → ${presenceTier}`
                    : `Edificio ${tierLabel}`}
                </span>
                <strong>{euro(checkout.amount)}</strong>
              </div>
              <p className="muted">
                <Mail size={14} /> {email}
              </p>
              <p className="microcopy">
                {takeover ? "Checkout válido durante" : "Reservado durante"}{" "}
                {remaining}
                {takeover &&
                  " · No reserva el control: se comprueba al confirmar el pago."}
              </p>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button coral wide"
                disabled={busy || remaining === "0:00"}
                onClick={pay}
              >
                {busy ? (
                  <Loader2 className="spin" size={18} />
                ) : (
                  <Check size={18} />
                )}
                {upgradeLeaseId
                  ? "Completar mejora de demostración"
                  : "Completar pago de demostración"}
              </button>
              <p className="microcopy">Pago único. Sin cargos recurrentes.</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              {current === "size" && (
                <>
                  <PresenceSelector
                    property={{ ...p, ad }}
                    value={presenceTier}
                    onChange={setPresenceTier}
                    current={upgradeLeaseId ? currentTier : undefined}
                  />
                  {upgradeLeaseId && (
                    <div className="receipt">
                      <span>
                        {currentTier} {euro(PRESENCE[currentTier].price)} →{" "}
                        {presenceTier} {euro(PRESENCE[presenceTier].price)}
                        <small>Mismo solar · el edificio crece</small>
                      </span>
                      <strong>Pagas {euro(amount)}</strong>
                    </div>
                  )}
                </>
              )}
              {current === "brand" && (
                <AdFields
                  ad={ad}
                  onChange={setAd}
                  tier={sky ? "SKYSCRAPER" : presenceTier}
                />
              )}
              {current === "pay" && (
                <>
                  <label>
                    Tu email
                    <input
                      type="email"
                      required
                      value={email}
                      readOnly={!!upgradeLeaseId}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                    />
                    <small className="field-hint">
                      Tu recibo y un enlace de acceso seguro. Sin contraseñas.
                    </small>
                  </label>
                  <p className="fine-print">
                    Al continuar aceptas mostrar tu marca en SkyCity. Debes
                    tener los derechos de tu contenido; los anuncios ilegales o
                    dañinos pueden suspenderse. Un edificio en SkyCity es un
                    espacio publicitario virtual, no una propiedad inmobiliaria
                    ni una inversión.
                  </p>
                </>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="sc-step-actions">
                {step > 0 && (
                  <button
                    type="button"
                    className="button outline"
                    onClick={() => {
                      setError("");
                      setStep(step - 1);
                    }}
                  >
                    <ArrowLeft size={16} /> Atrás
                  </button>
                )}
                {last ? (
                  <button className="button coral wide" disabled={busy}>
                    {busy ? (
                      <Loader2 size={18} className="spin" />
                    ) : (
                      <>
                        {takeover
                          ? "HACERME CON ESTA UBICACIÓN"
                          : upgradeLeaseId
                            ? "Mejorar"
                            : "Construir"}{" "}
                        por {euro(amount)}
                        <Hammer size={18} />
                      </>
                    )}
                  </button>
                ) : (
                  <button className="button dark wide">
                    Continuar <ArrowRight size={16} />
                  </button>
                )}
              </div>
              {last && (
                <p className="microcopy">
                  <ShieldCheck size={13} />
                  {demo
                    ? "Pago de demostración · sin cobro real"
                    : "Pago seguro con Stripe"}{" "}
                  · Pago único
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}
