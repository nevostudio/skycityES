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
      <h2>
        {admin ? "Bienvenido al Ayuntamiento." : "Tus edificios. Un enlace."}
      </h2>
      <p>
        {admin
          ? "Introduce tu email de administrador para gestionar la ciudad."
          : "Introduce el email con el que construiste tu edificio. Te enviaremos un enlace seguro a tu rincón de SkyCity."}
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
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={admin && demo ? "admin@skycity.demo" : "tu@email.com"}
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
              Envíame un enlace de acceso
              <ArrowRight size={17} />
            </>
          )}
        </button>
        <p className="microcopy">Sin contraseñas. Sin pasos extra.</p>
      </form>
      {message && (
        <div className="demo-access" role="status">
          {message}
          {link && <a href={link}>Abrir enlace de acceso demo →</a>}
        </div>
      )}
      {demo && (
        <div className="demo-access">
          MODO DEMO · El envío de correos es simulado.{" "}
          {admin
            ? "Usa admin@skycity.demo para el Ayuntamiento."
            : "Prueba hello@skycity.demo para ver las marcas de ejemplo, o usa el email de tu compra."}
        </div>
      )}
    </div>
  );
}
