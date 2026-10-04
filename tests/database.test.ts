import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { makeSeed } from "../lib/seed";
test("Postgres migration, relational constraints and RLS isolate customer data", async () => {
  const db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{"email":"owner@example.com"}'::jsonb $$; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit integer,allowed_mime_types text[]);`,
  );
  for (const name of (await readdir("supabase/migrations")).sort())
    await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
  const s = makeSeed(false);
  await db.query("insert into districts(id,data) values($1,$2)", [
    s.districts[0].id,
    JSON.stringify(s.districts[0]),
  ]);
  await db.query("insert into properties(id,data) values($1,$2)", [
    s.properties[0].id,
    JSON.stringify(s.properties[0]),
  ]);
  const l = {
    id: "lease-test",
    propertyId: s.properties[0].id,
    email: "owner@example.com",
    status: "active",
    presenceTier: "PRO",
    upgradeHistory: [
      {
        reservationId: "r1",
        transactionId: "t1",
        from: "STARTER",
        to: "PRO",
        amount: 12,
        createdAt: "2026-10-04T12:00:00Z",
      },
    ],
  };
  await db.query("insert into leases(id,data) values($1,$2)", [
    l.id,
    JSON.stringify(l),
  ]);
  const b = {
    id: "bld-lease-test",
    propertyId: s.properties[0].id,
    leaseId: l.id,
    kind: "private",
    tier: "PRO",
    builtAt: "2026-10-04T12:00:00Z",
  };
  await db.query("insert into buildings(id,data) values($1,$2)", [
    b.id,
    JSON.stringify(b),
  ]);
  // One building per plot, and only known tiers.
  await assert.rejects(
    () =>
      db.query("insert into buildings(id,data) values($1,$2)", [
        "bld-2",
        JSON.stringify({
          ...b,
          id: "bld-2",
          leaseId: undefined,
          kind: "public",
        }),
      ]),
    /one_building_per_plot/,
  );
  await assert.rejects(
    () =>
      db.query("insert into buildings(id,data) values($1,$2)", [
        "bld-3",
        JSON.stringify({ ...b, id: "bld-3", tier: "MEGA" }),
      ]),
    /check/,
  );
  await assert.rejects(
    () =>
      db.query("insert into leases(id,data) values($1,$2)", [
        "duplicate",
        JSON.stringify({ ...l, id: "duplicate", email: "other@example.com" }),
      ]),
    /one_active_lease_per_property/,
  );
  await db.exec("grant usage on schema auth to authenticated; set role anon;");
  assert.equal((await db.query("select * from properties")).rows.length, 1);
  assert.equal((await db.query("select * from buildings")).rows.length, 1);
  await assert.rejects(
    () => db.query("update buildings set data='{}'"),
    /permission denied/,
  );
  await assert.rejects(
    () => db.query("select * from leases"),
    /permission denied/,
  );
  await assert.rejects(
    () => db.query("update properties set data='{}'"),
    /permission denied/,
  );
  await db.exec("reset role; set role authenticated;");
  assert.equal((await db.query("select * from leases")).rows.length, 1);
  assert.deepEqual(
    (await db.query<{ data: typeof l }>("select data from leases")).rows[0].data
      .upgradeHistory,
    l.upgradeHistory,
  );
  await assert.rejects(
    () => db.query("update leases set data='{}'"),
    /permission denied/,
  );
  await db.exec(
    `reset role; create or replace function auth.jwt() returns jsonb language sql as $$ select '{"email":"stranger@example.com"}'::jsonb $$; set role authenticated;`,
  );
  assert.equal((await db.query("select * from leases")).rows.length, 0);
  await db.close();
});
