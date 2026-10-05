import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";
import { PRESENCE, PRESENCE_TIERS } from "@/lib/presence";
import { SKYSCRAPER_PRICE } from "@/lib/plots";

export const metadata = { title: "Condiciones de compra" };

export default function Page() {
  return (
    <LegalPage title="Condiciones de compra" eyebrow="ANTES DE CONSTRUIR">
      <p>
        Estas condiciones regulan la compra de edificios en SkyCity, un servicio
        de su titular, identificado en el <a href="/aviso-legal">aviso legal</a>
        . Al pagar aceptas estas condiciones en la versión vigente en ese
        momento. Léelas con calma, sobre todo el apartado 5: explica cómo otra
        marca puede quedarse tu ubicación.
      </p>

      <h2>1. Qué compras</h2>
      <p>
        Compras el derecho a mostrar tu marca en un edificio de SkyCity, situado
        en una ubicación concreta de la ciudad (un «solar»). Es un espacio
        publicitario virtual dentro de SkyCity. No es una propiedad
        inmobiliaria, ni un activo financiero, ni una inversión, ni un token o
        NFT, y no da derecho a rentabilidad, reventa ni participación en
        SkyCity.
      </p>

      <h2>2. Precios</h2>
      <p>Cada tamaño de edificio tiene un precio de pago único:</p>
      <ul>
        {PRESENCE_TIERS.map((t) => (
          <li key={t}>
            <strong>{t}</strong>: {PRESENCE[t].price} €
          </li>
        ))}
        <li>
          <strong>Rascacielos</strong> (solo en los solares de rascacielos):{" "}
          {SKYSCRAPER_PRICE} €, salvo que su ficha indique otro precio.
        </li>
      </ul>
      <p>
        Todos los precios son finales, en euros y con el IVA incluido. No hay
        suscripciones ni renovaciones. Puedes hacer crecer tu edificio a un
        tamaño superior pagando solo la diferencia de precio. El importe final
        que pagas se muestra siempre antes de ir al pago.
      </p>

      <h2>3. Pago y confirmación</h2>
      <p>
        El pago se realiza a través de Stripe. Mientras completas el pago, el
        solar queda reservado para ti durante un tiempo limitado. El edificio se
        construye cuando Stripe confirma el pago, y te enviamos un email con la
        confirmación y un enlace de acceso a «Mis edificios».
      </p>

      <h2>4. Duración</h2>
      <p>
        Tu marca se muestra en el edificio mientras SkyCity esté en
        funcionamiento, salvo que otra marca pase a controlar la ubicación
        (apartado 5) o que el anuncio se suspenda por incumplir estas
        condiciones (apartado 6).
      </p>

      <h2>5. Cambio de manos de una ubicación («takeover»)</h2>
      <p>En SkyCity las ubicaciones pueden cambiar de manos. Funciona así:</p>
      <ul>
        <li>
          Cada ubicación tiene un <strong>valor actual</strong>: el último
          importe que se pagó para obtenerla. En los edificios que gestiona
          SkyCity, que se muestran como «Destacadas por SkyCity», es el valor de
          salida que fija SkyCity; su ficha indica que no hay pagos registrados.
        </li>
        <li>
          Después de comprar, tu ubicación queda{" "}
          <strong>protegida durante 24 horas</strong>, o durante el plazo que
          indique la ficha antes de pagar.
        </li>
        <li>
          Pasado ese plazo, cualquier persona puede pasar a controlar la
          ubicación pagando <strong>más que su valor actual</strong>, al menos 1
          € más (el importe mínimo se muestra en la ficha).
        </li>
        <li>
          Si eso ocurre, <strong>pierdes el control del edificio</strong> y tu
          marca deja de mostrarse. <strong>No recibes el reembolso</strong> de
          lo que pagaste <strong>ni ninguna compensación</strong>. Te avisaremos
          por email.
        </li>
        <li>
          El edificio conserva su tamaño, y la nueva marca se muestra en él. El
          importe que pagó pasa a ser el nuevo valor de la ubicación.
        </li>
        <li>
          Tú también puedes recuperar una ubicación, o quedarte la de otra
          marca, pagando más que su valor actual cuando no esté protegida.
        </li>
        <li>
          Si dos personas pagan a la vez por la misma ubicación, se la queda el
          primer pago confirmado. A la otra persona{" "}
          <strong>se le devuelve el importe íntegro</strong>.
        </li>
      </ul>
      <p>
        Las reglas de cada ubicación (protección, importe mínimo y si admite
        cambios de manos) se muestran en su ficha antes de pagar.
      </p>

      <h2>6. Contenido de tu marca</h2>
      <p>
        Eres responsable del contenido que publicas (nombre, logo, imágenes,
        textos y enlaces) y declaras tener los derechos necesarios. Nos das
        permiso para mostrarlo en SkyCity y en las vistas que se comparten de la
        ciudad, mientras controles el edificio.
      </p>
      <p>
        No se permite contenido ilegal, engañoso, ofensivo, sexual, violento,
        que incite al odio, que suplante a otra persona o marca, o que infrinja
        derechos de terceros. Podemos rechazar, ocultar o suspender un anuncio
        que incumpla estas normas. Si un anuncio se suspende por incumplirlas,
        no se devuelve el importe pagado.
      </p>

      <h2>7. Derecho de desistimiento</h2>
      <p>
        El edificio se construye y se muestra en la ciudad inmediatamente
        después del pago. Por eso, antes de pagar te pedimos que solicites
        expresamente esa ejecución inmediata y que reconozcas que, una vez
        construido el edificio, pierdes el derecho de desistimiento de 14 días,
        conforme al artículo 103 del Texto Refundido de la Ley General para la
        Defensa de los Consumidores y Usuarios.
      </p>

      <h2>8. Cambios en SkyCity</h2>
      <p>
        Podemos mejorar el aspecto de la ciudad y de los edificios (estilo,
        siluetas, colores o la forma de mostrar los logos) sin reducir el tamaño
        que compraste. Si algún día decidiéramos cerrar SkyCity, lo anunciaremos
        con al menos 30 días de antelación.
      </p>

      <h2>9. Garantías y responsabilidad</h2>
      <p>
        Tienes las garantías que la ley reconoce a los consumidores. Hacemos lo
        posible por mantener SkyCity disponible, pero puede haber interrupciones
        puntuales por mantenimiento o causas ajenas a nosotros.
      </p>

      <h2>10. Contacto y ley aplicable</h2>
      <p>
        Para cualquier duda o reclamación, escríbenos a {LEGAL.email}. Estas
        condiciones se rigen por la ley española. Si eres consumidor, podrás
        acudir a los juzgados de tu domicilio.
      </p>
    </LegalPage>
  );
}
