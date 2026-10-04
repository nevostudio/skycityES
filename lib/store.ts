import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import postgres from "postgres";
import { makeSeed } from "./seed";
import { migratePresence } from "./presence";
import { migrateBranding, migratePlots } from "./plots";
import { isDemo } from "./config";
import type { State } from "@/types";

const tableMap: Record<keyof State, string> = {
  properties: "properties",
  districts: "districts",
  leases: "leases",
  buildings: "buildings",
  reservations: "property_reservations",
  auctions: "auctions",
  bids: "bids",
  activity: "activity_feed",
  transactions: "transactions",
  analytics: "analytics_events",
  access: "access_tokens",
  mail: "email_outbox",
  settings: "platform_settings",
};
const globalDb = globalThis as unknown as {
  skySqlite?: DatabaseSync;
  skyPostgres?: ReturnType<typeof postgres>;
};
function localDb() {
  if (!globalDb.skySqlite) {
    const root =
      process.env.SKYCITY_DATA_DIR || path.join(process.cwd(), ".data");
    mkdirSync(root, { recursive: true });
    const db = new DatabaseSync(path.join(root, "skycity.sqlite"));
    db.exec(
      "PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS city_state (id INTEGER PRIMARY KEY, data TEXT NOT NULL)",
    );
    db.prepare("INSERT OR IGNORE INTO city_state VALUES (1, ?)").run(
      JSON.stringify(makeSeed()),
    );
    globalDb.skySqlite = db;
  }
  return globalDb.skySqlite;
}
function pg() {
  return (globalDb.skyPostgres ??= postgres(process.env.SUPABASE_DB_URL!, {
    prepare: false,
    max: 4,
    ssl: "require",
  }));
}
const isCurrent = (s: State) =>
  s.settings[0].pricingVersion === 1 &&
  s.settings[0].plotsVersion === 1 &&
  s.settings[0].brandingVersion === 1;
/** Versioned, additive migrations applied inside the write transaction. */
export const migrate = (s: State) =>
  migrateBranding(migratePlots(migratePresence(s)));
/** All economic writes serialize inside a database transaction. No browser state is authoritative. */
export async function transaction<T>(fn: (state: State) => T): Promise<T> {
  if (isDemo()) {
    const db = localDb();
    db.exec("BEGIN IMMEDIATE");
    try {
      const row = db
        .prepare("SELECT data FROM city_state WHERE id=1")
        .get() as { data: string };
      const state = migrate(JSON.parse(row.data) as State);
      const result = fn(state);
      db.prepare("UPDATE city_state SET data=? WHERE id=1").run(
        JSON.stringify(state),
      );
      db.exec("COMMIT");
      return result;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  const result = await pg().begin(async (sql) => {
    await sql`SELECT pg_advisory_xact_lock(73659201)`;
    const state = {} as State;
    const before = new Map<string, string>();
    for (const key of Object.keys(tableMap) as (keyof State)[]) {
      const rows = await sql`SELECT data FROM ${sql(tableMap[key])}`;
      (state[key] as unknown[]) = rows.map((r) => r.data);
      for (const row of rows)
        before.set(`${key}:${row.data.id}`, JSON.stringify(row.data));
    }
    if (!state.settings.length) Object.assign(state, makeSeed(false));
    migrate(state);
    const out = fn(state);
    for (const key of Object.keys(tableMap) as (keyof State)[])
      for (const item of state[key]) {
        if (before.get(`${key}:${item.id}`) !== JSON.stringify(item))
          await sql`INSERT INTO ${sql(tableMap[key])} (id,data) VALUES (${item.id},${sql.json(item as never)}) ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data`;
      }
    return out;
  });
  return result as T;
}
export async function readState() {
  if (isDemo()) {
    const row = localDb()
      .prepare("SELECT data FROM city_state WHERE id=1")
      .get() as { data: string };
    const state = JSON.parse(row.data) as State;
    return isCurrent(state) ? state : transaction((s) => s);
  }
  return transaction((s) => s);
}
