import { readState, transaction } from "./store";
import { isDemo, appUrl } from "./config";
import { createClient } from "@supabase/supabase-js";
export async function flushMail() {
  if (isDemo() || !process.env.RESEND_API_KEY)
    return { sent: 0, mode: "outbox" };
  let sent = 0;
  const pending = (await readState()).mail
    .filter((m) => m.status === "pending")
    .slice(0, 30);
  for (const m of pending) {
    // Generate once, persist before sending, and reuse the body on provider retries.
    if (m.id.startsWith("confirmation:") && !m.text.includes("token_hash=")) {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      );
      const { data, error } = await client.auth.admin.generateLink({
        type: "magiclink",
        email: m.email,
      });
      if (error) {
        console.error("Access email generation failed", m.id);
        continue;
      }
      m.text += `\n\nGestiona tu edificio de forma segura: ${appUrl()}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink`;
      await transaction((s) => {
        const saved = s.mail.find((x) => x.id === m.id);
        if (saved) saved.text = m.text;
      });
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": m.id,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [m.email],
        subject: m.subject,
        text: `${m.text}\n\nVisita SkyCity: ${appUrl()}/my-buildings`,
      }),
    });
    if (res.ok) {
      await transaction((s) => {
        const mail = s.mail.find((x) => x.id === m.id);
        if (mail) mail.status = "sent";
      });
      sent++;
    } else console.error("Email delivery failed", res.status, m.id);
  }
  return { sent, mode: "resend" };
}
