"use client";
import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck, Check, Loader2, Mail } from "lucide-react";
import type { Ad, PublicProperty, PresenceTier } from "@/types";
import {
  PRESENCE,
  PRESENCE_TIERS,
  claimPrice,
  presenceLevel,
  visualProperty,
} from "@/lib/presence";
import { PresenceSelector } from "./presence-selector";
import { emptyAd } from "@/lib/seed";
import { api, euro } from "@/lib/client";
import { Modal } from "../modal";
import { AdFields } from "./ad-fields";
import { BuildingArt } from "../property/building-art";
type Checkout = {
  reservation: string;
  access: string;
  expiresAt: string;
  amount: number;
  demo: boolean;
  url?: string;
};
export function ClaimModal({
  property: p,
  durations,
  demo,
  onClose,
  onComplete,
  renewalLeaseId,
  upgradeLeaseId,
  initialAd,
  email: initialEmail,
}: {
  property: PublicProperty;
  durations: number[];
  demo: boolean;
  onClose: () => void;
  onComplete: () => void;
  renewalLeaseId?: string;
  upgradeLeaseId?: string;
  initialAd?: Ad;
  email?: string;
}) {
  const [ad, setAd] = useState<Ad>(initialAd || { ...emptyAd });
  const [email, setEmail] = useState(initialEmail || "");
  const [days, setDays] = useState(durations.includes(30) ? 30 : durations[0]);
  const currentTier = p.presenceTier || "STARTER";
  const [presenceTier, setPresenceTier] = useState<PresenceTier>(
    upgradeLeaseId
      ? PRESENCE_TIERS[Math.min(4, presenceLevel(currentTier) + 1)]
      : renewalLeaseId
        ? currentTier
        : "STARTER",
  );
  const amount = upgradeLeaseId
    ? PRESENCE[presenceTier].price - PRESENCE[currentTier].price
    : claimPrice(p, presenceTier, days);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [remaining, setRemaining] = useState("");
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
    setBusy(true);
    setError("");
    try {
      const result = await api<Checkout>("/api/checkout", {
        propertyId: p.id,
        ad,
        email,
        days,
        renewalLeaseId,
        upgradeLeaseId,
        presenceTier,
      });
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
  return (
    <Modal
      title={
        checkout
          ? "YOUR SPOT IS RESERVED"
          : upgradeLeaseId
            ? "GROW YOUR PRESENCE"
            : renewalLeaseId
              ? "STAY A LITTLE LONGER"
              : "MAKE YOURSELF AT HOME"
      }
      onClose={onClose}
      className="claim-modal"
    >
      <div className="claim-heading">
        <h2>
          {checkout
            ? "One last step."
            : upgradeLeaseId
              ? "A bigger presence. Same place."
              : renewalLeaseId
                ? "Keep your place."
                : "Your brand. Your building."}
        </h2>
        <p>
          {checkout
            ? "Your new neighbors are waiting."
            : upgradeLeaseId
              ? "Your brand and lease dates stay exactly as they are."
              : "A little corner of the internet, made yours."}
        </p>
      </div>
      <div className="claim-preview">
        <BuildingArt
          property={visualProperty({ ...p, color: ad.primary }, presenceTier)}
          brand={ad.brand || "YOUR BRAND"}
        />
        <div>
          <span className="eyebrow">{p.districtId.replaceAll("-", " ")}</span>
          <h3>{p.name}</h3>
          <span className="tag">
            {p.inventory === "skyscraper"
              ? "EXCLUSIVE SKYSCRAPER"
              : presenceTier}
          </span>
        </div>
      </div>
      {checkout ? (
        <div className="checkout-confirm">
          <div className="notice">
            <ShieldCheck size={20} />
            <div>
              <strong>Demo checkout · no charge</strong>
              <p>
                This simulates a successful payment. No card details needed.
              </p>
            </div>
          </div>
          <div className="receipt">
            <span>
              {ad.brand} ·{" "}
              {upgradeLeaseId
                ? `${currentTier} → ${presenceTier}`
                : `${days} days`}
            </span>
            <strong>{euro(checkout.amount)}</strong>
          </div>
          <p className="muted">
            <Mail size={14} /> {email}
          </p>
          <p className="microcopy">Reserved for {remaining}</p>
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
            {upgradeLeaseId ? "Complete demo upgrade" : "Complete demo claim"}
          </button>
          <p className="microcopy">
            A temporary advertising lease. No recurring charges.
          </p>
        </div>
      ) : (
        <form onSubmit={submit}>
          {p.inventory !== "skyscraper" && !renewalLeaseId && (
            <PresenceSelector
              property={{ ...p, ad }}
              value={presenceTier}
              onChange={setPresenceTier}
              current={upgradeLeaseId ? currentTier : undefined}
            />
          )}
          {upgradeLeaseId ? (
            <div className="receipt">
              <span>
                {currentTier} {euro(PRESENCE[currentTier].price)} →{" "}
                {presenceTier} {euro(PRESENCE[presenceTier].price)}
                <small>
                  Same location · expires{" "}
                  {new Date(p.expiresAt!).toLocaleDateString("en-GB")}
                </small>
              </span>
              <strong>Pay {euro(amount)}</strong>
            </div>
          ) : (
            <fieldset className="duration-fieldset">
              <legend>Choose your stay</legend>
              <div className="duration-options">
                {durations
                  .filter((d) => p.prices[String(d)])
                  .map((d) => (
                    <button
                      type="button"
                      key={d}
                      className={d === days ? "selected" : ""}
                      onClick={() => setDays(d)}
                    >
                      <strong>{d} days</strong>
                      <span>{euro(claimPrice(p, presenceTier, d))}</span>
                      {d === 30 && <small>NO RECURRING CHARGE</small>}
                    </button>
                  ))}
              </div>
            </fieldset>
          )}
          {!upgradeLeaseId && <AdFields ad={ad} onChange={setAd} />}
          <label>
            Your email
            <input
              type="email"
              required
              value={email}
              readOnly={!!renewalLeaseId || !!upgradeLeaseId}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <small className="field-hint">
              Your receipt and secure access link. No password, ever.
            </small>
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button coral wide" disabled={busy}>
            {busy ? (
              <Loader2 size={18} className="spin" />
            ) : (
              <>
                {" "}
                {upgradeLeaseId
                  ? "Upgrade"
                  : renewalLeaseId
                    ? "Renew"
                    : "Claim"}{" "}
                for {euro(amount)}
                <ArrowRight size={18} />
              </>
            )}
          </button>
          <p className="microcopy">
            <ShieldCheck size={13} />
            {demo
              ? "Demo checkout · no real payment"
              : "Secure checkout powered by Stripe"}{" "}
            · {upgradeLeaseId ? "Existing expiry unchanged" : `${days} days`}
          </p>
          <p className="fine-print">
            By continuing, you agree to a temporary advertising placement. You
            must own the rights to your content. Illegal or harmful ads may be
            suspended.
          </p>
        </form>
      )}
    </Modal>
  );
}
