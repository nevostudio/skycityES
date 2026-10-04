import type { Property, State } from "@/types";

/**
 * Curated launch inventory. These are seed choices, not runtime limits: City Hall can add,
 * reactivate or rezone as many plots as future districts need.
 */
export const INITIAL_NORMAL_PLOTS: Record<string, readonly number[]> = {
  downtown: [1, 2, 4, 7, 9, 15, 17, 21, 23, 25, 26, 27, 28, 29, 30],
  "business-district": [31, 34, 36, 38, 41, 42, 44, 48, 56, 59],
  "tech-district": [61, 64, 66, 69, 72, 74, 76, 78, 81, 85, 87, 90],
  "entertainment-district": [91, 94, 96, 99, 102, 105, 108, 110, 114, 118],
  "old-town": [121, 124, 125, 129, 132, 135, 138, 140, 142, 145, 148, 150],
  riverside: [151, 154, 156, 160, 162, 164, 168, 172, 176, 180],
  "residential-district": [
    181, 184, 186, 190, 192, 195, 198, 201, 204, 207, 210,
  ],
};

const launchNumbers = new Set(Object.values(INITIAL_NORMAL_PLOTS).flat());
export const isLaunchNormalPlot = (number: number) => launchNumbers.has(number);

/** Any historical or operational reference makes a plot ineligible for retirement. */
export function protectedPlotIds(s: State) {
  const ids = new Set<string>();
  for (const row of s.buildings || []) ids.add(row.propertyId);
  for (const row of s.leases) ids.add(row.propertyId);
  for (const row of s.reservations) ids.add(row.propertyId);
  for (const row of s.auctions) ids.add(row.propertyId);
  for (const row of s.activity) ids.add(row.propertyId);
  for (const row of s.analytics) if (row.propertyId) ids.add(row.propertyId);
  return ids;
}

/**
 * Existing cities keep every meaningful location. Redundant, untouched normal plots are only
 * deactivated, never deleted, so an administrator can reopen them for a future expansion.
 */
export function migrateInventory(s: State) {
  const settings = s.settings[0];
  if (settings.inventoryVersion === 1) return s;
  const protectedIds = protectedPlotIds(s);
  for (const p of s.properties) {
    if (protectedIds.has(p.id)) {
      p.enabled = true;
      continue;
    }
    if (p.inventory === "normal" && !isLaunchNormalPlot(p.number))
      p.enabled = false;
  }
  settings.inventoryVersion = 1;
  return s;
}

export const activeInventoryByDistrict = (properties: Property[]) =>
  properties.reduce<Record<string, number>>((counts, p) => {
    if (p.enabled && p.inventory !== "skyscraper")
      counts[p.districtId] = (counts[p.districtId] || 0) + 1;
    return counts;
  }, {});
