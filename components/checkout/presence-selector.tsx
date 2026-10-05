"use client";
import type { PresenceTier, PublicProperty } from "@/types";
import { PRESENCE, PRESENCE_TIERS, presenceLevel } from "@/lib/presence";
import { euro } from "@/lib/client";
import { TierArt } from "../property/tier-art";

export function PresenceSelector({
  property,
  value,
  onChange,
  current,
}: {
  property: PublicProperty;
  value: PresenceTier;
  onChange: (tier: PresenceTier) => void;
  current?: PresenceTier;
}) {
  return (
    <fieldset className="presence-fieldset">
      <legend>
        {current
          ? "Elige el nuevo tamaño"
          : "1. Elige el tamaño de tu edificio"}
      </legend>
      <p className="field-hint">
        Mismo solar. Más presencia.{" "}
        {current
          ? "Pagas solo la diferencia y tu edificio crece en el mismo sitio."
          : "Todos incluyen tu marca. Empieza pequeño y mejóralo cuando quieras."}
      </p>
      <div className="presence-options">
        {PRESENCE_TIERS.map((tier) => {
          const disabled =
            !!current && presenceLevel(tier) <= presenceLevel(current);
          return (
            <label
              key={tier}
              className={`presence-option ${tier === value ? "selected" : ""} ${disabled ? "unavailable" : ""}`}
            >
              <input
                type="radio"
                name="presence"
                value={tier}
                checked={value === tier}
                disabled={disabled}
                onChange={() => onChange(tier)}
              />
              <TierArt
                tier={tier}
                color={property.ad?.primary || "#e8663a"}
                initial={property.ad?.brand || "T"}
                fit="row"
              />
              <strong>{tier}</strong>
              <b>{euro(PRESENCE[tier].price)}</b>
              <small>
                {current === tier
                  ? "Tamaño actual"
                  : current && !disabled
                    ? `+${euro(PRESENCE[tier].price - PRESENCE[current].price)}`
                    : PRESENCE[tier].floors}
              </small>
            </label>
          );
        })}
      </div>
      <p className="presence-description" aria-live="polite">
        {PRESENCE[value].description}
      </p>
    </fieldset>
  );
}
