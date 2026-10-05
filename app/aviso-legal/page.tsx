import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Aviso legal" };

export default function Page() {
  return (
    <LegalPage title="Aviso legal">
      <h2>Titular del sitio</h2>
      <p>
        En cumplimiento de la Ley 34/2002, de servicios de la sociedad de la
        información y de comercio electrónico (LSSI), te informamos de que{" "}
        {LEGAL.site} (en adelante, «SkyCity») es un servicio de:
      </p>
      <ul>
        <li>
          <strong>Titular:</strong> {LEGAL.owner}
        </li>
        <li>
          <strong>NIF/CIF:</strong> {LEGAL.taxId}
        </li>
        <li>
          <strong>Domicilio:</strong> {LEGAL.address}
        </li>
        <li>
          <strong>Email de contacto:</strong> {LEGAL.email}
        </li>
        {LEGAL.registry && (
          <li>
            <strong>Datos registrales:</strong> {LEGAL.registry}
          </li>
        )}
      </ul>

      <h2>Qué es SkyCity</h2>
      <p>
        SkyCity es una ciudad virtual en la que las marcas pueden construir un
        edificio con su nombre, logo y colores. Cada edificio es un espacio
        publicitario digital dentro de SkyCity: no es una propiedad
        inmobiliaria, ni un producto financiero, ni una inversión. Las
        condiciones de compra se detallan en las{" "}
        <a href="/condiciones">Condiciones de compra</a>.
      </p>

      <h2>Uso del sitio</h2>
      <p>
        Puedes explorar SkyCity libremente. Te comprometes a usarla de forma
        lícita y a no realizar acciones que dañen el servicio, como intentar
        acceder a zonas restringidas, automatizar compras de forma abusiva o
        interferir en el funcionamiento de la ciudad.
      </p>

      <h2>Contenido de las marcas</h2>
      <p>
        Los nombres, logos, imágenes, textos y enlaces que se muestran en los
        edificios los publican sus anunciantes, que son responsables de ellos y
        declaran tener los derechos necesarios. SkyCity no controla previamente
        todos los contenidos, pero retirará o suspenderá los que sean ilícitos
        en cuanto tenga conocimiento efectivo de ello. Puedes comunicarnos
        cualquier contenido inadecuado escribiendo a {LEGAL.email}.
      </p>
      <p>
        Los enlaces a webs y redes sociales de los anunciantes llevan a sitios
        de terceros, cuyo contenido y políticas no dependen de SkyCity.
      </p>

      <h2>Propiedad intelectual</h2>
      <p>
        El diseño, el código, la ciudad y sus ilustraciones son propiedad del
        titular o se usan con licencia. Las marcas y logos de los anunciantes
        pertenecen a sus respectivos titulares.
      </p>

      <h2>Responsabilidad</h2>
      <p>
        Trabajamos para que SkyCity esté siempre disponible, pero puede haber
        interrupciones por mantenimiento, actualizaciones o causas ajenas a
        nosotros. Lo que dicen los anuncios es responsabilidad de cada
        anunciante.
      </p>

      <h2>Ley aplicable</h2>
      <p>
        Este sitio se rige por la legislación española. Si eres consumidor,
        podrás acudir a los juzgados de tu domicilio.
      </p>
    </LegalPage>
  );
}
