"use client";
import { useRef, useState } from "react";
import type { Ad, BuildingTier } from "@/types";
import { ChevronDown, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { CTAS } from "@/lib/plots";
import {
  IMAGE_SUPPORTS,
  SUPPORT_LABELS,
  SUPPORT_MIN_TIER,
  TAGLINE_MAX,
  supportAllowed,
} from "@/lib/branding";
import { SignPreview } from "./sign-preview";

type Upload = "logo" | "banner";
/**
 * Brand editor shared by the purchase flow and "Editar marca": name, logo, phrase, colors,
 * advertising image and where it is shown (limited by the building tier).
 */
export function AdFields({
  ad,
  onChange,
  tier = "STARTER",
}: {
  ad: Ad;
  onChange: (ad: Ad) => void;
  tier?: BuildingTier;
}) {
  const [extra, setExtra] = useState(false);
  const [uploading, setUploading] = useState<Upload | null>(null);
  const [uploadError, setUploadError] = useState("");
  // Uploads finish later: always merge into the latest version of the form.
  const latest = useRef(ad);
  latest.current = ad;
  const set = (patch: Partial<Ad>) => onChange({ ...latest.current, ...patch });
  async function upload(file: File, key: Upload) {
    setUploadError("");
    setUploading(key);
    const data = new FormData();
    data.set("file", file);
    data.set("kind", key);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: data });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error);
      set({ [key]: out.url });
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(null);
    }
  }
  const picker = (key: Upload, label: string) => (
    <div className="image-field">
      <span className="image-thumb" data-empty={!ad[key]}>
        {ad[key] ? <img src={ad[key]} alt="" /> : <ImageIcon size={18} />}
      </span>
      <label className="upload-field">
        {uploading === key ? (
          <Loader2 className="spin" size={16} />
        ) : (
          <Upload size={16} />
        )}
        {ad[key] ? `Cambiar ${label}` : `Subir ${label}`}
        <input
          type="file"
          aria-label={`Subir ${label}`}
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void upload(file, key);
          }}
        />
      </label>
      {ad[key] && (
        <button
          type="button"
          className="text-button"
          aria-label={`Quitar ${label}`}
          onClick={() => set({ [key]: "" })}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
  return (
    <>
      <label>
        Nombre de la marca{" "}
        <input
          required
          minLength={2}
          maxLength={40}
          value={ad.brand}
          onChange={(e) => set({ brand: e.target.value })}
          placeholder="Tu próxima gran idea"
        />
      </label>
      <label>
        Frase corta <span className="optional">opcional</span>
        <input
          maxLength={TAGLINE_MAX}
          value={ad.tagline || ""}
          onChange={(e) => set({ tagline: e.target.value })}
          placeholder="Encuentra tus próximos anunciantes"
        />
        <small className="field-hint">
          Aparece bajo el nombre en el cartel de la azotea. Máximo {TAGLINE_MAX}{" "}
          caracteres.
        </small>
      </label>
      <label>
        Web <span className="optional">opcional</span>
        <input
          type="url"
          value={ad.website}
          onChange={(e) => set({ website: e.target.value })}
          placeholder="https://tu-marca.com"
        />
      </label>
      <fieldset className="brand-fieldset">
        <legend>Logo</legend>
        {picker("logo", "logo")}
        <small className="field-hint">
          PNG, JPG o WebP de hasta 2 MB (mínimo 32 px). Se admite transparencia.
          Los logos horizontales sustituyen al nombre en el cartel.
        </small>
      </fieldset>
      <div className="form-row">
        <label>
          Color de acento
          <div className="color-input">
            <input
              aria-label="Color de acento"
              type="color"
              value={ad.primary}
              onChange={(e) => set({ primary: e.target.value })}
            />
            <span>{ad.primary.toUpperCase()}</span>
          </div>
        </label>
        <label>
          Fondo del cartel
          <div className="color-input">
            <input
              aria-label="Fondo del cartel"
              type="color"
              value={ad.secondary}
              onChange={(e) => set({ secondary: e.target.value })}
            />
            <span>{ad.secondary.toUpperCase()}</span>
          </div>
        </label>
      </div>
      <SignPreview ad={ad} tier={tier} />
      <fieldset className="brand-fieldset">
        <legend>
          Imagen publicitaria <span className="optional">opcional</span>
        </legend>
        {picker("banner", "imagen")}
        <label>
          Dónde se muestra
          <select
            value={ad.support}
            onChange={(e) => set({ support: e.target.value as Ad["support"] })}
          >
            {IMAGE_SUPPORTS.map((s) => (
              <option key={s} value={s} disabled={!supportAllowed(s, tier)}>
                {SUPPORT_LABELS[s]}
                {supportAllowed(s, tier)
                  ? ""
                  : ` · desde ${SUPPORT_MIN_TIER[s]}`}
              </option>
            ))}
          </select>
        </label>
        <small className="field-hint">
          {supportAllowed("SIDE_BILLBOARD", tier)
            ? "Horizontal y de al menos 200 px. Se recorta para encajar en el soporte."
            : "Los edificios STARTER muestran solo el cartel de azotea. Mejora a PLUS para añadir una valla."}
        </small>
      </fieldset>
      {uploadError && (
        <p className="error" role="alert">
          {uploadError}
        </p>
      )}
      <button
        type="button"
        className="text-button more-options"
        onClick={() => setExtra(!extra)}
        aria-expanded={extra}
      >
        Descripción, redes y más <ChevronDown size={15} />
      </button>
      {extra && (
        <div className="extra-fields">
          <label>
            Cuéntanos sobre tu marca <span className="optional">opcional</span>
            <textarea
              rows={2}
              maxLength={180}
              value={ad.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="¿Qué deberían saber tus nuevos vecinos?"
            />
          </label>
          {(["instagram", "tiktok", "x", "linkedin"] as const).map((k) => (
            <label key={k}>
              {k === "x" ? "X" : k.charAt(0).toUpperCase() + k.slice(1)}
              <input
                type="url"
                value={ad[k]}
                onChange={(e) => set({ [k]: e.target.value })}
                placeholder="https://…"
              />
            </label>
          ))}
          <div className="form-row">
            <label>
              Llamada a la acción
              <select
                value={ad.cta}
                onChange={(e) => set({ cta: e.target.value })}
              >
                {CTAS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Código promocional
              <input
                maxLength={40}
                value={ad.promo}
                onChange={(e) => set({ promo: e.target.value })}
              />
            </label>
          </div>
        </div>
      )}
    </>
  );
}
