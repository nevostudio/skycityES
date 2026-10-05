import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Política de privacidad" };

export default function Page() {
  return (
    <LegalPage title="Privacidad">
      <h2>Responsable</h2>
      <p>
        {LEGAL.owner} ({LEGAL.taxId}), con domicilio en {LEGAL.address}.
        Contacto para cualquier cuestión de privacidad: {LEGAL.email}.
      </p>

      <h2>Qué datos tratamos</h2>
      <ul>
        <li>
          <strong>Tu email</strong>, cuando compras un edificio o pides un
          enlace de acceso a «Mis edificios». Es tu forma de identificarte: no
          usamos contraseñas. No se muestra públicamente.
        </li>
        <li>
          <strong>Los datos de tu marca</strong>: nombre, frase, descripción,
          colores, logo, imagen y enlaces a tu web y redes. Se publican en tu
          edificio y cualquier visitante puede verlos.
        </li>
        <li>
          <strong>Datos de tus compras</strong>: importe, fecha, edificio y el
          identificador del pago. Los datos de tu tarjeta los trata directamente
          Stripe; SkyCity nunca los ve ni los guarda.
        </li>
        <li>
          <strong>Datos técnicos</strong>: la dirección IP se usa de forma
          temporal para proteger el servicio frente a abusos, y nuestros
          proveedores de alojamiento guardan registros técnicos.
        </li>
        <li>
          <strong>Estadísticas agregadas</strong>: contamos visitas a la ciudad,
          aperturas de cada ficha y clics hacia la web de cada marca, como
          totales por día. No creamos perfiles de visitantes.
        </li>
      </ul>

      <h2>Para qué y con qué base legal</h2>
      <ul>
        <li>
          <strong>Prestarte el servicio</strong> que contratas: construir y
          mostrar tu edificio, darte acceso a «Mis edificios» y enviarte los
          emails necesarios (confirmación de compra, enlaces de acceso y aviso
          si tu ubicación cambia de manos). Base: ejecución del contrato.
        </li>
        <li>
          <strong>Cumplir obligaciones legales</strong>, como las contables y
          fiscales de cada pago. Base: obligación legal.
        </li>
        <li>
          <strong>Proteger el servicio y medir su uso</strong> de forma
          agregada, y ofrecer a cada anunciante las estadísticas de su edificio.
          Base: interés legítimo.
        </li>
      </ul>
      <p>
        No enviamos publicidad por email ni vendemos datos. Si algún día
        quisiéramos enviarte novedades, te pediríamos antes tu consentimiento.
      </p>

      <h2>Con quién se comparten</h2>
      <p>
        Solo con los proveedores que necesitamos para funcionar, que tratan los
        datos por cuenta de SkyCity:
      </p>
      <ul>
        <li>
          Supabase: base de datos y acceso por email (servidores en la UE).
        </li>
        <li>Vercel: alojamiento de la web.</li>
        <li>Stripe: procesamiento de los pagos.</li>
        <li>Resend: envío de los emails.</li>
        <li>Cloudflare: gestión del dominio.</li>
      </ul>
      <p>
        Algunos de estos proveedores pueden tratar datos fuera del Espacio
        Económico Europeo. En ese caso lo hacen con las garantías previstas por
        el RGPD, como las cláusulas contractuales tipo de la Comisión Europea o
        el Marco de Privacidad de Datos UE-EE. UU.
      </p>

      <h2>Cuánto tiempo</h2>
      <ul>
        <li>
          Los datos de tu marca y tu email, mientras tengas edificios en SkyCity
          o hasta que nos pidas que los borremos.
        </li>
        <li>
          Los datos de cada pago, durante los plazos que exige la ley (hasta
          seis años).
        </li>
        <li>
          Los enlaces de acceso caducan a los pocos minutos y son de un solo
          uso.
        </li>
        <li>Las estadísticas agregadas no contienen datos personales.</li>
      </ul>

      <h2>Tus derechos</h2>
      <p>
        Puedes pedir el acceso, la rectificación o la supresión de tus datos, y
        también oponerte a su tratamiento, limitarlo o pedir su portabilidad.
        Escríbenos a {LEGAL.email} desde el email con el que compraste. Si crees
        que no hemos atendido bien tu solicitud, puedes reclamar ante la Agencia
        Española de Protección de Datos (aepd.es).
      </p>
      <p>
        Puedes editar los datos de tu marca en cualquier momento desde «Mis
        edificios».
      </p>

      <h2>Edad</h2>
      <p>Para comprar en SkyCity debes ser mayor de edad.</p>
    </LegalPage>
  );
}
