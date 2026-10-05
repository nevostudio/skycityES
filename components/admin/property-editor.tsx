"use client";
import type { Ad, Property, District, PresenceTier } from "@/types";
import { useState, type Dispatch, type SetStateAction } from "react";
import { AdFields } from "../checkout/ad-fields";
import { PRESENCE_TIERS } from "@/lib/presence";
import { Modal } from "../modal";
import { emptyAd } from "@/lib/seed";
import { AUCTIONS_ENABLED } from "@/lib/features";
export function PropertyEditor({
  edit,
  setEdit,
  data,
  action,
  error,
  busy,
}: {
  edit: Property;
  setEdit: Dispatch<SetStateAction<Property | null>>;
  data: { districts: District[]; buildings?: { propertyId: string }[] };
  action: (body: unknown) => Promise<boolean>;
  error: string;
  busy: boolean;
}) {
  return (
    <Modal
      title={edit.id ? "EDITAR EL BARRIO" : "HAZ SITIO A UNA NUEVA IDEA"}
      onClose={() => setEdit(null)}
    >
      <h2>{edit.id ? edit.name : "Nuevo solar"}</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await action({ action: "property", property: edit }))
            setEdit(null);
        }}
      >
        <fieldset>
          <legend>Control de la ubicación</legend>
          <label>
            Valor actual (€)
            <input
              type="number"
              min="0"
              max="999999.99"
              step="0.01"
              value={edit.current_property_value ?? 0}
              onChange={(e) =>
                setEdit({
                  ...edit,
                  current_property_value: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={!!edit.takeover_enabled}
              disabled={edit.inventory === "public"}
              onChange={(e) =>
                setEdit({ ...edit, takeover_enabled: e.target.checked })
              }
            />
            Permitir takeover
          </label>
          <label>
            <input
              type="checkbox"
              checked={!!edit.takeover_blocked}
              onChange={(e) =>
                setEdit({ ...edit, takeover_blocked: e.target.checked })
              }
            />
            Bloqueo manual de takeover
          </label>
          <small>
            Los edificios públicos, administrativos, reservados y rascacielos
            están excluidos.
          </small>
        </fieldset>
        <label>
          Nombre
          <input
            required
            value={edit.name}
            onChange={(e) => setEdit({ ...edit, name: e.target.value })}
          />
        </label>
        <div className="form-row">
          <label>
            Barrio
            <select
              value={edit.districtId}
              onChange={(e) => setEdit({ ...edit, districtId: e.target.value })}
            >
              {data.districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estilo de zona
            <select
              value={edit.type}
              onChange={(e) =>
                setEdit({
                  ...edit,
                  type: e.target.value as Property["type"],
                })
              }
            >
              {[
                "house",
                "shop",
                "restaurant",
                "office",
                "apartment",
                "tower",
                "warehouse",
                "nightclub",
                "hotel",
                "mall",
                "billboard",
                "landmark",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Categoría de ubicación
            <select
              value={edit.tier}
              onChange={(e) =>
                setEdit({
                  ...edit,
                  tier: e.target.value as Property["tier"],
                })
              }
            >
              {["STANDARD", "POPULAR", "PREMIUM", "ICONIC"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Venta
            <select
              value={edit.sale}
              onChange={(e) =>
                setEdit({
                  ...edit,
                  sale: e.target.value as Property["sale"],
                })
              }
            >
              <option value="rental">Venta directa</option>
              {(AUCTIONS_ENABLED || edit.sale === "auction") && (
                <option value="auction">Subasta</option>
              )}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Inventario
            <select
              value={edit.inventory || "normal"}
              onChange={(e) =>
                setEdit({
                  ...edit,
                  inventory: e.target.value as Property["inventory"],
                  price: e.target.value === "skyscraper" ? 200 : 3,
                })
              }
            >
              <option value="normal">Solar normal · edificios desde 3 €</option>
              <option value="skyscraper">
                Rascacielos · inventario premium
              </option>
              {edit.inventory === "public" && (
                <option value="public">Edificio público</option>
              )}
            </select>
          </label>
          {edit.inventory === "skyscraper" && (
            <label>
              Disponibilidad
              <select
                value={
                  edit.reservedForBrands
                    ? edit.premiumNote === "auction_soon"
                      ? "soon"
                      : "reserved"
                    : "available"
                }
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    reservedForBrands: e.target.value !== "available",
                    premiumNote:
                      e.target.value === "soon"
                        ? "auction_soon"
                        : e.target.value === "reserved"
                          ? "major_brands"
                          : undefined,
                  })
                }
              >
                <option value="available">Disponible</option>
                <option value="reserved">Reservado para grandes marcas</option>
                {(AUCTIONS_ENABLED || edit.premiumNote === "auction_soon") && (
                  <option value="soon">Subasta próximamente</option>
                )}
              </select>
            </label>
          )}
        </div>
        <div className="form-row">
          {(["x", "z"] as const).map((k) => (
            <label key={k}>
              {k}
              <input
                type="number"
                step=".1"
                value={edit[k]}
                onChange={(e) =>
                  setEdit({ ...edit, [k]: Number(e.target.value) })
                }
              />
            </label>
          ))}
        </div>
        <div className="form-row">
          {(["width", "depth", "rotation"] as const).map((k) => (
            <label key={k}>
              {k}
              <input
                type="number"
                step=".1"
                value={edit[k]}
                onChange={(e) =>
                  setEdit({ ...edit, [k]: Number(e.target.value) })
                }
              />
            </label>
          ))}
        </div>
        <label>
          Color
          <input
            type="color"
            value={edit.color}
            onChange={(e) => setEdit({ ...edit, color: e.target.value })}
          />
        </label>
        {edit.inventory === "skyscraper" ? (
          <label>
            Precio premium (€, pago único)
            <input
              type="number"
              required
              min="1"
              step=".01"
              value={edit.price || ""}
              onChange={(e) =>
                setEdit({ ...edit, price: Number(e.target.value) })
              }
            />
          </label>
        ) : (
          <p className="field-hint">
            Solares normales, pago único: STARTER 3 € · PLUS 7 € · PRO 15 € ·
            PREMIUM 30 € · LANDMARK 60 €.
          </p>
        )}
        <div className="form-row">
          <label>
            Visibilidad
            <select
              value={String(edit.enabled)}
              onChange={(e) =>
                setEdit({ ...edit, enabled: e.target.value === "true" })
              }
            >
              <option value="true">Activo</option>
              <option value="false">Desactivado</option>
            </select>
          </label>
          <label>
            Ubicación destacada
            <select
              value={String(edit.featured)}
              onChange={(e) =>
                setEdit({ ...edit, featured: e.target.value === "true" })
              }
            >
              <option value="false">No</option>
              <option value="true">Sí</option>
            </select>
          </label>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button coral wide" disabled={busy}>
          Guardar solar
        </button>
      </form>
      {edit.id &&
        edit.inventory !== "public" &&
        !data.buildings?.some((b) => b.propertyId === edit.id) && (
          <AssignBuilding
            property={edit}
            action={action}
            busy={busy}
            onDone={() => setEdit(null)}
          />
        )}
    </Modal>
  );
}

/**
 * City Hall builds on a free plot without a payment: any size (skyscraper plots get their
 * tower), with the full brand. It never counts as a purchase; Top marcas can feature it apart.
 */
function AssignBuilding({
  property,
  action,
  busy,
  onDone,
}: {
  property: Property;
  action: (body: unknown) => Promise<boolean>;
  busy: boolean;
  onDone: () => void;
}) {
  const sky = property.inventory === "skyscraper";
  const [ad, setAd] = useState<Ad>({ ...emptyAd });
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<PresenceTier>("STARTER");
  const [ranking, setRanking] = useState<"featured" | "hidden">("featured");
  return (
    <form
      className="manual-assignment"
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          await action({
            action: "assign-building",
            propertyId: property.id,
            email,
            ad,
            tier,
            ranking,
          })
        )
          onDone();
      }}
    >
      <h3>
        {sky ? "Asignar a una gran marca" : "Montar un edificio sin pago"}
      </h3>
      <p className="field-hint">
        Lo construye el Ayuntamiento: no se registra ningún pago y nunca aparece
        como compra. Empieza sin valor y con la protección habitual; después
        cualquiera puede quedarse la ubicación pagando.
      </p>
      {!sky && (
        <label>
          Tamaño del edificio
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as PresenceTier)}
          >
            {PRESENCE_TIERS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      )}
      <label>
        Email del anunciante
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <small className="field-hint">
        Con este email podrá editar la marca desde Mis edificios.
      </small>
      <AdFields ad={ad} onChange={setAd} tier={sky ? "SKYSCRAPER" : tier} />
      <label>
        En Top marcas
        <select
          value={ranking}
          onChange={(e) => setRanking(e.target.value as "featured" | "hidden")}
        >
          <option value="featured">Destacada por SkyCity (sin importe)</option>
          <option value="hidden">No mostrar</option>
        </select>
      </label>
      <button
        className="button outline wide"
        disabled={busy || ad.brand.trim().length < 2}
      >
        {sky ? "Asignar rascacielos" : "Montar edificio"}
      </button>
    </form>
  );
}
