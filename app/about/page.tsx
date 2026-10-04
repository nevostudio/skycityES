import { Header } from "@/components/header";
import { isDemo } from "@/lib/config";
import Link from "next/link";
export const metadata = { title: "Una ciudad por construir" };
export default function Page() {
  return (
    <>
      <Header demo={isDemo()} />
      <main className="about-page">
        <span className="eyebrow">
          UNA CIUDAD PEQUEÑA. GRANDES POSIBILIDADES.
        </span>
        <h1>Una ciudad que se construye entre todos.</h1>
        <p>
          SkyCity es una ciudad virtual y explorable que empieza casi vacía:
          calles, parques, el río y solares esperando una idea. Cada edificio
          privado existe porque alguien compró su solar.
        </p>
        <h2>Elige un solar. Construye. Haz que crezca.</h2>
        <p>
          Elige un solar libre, decide el tamaño de tu edificio (STARTER 3 €,
          PLUS 7 €, PRO 15 €, PREMIUM 30 € o LANDMARK 60 €), añade tu marca y
          tus colores, y míralo levantarse. Es un pago único, sin renovaciones
          ni cargos recurrentes. Más adelante puedes mejorarlo pagando solo la
          diferencia: mismo solar, más altura.
        </p>
        <h2>Tu email es tu llave.</h2>
        <p>
          Sin formularios de registro ni contraseñas. Usa el email de tu compra
          para pedir un enlace seguro desde Mis edificios. Edita tu anuncio,
          consulta su actividad, mejora tu edificio o comparte tu dirección.
        </p>
        <h2>Un buen barrio empieza por buenos vecinos.</h2>
        <p>
          Debes tener permiso para usar los nombres, logos e imágenes de tu
          anuncio. El contenido ilegal, engañoso o dañino puede suspenderse. Un
          edificio en SkyCity es un espacio publicitario virtual, no una
          propiedad inmobiliaria ni una inversión.
        </p>
        {isDemo() && (
          <div className="inline-notice">
            Estás explorando una ciudad de demostración. Las marcas ficticias y
            su actividad están marcadas como demo. Los pagos y correos son
            simulados.
          </div>
        )}
        <Link href="/" className="button coral">
          Elige tu solar ↗
        </Link>
      </main>
    </>
  );
}
