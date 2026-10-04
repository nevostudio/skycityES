import { cookies } from "next/headers";
import { isDemo } from "./config";
import { readState } from "./store";
import { hash, DomainError } from "./engine";
import { supabaseServer } from "./supabase/server";
export async function identity() {
  if (isDemo()) {
    const value = (await cookies()).get("skycity-session")?.value;
    if (!value) return null;
    const s = await readState();
    const access = s.access.find(
      (a) =>
        a.id === hash(value) &&
        a.kind === "session" &&
        Date.parse(a.expiresAt) > Date.now(),
    );
    return access
      ? { email: access.email, admin: access.email === "admin@skycity.demo" }
      : null;
  }
  const {
    data: { user },
  } = await (await supabaseServer()).auth.getUser();
  if (!user?.email) return null;
  return {
    email: user.email.toLowerCase(),
    admin: (process.env.ADMIN_EMAILS || "")
      .toLowerCase()
      .split(",")
      .map((e) => e.trim())
      .includes(user.email.toLowerCase()),
  };
}
export async function requireIdentity(admin = false) {
  const user = await identity();
  if (!user)
    throw new DomainError("Request a secure access link to continue.", 401);
  if (admin && !user.admin)
    throw new DomainError("Administrator access required.", 403);
  return user;
}
