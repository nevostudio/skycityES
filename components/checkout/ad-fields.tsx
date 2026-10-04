"use client";
import { useState } from "react";
import type { Ad } from "@/types";
import { ChevronDown, Upload } from "lucide-react";
import { CTAS } from "@/lib/plots";
export function AdFields({
  ad,
  onChange,
}: {
  ad: Ad;
  onChange: (ad: Ad) => void;
}) {
  const [extra, setExtra] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const set = (key: keyof Ad, value: string) =>
    onChange({ ...ad, [key]: value });
  async function upload(file: File, key: "logo" | "banner") {
    setUploadError("");
    const data = new FormData();
    data.set("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: data });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error);
      set(key, out.url);
    } catch (e) {
      setUploadError((e as Error).message);
    }
  }
  return (
    <>
      <label>
        Nombre de la marca{" "}
        <input
          required
          minLength={2}
          maxLength={40}
          value={ad.brand}
          onChange={(e) => set("brand", e.target.value)}
          placeholder="Tu próxima gran idea"
        />
      </label>
      <label>
        Web <span className="optional">opcional</span>
        <input
          type="url"
          value={ad.website}
          onChange={(e) => set("website", e.target.value)}
          placeholder="https://tu-marca.com"
        />
      </label>
      <label>
        Cuéntanos sobre tu marca <span className="optional">opcional</span>
        <textarea
          rows={2}
          maxLength={180}
          value={ad.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="¿Qué deberían saber tus nuevos vecinos?"
        />
      </label>
      <div className="form-row">
        <label>
          Color de marca
          <div className="color-input">
            <input
              aria-label="Color principal de la marca"
              type="color"
              value={ad.primary}
              onChange={(e) => set("primary", e.target.value)}
            />
            <span>{ad.primary.toUpperCase()}</span>
          </div>
        </label>
        <label>
          Estilo del rótulo
          <select
            value={ad.style}
            onChange={(e) => set("style", e.target.value)}
          >
            <option value="rooftop">Rótulo en azotea</option>
            <option value="facade">Fachada del edificio</option>
            <option value="billboard">Valla publicitaria</option>
          </select>
        </label>
      </div>
      <button
        type="button"
        className="text-button more-options"
        onClick={() => setExtra(!extra)}
        aria-expanded={extra}
      >
        Logo, redes y más <ChevronDown size={15} />
      </button>
      {extra && (
        <div className="extra-fields">
          <div className="form-row">
            <label className="upload-field">
              <Upload size={17} />
              Subir logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  if (e.target.files?.[0])
                    void upload(e.target.files[0], "logo");
                }}
              />
            </label>
            <label className="upload-field">
              <Upload size={17} />
              Subir banner
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  if (e.target.files?.[0])
                    void upload(e.target.files[0], "banner");
                }}
              />
            </label>
          </div>
          {uploadError && <p className="error">{uploadError}</p>}
          <label>
            URL del logo
            <input
              type="url"
              value={ad.logo}
              onChange={(e) => set("logo", e.target.value)}
              placeholder="https://…"
            />
          </label>
          <label>
            URL del banner
            <input
              type="url"
              value={ad.banner}
              onChange={(e) => set("banner", e.target.value)}
              placeholder="https://…"
            />
          </label>
          {(["instagram", "tiktok", "x", "linkedin"] as const).map((k) => (
            <label key={k}>
              {k === "x" ? "X" : k.charAt(0).toUpperCase() + k.slice(1)}
              <input
                type="url"
                value={ad[k]}
                onChange={(e) => set(k, e.target.value)}
                placeholder="https://…"
              />
            </label>
          ))}
          <div className="form-row">
            <label>
              Llamada a la acción
              <select
                value={ad.cta}
                onChange={(e) => set("cta", e.target.value)}
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
                onChange={(e) => set("promo", e.target.value)}
              />
            </label>
          </div>
          <label>
            Fondo del rótulo
            <input
              type="color"
              value={ad.secondary}
              onChange={(e) => set("secondary", e.target.value)}
            />
          </label>
        </div>
      )}
    </>
  );
}
