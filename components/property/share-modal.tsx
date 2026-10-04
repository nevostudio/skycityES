"use client";
import { useState } from "react";
import { Copy, Check, Download, ArrowUpRight } from "lucide-react";
import type { PublicProperty } from "@/types";
import { Modal } from "../modal";
import { Brand } from "../brand";
import { BuildingArt } from "./building-art";
import { propertyUrl } from "@/lib/client";
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
    ? "I just claimed a building in SkyCity. Come find your spot!"
    : "A little corner of SkyCity. Come find your spot!";
  return (
    <Modal
      title={celebrate ? "YOU’RE IN SKYCITY" : "GOOD THINGS ARE BETTER SHARED"}
      onClose={onClose}
    >
      <h2>
        {celebrate ? "Welcome to the neighborhood." : "Put it on their radar."}
      </h2>
      <p className="muted">
        {celebrate
          ? "Your brand is part of the city. Tell the world."
          : "Send a little piece of the city to someone."}
      </p>
      <div className="share-card">
        <Brand />
        {p.ad?.logo && (
          <img
            src={p.ad.logo}
            alt={`${p.ad.brand} logo`}
            className="share-brand-logo"
          />
        )}
        <BuildingArt property={p} brand={p.ad?.brand} />
        <span className="eyebrow">{p.districtId.replaceAll("-", " ")}</span>
        <h3>{p.ad?.brand || p.name}</h3>
        <p>{celebrate ? "I just claimed a building in SkyCity." : p.name}</p>
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
        {copied ? "Link copied" : "Copy building link"}
      </button>
      <a
        className="download-link"
        href={`/api/og/${p.id}`}
        download={`skycity-${p.id}.png`}
      >
        <Download size={14} /> Download share card
      </a>
    </Modal>
  );
}
