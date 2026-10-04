"use client";
import type { PresenceTier, PublicProperty } from "@/types";
import { PRESENCE, PRESENCE_TIERS, presenceLevel } from "@/lib/presence";
import { euro } from "@/lib/client";

export function PresencePreview({
  tier,
  color = "#c78257",
  variant = 0,
}: {
  tier: PresenceTier;
  color?: string;
  variant?: number;
}) {
  const level = presenceLevel(tier);
  const top = 103 - [30, 41, 57, 73, 91][level];
  return (
    <svg
      viewBox="0 0 120 125"
      role="img"
      aria-label={`${tier.toLowerCase()} building preview`}
    >
      <path d="M12 103 56 84 109 104 65 122Z" fill="#dfe6d8" />
      <path d={`M33 ${top + 12} 64 ${top + 23}V112L33 100Z`} fill="#e9dfce" />
      <path d={`M64 ${top + 23} 91 ${top + 10}V99L64 112Z`} fill="#a8b9b3" />
      <path
        d={`M33 ${top + 12} 60 ${top} 91 ${top + 10} 64 ${top + 23}Z`}
        fill="#f7f2e8"
      />
      {Array.from({ length: level + 1 }, (_, i) => (
        <g key={i} fill="#617e76">
          <path d={`m39 ${top + 28 + i * 12} 7 2v6l-7-2Z m14 5 7 2v6l-7-2Z`} />
          <path d={`m70 ${top + 30 + i * 12} 14-6v6l-14 6Z`} />
        </g>
      ))}
      <path d="m40 88 16 6v15l-16-6Z" fill="#51786c" />
      {level >= 3 && (
        <path
          d={`M44 ${top + 6} 58 ${top - 6} 79 ${top + 2} 63 ${top + 10}Z`}
          fill={color}
        />
      )}
      <rect
        x={level >= 3 ? 29 : 34}
        y={level >= 3 ? top - 10 : top + 16}
        width={level ? 43 : 31}
        height={level ? 13 : 9}
        rx="1"
        fill={color}
      />
      <path
        d={`M40 ${level >= 3 ? top - 4 : top + 21}h${level ? 25 : 18}`}
        stroke="#fff5e1"
        strokeWidth="2"
      />
      {level >= 2 && (
        <path
          d={`m69 ${top + 46} 19-8v${level === 4 ? 32 : 22}l-19 8Z`}
          fill={level === 4 ? "#203e42" : color}
          stroke={color}
          strokeWidth="2"
        />
      )}
      {level === 4 && (
        <path
          d={`m72 ${top + 53} 12 8-12 11`}
          fill="none"
          stroke="#b0e8dc"
          strokeWidth="2"
        />
      )}
      {level >= 3 && (
        <path
          d={`M33 ${top + 14}V100M91 ${top + 12}V99`}
          stroke={color}
          strokeWidth="2"
        />
      )}
      {variant % 2 === 0 && <circle cx="24" cy="101" r="6" fill="#83a272" />}
    </svg>
  );
}

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
      <legend>Choose your presence in SkyCity</legend>
      <p className="field-hint">
        Same address. More presence.{" "}
        {current
          ? "Pay only the difference; your expiry date stays the same."
          : "Every tier includes your brand. Start small and upgrade whenever you like."}
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
              <PresencePreview
                tier={tier}
                color={property.ad?.primary || "#ba825e"}
                variant={property.model}
              />
              <strong>{tier}</strong>
              <b>{euro(PRESENCE[tier].price)}</b>
              <small>
                {current === tier
                  ? "Current tier"
                  : current && !disabled
                    ? `+${euro(PRESENCE[tier].price - PRESENCE[current].price)}`
                    : "30 days"}
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
