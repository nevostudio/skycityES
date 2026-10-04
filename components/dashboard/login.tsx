"use client";
import { useState } from "react";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { api } from "@/lib/client";
export function Login({
  demo,
  admin = false,
}: {
  demo: boolean;
  admin?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="auth-card">
      <div className="auth-icon">
        <Mail size={24} />
      </div>
      <h2>{admin ? "Welcome to City Hall." : "Your buildings. One link."}</h2>
      <p>
        {admin
          ? "Enter your administrator email to manage the city."
          : "Enter the email you used to claim a building. We’ll send you a secure link to your little corner of SkyCity."}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const r = await api<{ message: string; url?: string }>(
              "/api/auth/link",
              { email },
            );
            setMessage(r.message);
            setLink(r.url || "");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Email address
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={
              admin && demo ? "admin@skycity.demo" : "you@example.com"
            }
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button dark wide" disabled={busy}>
          {busy ? (
            <Loader2 className="spin" size={17} />
          ) : (
            <>
              Send me an access link
              <ArrowRight size={17} />
            </>
          )}
        </button>
        <p className="microcopy">No passwords. No extra steps.</p>
      </form>
      {message && (
        <div className="demo-access" role="status">
          {message}
          {link && <a href={link}>Open secure demo access link →</a>}
        </div>
      )}
      {demo && (
        <div className="demo-access">
          DEMO MODE · Email delivery is simulated.{" "}
          {admin
            ? "Use admin@skycity.demo for City Hall."
            : "Try hello@skycity.demo to view the seeded brands, or use your checkout email."}
        </div>
      )}
    </div>
  );
}
