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
  data: { districts: District[]; settings: { durations: number[] } };
  action: (body: unknown) => Promise<boolean>;
  error: string;
  busy: boolean;
}) {
  return (
    <Modal
      title={edit.id ? "EDIT THE NEIGHBORHOOD" : "MAKE ROOM FOR A NEW IDEA"}
      onClose={() => setEdit(null)}
    >
      <h2>{edit.id ? edit.name : "New building"}</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await action({ action: "property", property: edit }))
            setEdit(null);
        }}
      >
        <label>
          Building name
          <input
            required
            value={edit.name}
            onChange={(e) => setEdit({ ...edit, name: e.target.value })}
          />
        </label>
        <div className="form-row">
          <label>
            District
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
            Type
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
            Location category
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
            Placement
            <select
              value={edit.sale}
              onChange={(e) =>
                setEdit({
                  ...edit,
                  sale: e.target.value as Property["sale"],
                })
              }
            >
              <option value="rental">Rental</option>
              <option value="auction">Auction</option>
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Inventory
            <select
              value={edit.inventory || "normal"}
              onChange={(e) =>
                setEdit({
                  ...edit,
                  inventory: e.target.value as Property["inventory"],
                  prices: { "30": e.target.value === "skyscraper" ? 200 : 3 },
                })
              }
            >
              <option value="normal">Normal · presence tiers from €3</option>
              <option value="skyscraper">
                Exclusive skyscraper · limited inventory
              </option>
            </select>
          </label>
          {edit.inventory === "skyscraper" && (
            <label>
              Availability
              <select
                value={edit.reservedForBrands ? "reserved" : "available"}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    reservedForBrands: e.target.value === "reserved",
                  })
                }
              >
                <option value="available">Available</option>
                <option value="reserved">Reserved for major brands</option>
              </select>
            </label>
          )}
        </div>
        <div className="form-row">
          {(["x", "z", "height"] as const).map((k) => (
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
          Building color
          <input
            type="color"
            value={edit.color}
            onChange={(e) => setEdit({ ...edit, color: e.target.value })}
          />
        </label>
        <div className="form-row">
          {(edit.inventory === "skyscraper"
            ? data.settings.durations
            : [30]
          ).map((d) => (
            <label key={d}>
              € / {d} days
              <input
                type="number"
                required
                disabled={edit.inventory !== "skyscraper"}
                min="1"
                step=".01"
                value={edit.prices[String(d)] || ""}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    prices: {
                      ...edit.prices,
                      [String(d)]: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
        {edit.inventory !== "skyscraper" && (
          <p className="field-hint">
            All normal locations: Starter €3 · Plus €7 · Pro €15 · Premium €30 ·
            Landmark €60, for 30 days.
          </p>
        )}
        <div className="form-row">
          <label>
            Visibility
            <select
              value={String(edit.enabled)}
              onChange={(e) =>
                setEdit({ ...edit, enabled: e.target.value === "true" })
              }
            >
              <option value="true">Active</option>
              <option value="false">Deactivated</option>
            </select>
          </label>
          <label>
            Featured location
            <select
              value={String(edit.featured)}
              onChange={(e) =>
                setEdit({ ...edit, featured: e.target.value === "true" })
              }
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </label>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button coral wide" disabled={busy}>
          Save property
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
                days: Number(f.get("days")),
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
          <h3>Assign to a major brand</h3>
          <p className="field-hint">
            Manual placement. No payment is recorded. Existing leases, checkouts
            and live auctions are protected.
          </p>
          <label>
            Brand name
            <input name="brand" required minLength={2} maxLength={40} />
          </label>
          <label>
            Advertiser email
            <input name="email" type="email" required />
          </label>
          <label>
            Website
            <input name="website" type="url" placeholder="https://…" />
          </label>
          <div className="form-row">
            <label>
              Brand color
              <input name="primary" type="color" defaultValue="#426d67" />
            </label>
            <label>
              Assignment days
              <input
                name="days"
                type="number"
                min={1}
                max={365}
                defaultValue={30}
                required
              />
            </label>
          </div>
          <button className="button outline wide" disabled={busy}>
            Assign skyscraper
          </button>
          <p className="field-hint">
            To open bidding, use City Hall → Auctions.
          </p>
        </form>
      )}
    </Modal>
  );
}
