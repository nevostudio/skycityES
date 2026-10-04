import { transaction } from "@/lib/store";
import { emailSchema } from "@/lib/validation";
import { token, hash } from "@/lib/engine";
import { isDemo, appUrl } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";
import { checkOrigin, fail, rateLimit } from "@/lib/http";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    rateLimit(`login:${req.headers.get("x-forwarded-for") || "local"}`, 8);
    const email = emailSchema.parse((await req.json()).email);
    if (isDemo()) {
      const secret = token();
      await transaction((s) => {
        s.access.push({
          id: hash(secret),
          email,
          kind: "link",
          used: false,
          expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
        });
      });
      return Response.json({
        demo: true,
        url: `/auth/confirm?token=${secret}`,
        message: "Demo mailbox: open your single-use access link below.",
      });
    }
    const { error } = await (
      await supabaseServer()
    ).auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${appUrl()}/auth/confirm` },
    });
    if (error) throw error;
    return Response.json({
      message: "Check your email for a secure access link.",
    });
  } catch (e) {
    return fail(e);
  }
}
