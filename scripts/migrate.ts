import { readFile, readdir } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import postgres from "postgres";
loadEnvConfig(process.cwd());
async function main() {
  if (!process.env.SUPABASE_DB_URL)
    throw new Error("Set SUPABASE_DB_URL in .env.local");
  const sql = postgres(process.env.SUPABASE_DB_URL, {
    ssl: "require",
    prepare: false,
    max: 1,
  });
  try {
    await sql`CREATE TABLE IF NOT EXISTS public.skycity_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    await sql`ALTER TABLE public.skycity_migrations ENABLE ROW LEVEL SECURITY`;
    await sql`REVOKE ALL ON public.skycity_migrations FROM anon, authenticated`;
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      if (
        (
          await sql`SELECT name FROM public.skycity_migrations WHERE name=${name}`
        ).length
      )
        continue;
      const source = await readFile(`supabase/migrations/${name}`, "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(source);
        await tx`INSERT INTO public.skycity_migrations(name) VALUES(${name})`;
      });
      console.log("Applied:", name);
    }
  } finally {
    await sql.end();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
