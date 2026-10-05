export function isDemo() {
  const liveKeys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_DB_URL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ];
  const configured = liveKeys.filter((k) => !!process.env[k]);
  const mode = process.env.SKYCITY_MODE;
  if (mode === "live" || (mode !== "demo" && configured.length)) {
    if (configured.length !== liveKeys.length)
      // Names only, never values: tells the deploy log which variable is missing.
      throw new Error(
        `Live setup incomplete. Missing: ${liveKeys.filter((k) => !configured.includes(k)).join(", ")}.`,
      );
    return false;
  }
  if (process.env.VERCEL && process.env.ALLOW_HOSTED_DEMO !== "true")
    throw new Error(
      "Set up live services or explicitly enable ALLOW_HOSTED_DEMO.",
    );
  return true;
}
export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
