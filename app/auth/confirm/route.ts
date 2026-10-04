import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { transaction } from "@/lib/store";
import { hash, token, DomainError } from "@/lib/engine";
import { isDemo, appUrl } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";
import { fail } from "@/lib/http";
export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    if (isDemo()) {
      const secret = token();
      await transaction((s) => {
        const link = s.access.find(
          (a) =>
            a.id === hash(u.searchParams.get("token") || "") &&
            a.kind === "link" &&
            !a.used &&
            Date.parse(a.expiresAt) > Date.now(),
        );
        if (!link)
          throw new DomainError(
            "This link has expired or has already been used.",
            403,
          );
        link.used = true;
        s.access.push({
          id: hash(secret),
          email: link.email,
          kind: "session",
          used: false,
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        });
      });
      (await cookies()).set("skycity-session", secret, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 604800,
        path: "/",
      });
    } else {
      const client = await supabaseServer();
      const code = u.searchParams.get("code");
      const token_hash = u.searchParams.get("token_hash");
      const result = code
        ? await client.auth.exchangeCodeForSession(code)
        : await client.auth.verifyOtp({
            token_hash: token_hash || "",
            type:
              u.searchParams.get("type") === "magiclink"
                ? "magiclink"
                : "email",
          });
      if (result.error)
        throw new DomainError("Your access link is invalid or expired.", 403);
    }
    return NextResponse.redirect(`${appUrl()}/my-buildings`);
  } catch (e) {
    return fail(e);
  }
}
