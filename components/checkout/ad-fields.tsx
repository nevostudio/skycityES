"use client";
import { useState } from "react";
import type { Ad } from "@/types";
import { ChevronDown, Upload } from "lucide-react";
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
        Brand name{" "}
        <input
          required
          minLength={2}
          maxLength={40}
          value={ad.brand}
          onChange={(e) => set("brand", e.target.value)}
          placeholder="Your next big idea"
        />
      </label>
      <label>
        Website <span className="optional">optional</span>
        <input
          type="url"
          value={ad.website}
          onChange={(e) => set("website", e.target.value)}
          placeholder="https://your-brand.com"
        />
      </label>
      <label>
        A little about your brand <span className="optional">optional</span>
        <textarea
          rows={2}
          maxLength={180}
          value={ad.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What should your new neighbors know?"
        />
      </label>
      <div className="form-row">
        <label>
          Brand color
          <div className="color-input">
            <input
              aria-label="Primary brand color"
              type="color"
              value={ad.primary}
              onChange={(e) => set("primary", e.target.value)}
            />
            <span>{ad.primary.toUpperCase()}</span>
          </div>
        </label>
        <label>
          Sign style
          <select
            value={ad.style}
            onChange={(e) => set("style", e.target.value)}
          >
            <option value="rooftop">Rooftop sign</option>
            <option value="facade">Building facade</option>
            <option value="billboard">Billboard</option>
          </select>
        </label>
      </div>
      <button
        type="button"
        className="text-button more-options"
        onClick={() => setExtra(!extra)}
        aria-expanded={extra}
      >
        Logo, socials & more <ChevronDown size={15} />
      </button>
      {extra && (
        <div className="extra-fields">
          <div className="form-row">
            <label className="upload-field">
              <Upload size={17} />
              Upload logo
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
              Upload banner
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
            Logo URL
            <input
              type="url"
              value={ad.logo}
              onChange={(e) => set("logo", e.target.value)}
              placeholder="https://…"
            />
          </label>
          <label>
            Banner URL
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
              Call to action
              <select
                value={ad.cta}
                onChange={(e) => set("cta", e.target.value)}
              >
                {[
                  "Visit website",
                  "Shop now",
                  "Follow me",
                  "Learn more",
                  "View project",
                  "Contact us",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Promo code
              <input
                maxLength={40}
                value={ad.promo}
                onChange={(e) => set("promo", e.target.value)}
              />
            </label>
          </div>
          <label>
            Sign background
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
