"use client";
import { useState } from "react";
import { Copy, Check, Download, ArrowUpRight } from "lucide-react";
import type { PublicProperty } from "@/types";
import { Modal } from "../modal";
import { Brand } from "../brand";
import { PropertyArt } from "./building-art";
import { districtName, propertyUrl } from "@/lib/client";
import { DISTRICTS_ES } from "@/lib/plots";
import { track } from "@/lib/analytics/client";
export function ShareModal({
  property: p,
  celebrate = false,
  onClose,
}: {
  property: PublicProperty;
  celebrate?: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${location.origin}${propertyUrl(p)}`
      : propertyUrl(p);
  const text = celebrate
    ? "Acabo de construir mi edificio en SkyCity. ¡Ven a elegir tu solar!"
    : "Un pequeño rincón de SkyCity. ¡Ven a elegir tu solar!";
  return (
    <Modal
      title={celebrate ? "YA ESTÁS EN SKYCITY" : "LO BUENO SE COMPARTE"}
      onClose={onClose}
    >
      <h2>{celebrate ? "Bienvenido al barrio." : "Ponlo en su radar."}</h2>
      <p className="muted">
        {celebrate
          ? "Tu edificio ya forma parte de la ciudad. Cuéntaselo al mundo."
          : "Envía un pedacito de la ciudad a alguien."}
      </p>
      <div className="share-card">
        <Brand />
        {p.ad?.logo && (
          <img
            src={p.ad.logo}
            alt={`Logo de ${p.ad.brand}`}
            className="share-brand-logo"
          />
        )}
        <PropertyArt property={p} brand={p.ad?.brand} />
        <span className="eyebrow">
          {districtName(
            p.districtId,
            Object.entries(DISTRICTS_ES).map(([id, d]) => ({ id, ...d })),
          )}
        </span>
        <h3>{p.ad?.brand || p.name}</h3>
        <p>
          {celebrate ? "Acabo de construir mi edificio en SkyCity." : p.name}
        </p>
        <span className="share-address">
          SKYCITY / #{String(p.number).padStart(3, "0")}
        </span>
      </div>
      <div className="share-buttons">
        {[
          [
            "X",
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
          ],
          [
            "LinkedIn",
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
          ],
          [
            "WhatsApp",
            `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
          ],
        ].map(([name, href]) => (
          <a
            className="button outline"
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("share_clicked", p.id)}
          >
            {name}
            <ArrowUpRight size={14} />
          </a>
        ))}
      </div>
      <button
        className="button dark wide"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            track("share_clicked", p.id);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
        {copied ? "Enlace copiado" : "Copiar enlace"}
      </button>
      <a
        className="download-link"
        href={`/api/og/${p.id}`}
        download={`skycity-${p.id}.png`}
      >
        <Download size={14} /> Descargar tarjeta para compartir
      </a>
    </Modal>
  );
}
