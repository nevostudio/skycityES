import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Centro legal" };

const DOCUMENTS = [
  {
    href: "/condiciones",
    title: "Condiciones de compra",
    text: "Qué compras, precios, pago y cómo puede cambiar de manos una ubicación.",
  },
  {
    href: "/privacidad",
    title: "Privacidad",
    text: "Qué datos tratamos, para qué y cómo ejercer tus derechos.",
  },
  {
    href: "/cookies",
    title: "Cookies",
    text: "Las pocas cookies propias que usa SkyCity.",
  },
  {
    href: "/aviso-legal",
    title: "Aviso legal",
    text: "Titular del sitio, uso de la web y contenido de las marcas.",
  },
];

export default function Page() {
  return (
    <LegalPage title="Centro legal">
      <p>Todos los documentos de SkyCity en un solo lugar.</p>
      <ul className="legal-index">
        {DOCUMENTS.map((d) => (
          <li key={d.href}>
            <Link href={d.href}>
              <strong>{d.title}</strong>
              <span>{d.text}</span>
            </Link>
          </li>
        ))}
      </ul>
      <h2>Contacto</h2>
      <p>
        Para cualquier duda, reclamación o petición sobre tus datos, escribe a{" "}
        {LEGAL.email}.
      </p>
    </LegalPage>
  );
}
