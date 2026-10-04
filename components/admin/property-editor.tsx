"use client";
import type { Property, District } from "@/types";
import type { Dispatch, SetStateAction } from "react";
import { Modal } from "../modal";
import { emptyAd } from "@/lib/seed";
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
  data: { districts: District[] };
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
              disabled={edit.inventory !== "normal"}
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
              <option value="auction">Subasta</option>
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
                <option value="soon">Subasta próximamente</option>
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
      {edit.id && edit.inventory === "skyscraper" && (
        <form
          className="manual-assignment"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (
              await action({
                action: "assign-skyscraper",
                propertyId: edit.id,
                email: f.get("email"),
                ad: {
                  ...emptyAd,
                  brand: f.get("brand"),
                  website: f.get("website"),
                  primary: f.get("primary"),
                },
              })
            )
              setEdit(null);
          }}
        >
          <h3>Asignar a una gran marca</h3>
          <p className="field-hint">
            Construye el rascacielos sin registrar un pago. Los edificios, pagos
            y subastas en curso están protegidos.
          </p>
          <label>
            Nombre de la marca
            <input name="brand" required minLength={2} maxLength={40} />
          </label>
          <label>
            Email del anunciante
            <input name="email" type="email" required />
          </label>
          <label>
            Web
            <input name="website" type="url" placeholder="https://…" />
          </label>
          <label>
            Color de marca
            <input name="primary" type="color" defaultValue="#426d67" />
          </label>
          <button className="button outline wide" disabled={busy}>
            Asignar rascacielos
          </button>
          <p className="field-hint">
            Para abrir pujas, usa Ayuntamiento → Subastas.
          </p>
        </form>
      )}
    </Modal>
  );
}
