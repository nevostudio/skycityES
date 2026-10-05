import { LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "Política de cookies" };

const COOKIES = [
  {
    name: "sb-…-auth-token",
    owner: "SkyCity (Supabase)",
    purpose:
      "Mantener tu sesión en «Mis edificios» después de abrir tu enlace de acceso.",
    duration: "Mientras dure la sesión",
    type: "Técnica, necesaria",
  },
  {
    name: "sb-…-auth-token-code-verifier",
    owner: "SkyCity (Supabase)",
    purpose: "Completar de forma segura el acceso con enlace por email.",
    duration: "Minutos",
    type: "Técnica, necesaria",
  },
  {
    name: "sc_…",
    owner: "SkyCity",
    purpose:
      "No contar dos veces la misma visita o clic en las estadísticas agregadas de la ciudad y de cada edificio.",
    duration: "30 minutos",
    type: "Medición propia, sin perfiles",
  },
];

export default function Page() {
  return (
    <LegalPage title="Cookies">
      <p>
        SkyCity usa muy pocas cookies, todas propias. No usamos cookies de
        publicidad ni de redes sociales, y no compartimos las cookies con
        terceros.
      </p>
      <div
        className="legal-table"
        role="region"
        aria-label="Cookies"
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              <th>Cookie</th>
              <th>Para qué</th>
              <th>Duración</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {COOKIES.map((c) => (
              <tr key={c.name}>
                <td>
                  <code>{c.name}</code>
                  <small>{c.owner}</small>
                </td>
                <td>{c.purpose}</td>
                <td>{c.duration}</td>
                <td>{c.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Pagos</h2>
      <p>
        Al pagar te llevamos a la página segura de Stripe, que usa sus propias
        cookies para procesar el pago y prevenir el fraude. Puedes consultarlas
        en la política de cookies de Stripe.
      </p>

      <h2>Cómo desactivarlas</h2>
      <p>
        Puedes bloquear o borrar las cookies desde la configuración de tu
        navegador. Si bloqueas las cookies técnicas no podrás entrar en «Mis
        edificios»; la ciudad seguirá funcionando con normalidad.
      </p>
    </LegalPage>
  );
}
