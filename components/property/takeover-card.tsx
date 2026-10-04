"use client";
import { useState } from "react";
import type { PublicProperty } from "@/types";
import { euro } from "@/lib/client";
import { ClaimModal } from "../checkout/claim-modal";

export function TakeoverCard({
  property: p,
  owned = false,
  demo = false,
}: {
  property: PublicProperty;
  owned?: boolean;
  demo?: boolean;
}) {
  const policy = p.takeover;
  const [offer, setOffer] = useState(policy?.minimumOffer ?? 1);
  const [checkout, setCheckout] = useState(false);
  if (p.building?.kind !== "private" || p.inventory !== "normal") return null;
  const min = policy?.minimumOffer ?? 1;
  return (
    <section className="takeover-card" aria-label="Control de la ubicación">
      <div className="price-row">
        <span>Valor actual</span>
        <strong>{euro(p.current_property_value ?? 0)}</strong>
      </div>
      <strong>
        {policy?.reason === "PROTEGIDO"
          ? "PROTEGIDO"
          : policy?.open
            ? "Abierto a takeover"
            : "Takeover no disponible"}
      </strong>
      {policy?.reason === "PROTEGIDO" && p.protection_until && (
        <p>Hasta {new Date(p.protection_until).toLocaleString("es-ES")}</p>
      )}
      {policy?.eligible && (
        <p>
          Cualquier usuario puede superar este valor cuando termine el periodo
          de protección.
        </p>
      )}
      {!owned && policy?.open && (
        <>
          <h3>¿Quieres esta ubicación?</h3>
          <p>
            Supera {euro(p.current_property_value ?? 0)}. Mínimo {euro(min)}.
          </p>
          <label>
            Tu oferta (€)
            <input
              type="number"
              min={min}
              max="999999.99"
              step="0.01"
              value={offer}
              onChange={(e) => setOffer(Number(e.target.value))}
            />
          </label>
          <div className="takeover-increments">
            {[1, 5, 10, 25, 50].map((n) => (
              <button
                key={n}
                type="button"
                className="button outline"
                onClick={() =>
                  setOffer(
                    Math.max(
                      min,
                      Math.round(((p.current_property_value ?? 0) + n) * 100) /
                        100,
                    ),
                  )
                }
              >
                +{n} €
              </button>
            ))}
          </div>
          <p>
            Tu importe se convertirá en el nuevo valor que deberá superar la
            siguiente persona.
          </p>
          <button
            className="button dark wide"
            disabled={
              !Number.isFinite(offer) || offer < min || offer > 999999.99
            }
            onClick={() => setCheckout(true)}
          >
            HACERME CON ESTA UBICACIÓN
          </button>
        </>
      )}
      {checkout && (
        <ClaimModal
          property={p}
          demo={demo}
          takeoverOffer={offer}
          onClose={() => setCheckout(false)}
          onComplete={() => location.assign(`/?building=${p.id}`)}
        />
      )}
    </section>
  );
}
