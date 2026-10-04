import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { makeSeed, emptyAd } from "../lib/seed";
import { reserve, reserveTakeover, fulfill } from "../lib/engine";

test("Postgres: competing takeovers persist atomically; unique controller, payment, history and RLS constraints", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$select null::uuid$$; create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit integer,allowed_mime_types text[]);`,
    );
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    const now = Date.now();
    const s = makeSeed(false, now);
    s.settings[0].takeoverProtectionHours = 0;
    const p = s.properties[0];
    const ad = { ...emptyAd, brand: "SQL Brand" };
    const initial = reserve(
      s,
      { propertyId: p.id, email: "a@example.com", ad },
      true,
      now,
    ).reservation;
    const old = fulfill(s, initial.id, "initial", 3, "demo", now)!;
    const b = s.buildings.find((b) => b.propertyId === p.id)!;
    await db.transaction(async (tx) => {
      for (const [table, rows] of [
        ["districts", [s.districts[0]]],
        ["properties", [p]],
        ["leases", [old]],
        ["buildings", [b]],
        ["property_reservations", [initial]],
        ["transactions", s.transactions],
      ] as const)
        for (const row of rows)
          await tx.query(`insert into ${table}(id,data) values($1,$2)`, [
            row.id,
            JSON.stringify(row),
          ]);
    });
    const a = reserveTakeover(
      s,
      { propertyId: p.id, email: "b@example.com", ad, offerAmount: 5 },
      false,
      now,
    ).reservation;
    const c = reserveTakeover(
      s,
      { propertyId: p.id, email: "c@example.com", ad, offerAmount: 102 },
      false,
      now,
    ).reservation;
    for (const r of [a, c])
      await db.query(
        "insert into property_reservations(id,data) values($1,$2)",
        [r.id, JSON.stringify(r)],
      );
    assert.equal(
      (
        await db.query(
          "select * from property_reservations where status='reserved'",
        )
      ).rows.length,
      2,
    );
    const winner = fulfill(
      s,
      c.id,
      "cs_winner",
      102,
      "stripe",
      now,
      "pi_winner",
    )!;
    await db.transaction(async (tx) => {
      await tx.query("select id from properties where id=$1 for update", [
        p.id,
      ]);
      for (const [table, rows] of [
        ["properties", [p]],
        ["leases", [old, winner]],
        ["buildings", [b]],
        ["property_reservations", [c]],
        ["transactions", s.transactions],
        ["property_takeovers", s.propertyTakeovers],
      ] as const)
        for (const row of rows)
          await tx.query(
            `insert into ${table}(id,data) values($1,$2) on conflict(id) do update set data=excluded.data`,
            [row.id, JSON.stringify(row)],
          );
    });
    assert.equal(
      (await db.query("select * from leases where status='active'")).rows
        .length,
      1,
    );
    assert.equal(
      (
        await db.query<{ current_property_value: string }>(
          "select current_property_value from properties",
        )
      ).rows[0].current_property_value,
      "102",
    );
    const history = s.propertyTakeovers[0];
    await assert.rejects(
      () =>
        db.query("insert into property_takeovers(id,data) values($1,$2)", [
          "duplicate",
          JSON.stringify({ ...history, id: "duplicate" }),
        ]),
      /unique/,
    );
    await assert.rejects(
      () =>
        db.query("insert into leases(id,data) values($1,$2)", [
          "another",
          JSON.stringify({ ...winner, id: "another" }),
        ]),
      /one_active_lease_per_property/,
    );
    const extra = { ...a, id: "extra" };
    await db.query("insert into property_reservations(id,data) values($1,$2)", [
      extra.id,
      JSON.stringify(extra),
    ]);
    await assert.rejects(
      () =>
        db.query("insert into transactions(id,data) values($1,$2)", [
          "duplicate-pay",
          JSON.stringify({
            ...s.transactions.at(-1),
            id: "duplicate-pay",
            reservationId: extra.id,
          }),
        ]),
      /stripe_payment_id/,
    );
    fulfill(s, a.id, "cs_loser", 5, "stripe", now + 1, "pi_loser");
    await db.transaction(async (tx) => {
      for (const [table, rows] of [
        ["property_reservations", [a]],
        ["transactions", [s.transactions.at(-1)!]],
        ["property_takeovers", [s.propertyTakeovers.at(-1)!]],
      ] as const)
        for (const row of rows)
          await tx.query(
            `insert into ${table}(id,data) values($1,$2) on conflict(id) do update set data=excluded.data`,
            [row.id, JSON.stringify(row)],
          );
    });
    assert.equal(
      (
        await db.query(
          "select * from property_takeovers where status='refund_pending'",
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "select * from property_reservations where status='conflict'",
        )
      ).rows.length,
      1,
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(
        () => db.query("select * from property_takeovers"),
        /permission denied/,
      );
      await assert.rejects(
        () => db.query("update properties set data='{}'"),
        /permission denied/,
      );
      await db.exec("reset role");
    }
  } finally {
    await db.close();
  }
});
