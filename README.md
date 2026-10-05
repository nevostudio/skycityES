# SkyCity

Una ciudad virtual explorable que empieza casi vacía y **se construye según entran usuarios**: cada edificio privado existe porque alguien compró su solar. Pago único, sin registro previo, contraseñas para compradores, blockchain ni promesas de inversión.

## Solares y edificios (fase 1)

- **Solar** (`properties`) = la ubicación. **Edificio** (`buildings`) = lo que se construye encima. Un solar disponible no tiene edificio.
- Flujo: explorar → elegir solar → **CONSTRUIR AQUÍ** → tamaño → personalizar → email → pago → construcción animada (~1,6 s) → el edificio aparece → compartir.
- Tamaños de pago único: **STARTER 3 €** (1–2 plantas), **PLUS 7 €** (2–3), **PRO 15 €** (3–5), **PREMIUM 30 €** (5–8) y **LANDMARK 60 €** (gran edificio, nunca de altura de rascacielos).
- Mejora en el mismo solar pagando solo la diferencia (STARTER → PRO = 12 €); el edificio crece con la misma animación.
- Estados: solar `available` · `reserved` · `claimed` · `auction` · `public`; edificio `EMPTY` · `CONSTRUCTING` · `BUILT`; tiers `STARTER` · `PLUS` · `PRO` · `PREMIUM` · `LANDMARK` · `SKYSCRAPER`.
- Los **rascacielos** son inventario premium (200 €+): de momento se muestran como parcelas en obra con grúa, reservadas para grandes marcas, con subasta próximamente o en subasta.
- Edificios iniciales: 6 públicos (SkyCity HQ, NevoStudio, Ayuntamiento, Estación Central, Museo y Biblioteca) y, solo en demo, 4 marcas ficticias (Nova Labs, Pixel Coffee, Green Market y Moonlight Club).
- Migración versionada (`plotsVersion`, `lib/plots.ts`): los leases activos pasan a edificios construidos y permanentes; los solares libres quedan vacíos; los anuncios demo sobrantes se retiran (marcados, no borrados). Usuarios, transacciones, pujas, subastas y analítica no cambian. En Postgres, aplica `supabase/migrations/20261004190000_plots_buildings.sql` con `npm run db:migrate`.

## Inventario inicial y escasez

- Una ciudad nueva empieza con **88 ubicaciones activas**: 80 solares normales o públicos y 8 oportunidades premium. Los solares normales se distribuyen entre Centro (15), Distrito Tecnológico (12), Distrito Financiero (10), Zona de Entretenimiento (10), Riverside (10), Casco Antiguo (12) y Zona Residencial (11).
- La migración versionada (`inventoryVersion`, `lib/inventory.ts`) desactiva únicamente solares normales redundantes que siguen libres y no tienen actividad. Nunca borra registros ni desactiva ubicaciones relacionadas con edificios, propietarios, reservas, transacciones, subastas, pujas o analítica.
- Los huecos liberados se integran en la ciudad como jardines, pequeñas plazas y aparcamientos. La configuración conserva calles, esquinas, primera línea y ubicaciones de escaparate para mejorar la separación y lectura de los carteles.
- El límite de 80 solares normales solo define el lanzamiento inicial. City Hall puede crear ubicaciones, reactivar solares, cambiar su barrio o tipo, convertirlos en inventario premium y abrir nuevas zonas sin un límite fijo en tiempo de ejecución.
- Los indicadores públicos se calculan desde las ubicaciones activas y los edificios reales. La reducción no necesita una migración SQL adicional porque `properties` y las versiones viven dentro del estado persistido existente.

## Escaparate y legibilidad

- La home abre sobre un **escaparate curado** (`lib/showcase.ts`): la primera línea del Centro frente al bulevar, unas 15–25 parcelas a 1920×1080, con HQ y la Torre Central como skyline. El resto de la ciudad sigue disponible con arrastre y zoom; «Restablecer cámara» vuelve al escaparate.
- El bulevar (entre Centro y Zona Residencial) tiene calzadas más anchas, mediana arbolada y farolas dobles.
- En ciudades nuevas, NevoStudio, Pixel Coffee, Moonlight Club y Green Market están en primera línea, con Nova Labs detrás. Las alturas bajan hacia el lado de la cámara para que ningún edificio tape el cartel de otro, y hay solares libres entre ellos. Las ciudades existentes no mueven ningún edificio.
- Jerarquía visual: edificios con marca (tinte de su color, contorno, pilastra de acento y cartel grande) → edificios públicos y premium → calles → solares libres. Los solares son discretos y solo destacan al pasar el ratón o al buscar solar libre («Construir desde 3 €»).

## Marca y carteles de azotea (fase 2)

- Cada edificio comprado muestra su marca con un **cartel físico en la azotea** (postes, marco y cara con textura): logo, nombre y frase corta opcional. El nombre aparece una sola vez; si el logo es horizontal, sustituye al nombre.
- El cartel crece con el tier (STARTER pequeño → LANDMARK grande e iluminado), no supera 1,3 veces el ancho de la cubierta y se limita a la mitad del hueco con el vecino más cercano de su fila (`lib/branding.ts`). Está girado hacia la vista principal para leerse a media distancia.
- Imagen publicitaria opcional en **valla lateral** (desde PLUS), **fachada parcial** (desde PRO), fachada completa (desde PREMIUM) y pantalla vertical (desde LANDMARK). Sin imagen, la valla lateral muestra solo el logo.
- Subidas (`/api/upload`, `lib/images.ts`): PNG, JPG o WebP de hasta 2 MB, firma real y MIME coherente, una sola imagen (no animada), 32–4096 px para logos y 200–6000 px para imágenes, proporción máxima 8:1. Se recodifican con `sharp` a WebP (512 px para logos, 1600 px para imágenes), conservando la transparencia y eliminando metadatos. En producción se guardan en Supabase Storage con la clave de servicio solo en el servidor.
- Texturas: un canvas por contenido, compartido y con recuento de referencias; se liberan al desmontar y nunca se crean por frame. Las imágenes se cargan una vez y se reducen antes de usarse.
- **Mis edificios → Editar marca**: nombre, frase, web, logo, color de acento, fondo del cartel e imagen publicitaria con su soporte, con vista previa del cartel.
- NevoStudio es el ejemplo de referencia (`public/brands/`): wordmark transparente, acento `#ff4b00` y la frase «Encuentra tus próximos anunciantes».

## Rediseño visual (PDF «Rediseño visual de SkyCity»)

- Sistema visual: tinta `#17322A`, crema `#FBF8F1`, arena `#F3EEE3`, naranja `#E8663A` (solo selección, directo, pagos y acciones clave) y salvia `#7FA36F`. Bricolage Grotesque para títulos, cifras y carteles; Instrument Sans para la interfaz. Ambas se autoalojan con `next/font` (sin peticiones a Google desde el navegador). Los estilos nuevos viven en `app/redesign.css`, cargado al final.
- Ciudad-diorama a pantalla completa con interfaz flotante mínima: arriba solo el logo, las métricas de ciudad, «Construir desde 3 €» y el selector de barrio; Top marcas, controles del mapa y contadores discretos. Subastas y Mis edificios siguen disponibles en `/auctions` y `/my-buildings`, sin acceso desde la portada. Suelo crema, parques salvia, árboles pequeños, nombres de barrio pintados en la calle y parcelas premium con el volumen futuro en línea discontinua.
- Jerarquía: edificios construidos → premium/públicos → infraestructura → solares. Los solares en reposo son casi invisibles; el «+» aparece al pasar el ratón o al buscar solar libre (`/?available=1`).
- Edificios (`lib/massing.ts`, `components/city/architecture.tsx`): STARTER/PLUS/PRO una caja; PREMIUM zócalo + cuerpo retranqueado; LANDMARK zócalo + torre de vidrio con remate de marca. Barrios: Centro comercial, Financiero vidrio con planta baja oscura, Tecnológico vidrio claro con franja de color, Ocio fachada de color con pantalla, Casco Antiguo tejado a dos aguas con cartel en fachada, Ribera cubierta verde.
- Regla de marca: un elemento principal (cartel de azotea con postes, o en fachada en Casco Antiguo) y un secundario opcional según tier y barrio: imagen publicitaria, lona vertical, pantalla, franja o toldo.
- Panel lateral de 408 px (`components/property/property-panel.tsx`): marca, «TIER · Barrio», visitas, valor actual, historial de valor en escalera con pagos reales (compra inicial y takeovers completados) y CTA «Hacerme con este edificio» con el mínimo real. En solares libres: precio, «CONSTRUIR AQUÍ» y vista previa de los cinco tiers. En móvil es una hoja inferior.
- Checkout en tres pasos (Tamaño → Marca → Pago) con vista previa del edificio con tu marca; las mejoras omiten «Marca» y los takeovers omiten «Tamaño». Misma lógica y endpoints.

## Takeover automático (fase 3)

- Cada solar guarda `current_property_value`: el último importe real pagado por controlarlo (claim inicial o takeover). Las mejoras de tamaño no cambian ese valor.
- Cualquiera puede ofrecer más que el valor actual (incremento mínimo configurable, 1 € por defecto; nunca menos que construir en un solar libre). Si paga, pasa a controlar la ubicación automáticamente: sin aceptar, rechazar ni poner en venta.
- SkyCity se queda el pago completo. El anterior controlador no recibe dinero, créditos ni compensación; recibe el aviso «Tu edificio de SkyCity ha cambiado de manos.».
- El edificio, su altura y su tier se conservan; el nuevo controlador cambia la marca. Antes de pagar se muestran «Controlarás esta ubicación mientras nadie supere el importe que has pagado.» y «Si otra persona supera el valor actual, pasará automáticamente a controlar esta ubicación.».
- Tras un claim o un takeover la ubicación queda PROTEGIDA durante `TAKEOVER_PROTECTION_HOURS` (24 h por defecto; el Ayuntamiento puede cambiarlo).
- Excluidos: edificios públicos (incluido SkyCity HQ), solares reservados, rascacielos, subastas y propiedades bloqueadas. `takeover_enabled` y el bloqueo manual solo los cambia un administrador.
- Historial en `property_takeovers` (controlador anterior y nuevo, valor anterior, importe, pago de Stripe, estado y fecha) y contadores `last_takeover_amount`, `last_takeover_at` y `takeover_count` en el solar.

### Concurrencia y pagos

- Cada checkout de takeover guarda el controlador, el valor y la versión de control esperados. Varios aspirantes pueden pagar a la vez; al liquidar, el servidor revalida dentro de la transacción (bloqueo de filas `FOR UPDATE` en PostgreSQL, transacción `IMMEDIATE` en SQLite) el controlador, el valor, la versión, la protección, los interruptores y el importe.
- Solo el primer pago válido gana. Un pago que llega tarde queda en `conflict`, nunca sobrescribe al ganador y se **devuelve íntegramente**: el reembolso se registra antes de llamar a Stripe y se reintenta desde el webhook o el cron, con clave de idempotencia y búsqueda por metadatos.
- El control solo se transfiere desde el backend tras un pago verificado (webhook firmado o sesión consultada a Stripe en el cron); `success_url` solo muestra el estado. Restricciones SQL: un controlador activo por solar, un edificio por lease, `stripe_payment_id` único y comprobaciones de importe y estado en el historial.
- Migración: `supabase/migrations/20261004192421_automatic_property_takeovers.sql` y `migrateTakeovers` (versión `takeoverVersion`), que recupera el valor desde el pago de adquisición registrado. Sin pago verificable (demo o asignación manual) el valor queda en 0 € para revisión, y el mínimo de takeover nunca baja del precio de construir.

## Ejecutar

Requisitos: Node.js **22.13+** (recomendado 24 LTS) y npm.

```sh
npm install
npm run dev
```

Abrir **http://localhost:3000**. No hacen falta claves ni servicios externos para el modo demo.

```sh
npm run typecheck
npm test
npm run build
npm start
```

## Lo que funciona

- Ciudad WebGL urbanizada con **88 ubicaciones activas de lanzamiento**, siete barrios, calles, cruces, aceras, parques, río, puentes, farolas y mobiliario. Solo se renderizan los edificios que existen; los solares vacíos se dibujan en cuatro `InstancedMesh` compartidos (bordillo, tierra, estacas y «+»). Ventanas, árboles y el relleno urbano también están instanciados.
- Ciudad a pantalla completa bajo una barra de 68 px, sin sidebar ni tarjetas debajo del mapa. Búsqueda flotante, barrios desplegables, directorio y controles superpuestos.
- Cámara ortográfica a escala de barrio: arrastrar para desplazar, rueda/pellizco para zoom y botón derecho/dos dedos para rotar. Al seleccionar, la cámara se acerca y los edificios cercanos se atenúan para despejar la vista. Ficha flotante en escritorio y panel inferior en móvil.
- Marcas integradas mediante un rótulo principal y una superficie secundaria con logo, sin repetir el nombre por todas las fachadas. Pixel Coffee usa madera, vidrio cálido y terraza; Moonlight Club, neón violeta y una pulsación lenta; Green Market, cubierta plantada, toldo a rayas y vegetación. Los anunciantes propios conservan sus colores, logo, banner y estilo de cartel.
- Sin etiquetas flotantes permanentes para marcas o disponibilidad: los disponibles llevan un pequeño + tridimensional, contorno sutil y precio al pasar el cursor. Las subastas combinan fachada oscura, remates dorados y un distintivo que se oculta al seleccionar otra propiedad.
- Vista inicial de escritorio un 50 % más cercana (zoom 27), enfoque animado de unos 950 ms al seleccionar y contorno dorado ajustado al edificio. Arrastrar interrumpe la transición; cerrar una ficha conserva la posición de exploración.
- Hero compacto, paletas y mobiliario diferenciados por barrio, paseo de madera junto al río, seis coches lentos y una pequeña embarcación con movimiento ambiental. La preferencia del sistema de movimiento reducido detiene las animaciones ambientales y hace inmediato el enfoque de cámara. El mobiliario urbano utiliza instancias compartidas.
- Búsqueda por edificio, número, marca o barrio; filtros de disponibilidad, precio, subasta y categoría; directorio accesible mediante teclado.
- **Explorar → seleccionar → personalizar → email → checkout → anuncio activo → compartir**.
- Edificios de pago único en cinco tamaños, mejora pagando la diferencia y reservas exclusivas durante el pago. Sin alquileres ni renovaciones.
- Nombre, logo, banner, descripción, web, redes, código promocional, CTA, colores y estilo del cartel. Carga de PNG/JPEG/WebP hasta 2 MB. Las imágenes externas requieren HTTPS; los logos remotos necesitan CORS para aparecer en una textura WebGL. Si no lo permiten, se conserva el nombre de la marca en el cartel.
- Mis edificios con enlaces de acceso de un solo uso, edición de anuncios, mejora del edificio, compartir y métricas agregadas.
- Subastas con pujas validadas en servidor, historial, contador basado en una fecha persistida, avisos y adjudicación.
- Ayuntamiento (`/admin`): solares, ubicaciones, precio premium de rascacielos, tipos, categorías, destacados, barrios, edificios y anuncios, moderación, subastas, pujas, clientes, transacciones, correos y ajustes.
- URLs públicas renderizadas en servidor, metadata, canonical, sitemap, robots y tarjetas Open Graph PNG de 1200 × 630.

## Modo demo

Se activa sin variables. También puede fijarse con `SKYCITY_MODE=demo`. Los datos viven en **`.data/skycity.sqlite`**, con WAL, transacciones y persistencia entre reinicios. Los archivos subidos viven en `.data/uploads`. `SKYCITY_DATA_DIR` permite una carpeta alternativa.

La ciudad comienza con 10 edificios (6 públicos y 4 marcas ficticias), tres subastas de rascacielos y actividad claramente etiquetada como demo. Todos los contadores se calculan desde el almacenamiento; no hay ventas ni espectadores inventados fuera del seed demo. El checkout indica que no cobra dinero.

En **My Buildings**, introduce cualquier email para abrir su buzón simulado. La respuesta incluye un enlace de un solo uso, válido 15 minutos. Después se usa una cookie HttpOnly con una sesión de siete días. El checkout demo abre la sesión del comprador automáticamente.

- `hello@skycity.demo`: administra los anuncios ficticios del seed.
- `admin@skycity.demo`: acceso al panel `/admin`. Solicita el enlace en `/admin`, ábrelo y pulsa **City Hall**.
- El email utilizado al reclamar: administra las propiedades recién reclamadas.

**La autenticación demo es una simulación explícita**, no verifica la propiedad del email. Nunca conectar este modo a datos privados reales. El cron externo no hace falta para enseñar la demo: las consultas a `/api/city` procesan vencimientos y el final de subastas, y City Hall ofrece mantenimiento manual.

El seed se ejecuta solo cuando el almacenamiento está vacío. Para empezar una demo independiente sin borrar nada, cambia `SKYCITY_DATA_DIR` a una carpeta nueva antes de arrancar.

## Arquitectura

Stack fijado en `package.json` y `package-lock.json`: Next.js 16, React 19, TypeScript, Three.js, React Three Fiber, Drei, Supabase Auth/Storage, PostgreSQL, Stripe Checkout, Zod y CSS responsive propio.

```text
app/                    Páginas SSR, endpoints y metadata
components/city/        Escena WebGL, edificios, barrios y destacados
components/property/    Fichas, ilustraciones y compartir
components/checkout/    Personalización y compra
components/dashboard/   Acceso y administración del anunciante
components/admin/       City Hall y editor de propiedades
lib/engine.ts           Reglas de reservas, pagos, leases y subastas
lib/store.ts            Adaptadores SQLite / PostgreSQL transaccionales
lib/supabase/           Sesiones Supabase SSR
lib/stripe/             Creación idempotente de Checkout Sessions
lib/analytics/          Eventos del navegador
lib/email.ts            Outbox transaccional y envío con Resend
types/                  Modelo del dominio compartido
supabase/migrations/    Esquema, índices, políticas RLS y bucket
tests/                  Dominio, PostgreSQL/RLS y navegador
```

La lógica económica se concentra en funciones de dominio probables sin navegador ni claves. El mismo motor trabaja con SQLite local y PostgreSQL real. Para este tamaño de MVP, las escrituras se serializan mediante un bloqueo global de base de datos y se guardan únicamente las entidades modificadas. El adaptador PostgreSQL carga el estado en memoria dentro de la transacción: es una decisión simple para esta ciudad inicial, no una arquitectura de alto volumen. Antes de crecer mucho, sustituirlo por consultas por propiedad y bloqueos de fila, manteniendo el contrato del motor.

### Esquema

Entidades: `cities`, `profiles`, `districts`, `property_types`, `property_models`, `properties`, `leases`, `property_reservations`, `transactions`, `auctions`, `bids`, `analytics_events`, `activity_feed`, `platform_settings`, `access_tokens`, `email_outbox`, `marketplace_listings` y `credit_transactions`.

Los atributos configurables de cada entidad viven en JSONB; claves relacionales generadas, foreign keys, checks e índices garantizan integridad. `advertisements` es una vista `security_invoker` del anuncio asociado a cada lease; `share_events` es una vista de los agregados. El anuncio está dentro del lease para activarlo en la misma transacción que la compra. No se duplica en dos fuentes de verdad. Los compradores se relacionan por su email normalizado y verificado al acceder; `profiles` queda preparado para nombres públicos y créditos futuros.

`cities` es una entidad independiente. Distritos y propiedades pueden pertenecer a otras ciudades; este MVP presenta solo SkyCity. Transferencias, créditos, perfiles públicos con username, referrals remunerados, suscripciones y payouts quedan fuera del flujo implementado.

### Concurrencia y pagos

1. El servidor valida el formulario, los plazos y el precio almacenado.
2. SQLite usa `BEGIN IMMEDIATE`; PostgreSQL usa una transacción y `pg_advisory_xact_lock`.
3. Solo una reserva pendiente puede existir por propiedad. PostgreSQL añade índices únicos para reserva, lease activo y checkout.
4. Se guarda una reserva y un secreto de acceso de 256 bits. Solo su hash se almacena en la reserva.
5. Stripe recibe `property_id`, `reservation_id`, `presence_tier` y `purpose` (compra o mejora). El importe proviene de la reserva, nunca del navegador.
6. El webhook verifica la firma sobre el cuerpo original, estado pagado, moneda, importe y metadata. La transacción crea el lease y el edificio (o hace crecer el existente en una mejora) y registra pago, actividad y correo conjuntamente.
7. El ID de sesión y el ID de reserva son únicos: un evento duplicado no produce una segunda compra.
8. `/success` solo consulta confirmación; nunca concede una propiedad por visitar una URL.

Las reservas demo vencen en cinco minutos, configurables. Stripe impone un mínimo de 30 minutos; se usa un margen de 30 segundos al crear la sesión. Una reserva con Checkout Session **no se libera por el reloj local**: espera `checkout.session.expired` o confirmación de Stripe desde mantenimiento. Los pagos con webhook perdido pueden reconciliarse con la API autenticada de Stripe. Una respuesta ambigua al crear checkout conserva la reserva hasta el vencimiento en vez de permitir otra venta inmediata.

Los edificios son permanentes (pago único); solo caducan las reservas de pago y las subastas. Los índices persistentes se actualizan en mantenimiento o al iniciar otra reserva.

## Activar Supabase / PostgreSQL

1. Crea un proyecto Supabase y copia `.env.example` a `.env.local`.
2. Configura `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_DB_URL` (URL PostgreSQL del pooler, solo servidor, con SSL). Usa un rol de servidor con los permisos necesarios, nunca expongas la contraseña al cliente.
3. Ejecuta `npm run db:migrate`. Se registran las migraciones aplicadas en `skycity_migrations`. Alternativamente utiliza el flujo de migraciones del CLI de Supabase; no mezcles ambos historiales sobre el mismo proyecto.
4. La migración crea tablas, políticas RLS y el bucket público `advertisements` (solo escrituras desde servidor).
5. En Auth configura Site URL y añade `<APP_URL>/auth/confirm` a las redirect URLs permitidas.
6. Configura un proveedor SMTP de producción para los enlaces solicitados desde My Buildings. Para el enlace del template de Magic Link puedes usar:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Open My Buildings</a>
```

7. Configura `ADMIN_EMAILS` con emails concretos separados por comas. La autorización consulta un usuario verificado de Supabase, nunca `user_metadata` editable.
8. Completa Stripe y establece `SKYCITY_MODE=live`. La primera lectura crea la ciudad inicial **sin marcas, ventas ni pujas demo**.

Si `SKYCITY_MODE` no está definido y se detectan variables reales, la aplicación exige que estén todas las esenciales. La configuración parcial falla de forma cerrada en vez de cobrar usando almacenamiento demo. No publiques `.env.local`.

### RLS y autorización

Todas las tablas tienen RLS. Los clientes anónimos solo pueden leer la ciudad y la actividad pública. Los clientes autenticados solo pueden leer sus leases, pagos, pujas y perfil. Las tablas sensibles, outbox y reservas no se exponen públicamente. No se concede `UPDATE` económico a los clientes.

La edición de anuncios pasa por `/api/me`: verifica la identidad, comprueba la propiedad y permite exclusivamente los campos del anuncio. No permite cambiar dueño, precio, vencimiento ni moderación. Los anuncios suspendidos no se reactivan editándolos ni renovándolos. `/api/admin` verifica administrador en cada llamada. El frontend público nunca incluye emails de propietarios, tokens, facturación ni identidades de otros postores.

Hay comprobaciones de origen, tamaño/MIME de archivos y límites básicos por proceso. Antes de una campaña pública amplia, configura protección de abuso en el perímetro y límites compartidos entre instancias; el limitador en memoria incluido no sustituye a uno distribuido. La moderación inicial es manual posterior o previa, configurable; no incluye clasificación automática del contenido.

## Stripe

Configura `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y `NEXT_PUBLIC_APP_URL`. El checkout es hospedado por Stripe; no se capturan tarjetas en SkyCity. Apple Pay y Google Pay dependen de la disponibilidad de la cuenta, navegador y configuración de Stripe. La clave publicable se documenta por compatibilidad futura, pero no es necesaria para redirigir al checkout hospedado.

Para desarrollo con claves test:

```sh
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

En producción crea un endpoint HTTPS para `/api/webhooks/stripe` y suscríbelo a:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`

La implementación usa `allowed_payment_method_types` del SDK Stripe 23 fijado en el lockfile. Prueba una compra y una mejora con claves test, y repite el webhook para confirmar idempotencia antes de habilitar pagos reales.

## Subastas (desactivadas)

Las subastas están retiradas (`AUCTIONS_ENABLED = false` en `lib/features.ts`). Los ocho solares de rascacielos se venden a **precio fijo** (200 € por defecto, editable en City Hall) con el checkout normal y, como el resto de la ciudad, pueden cambiar de manos por **takeover**: quien supera el valor actual pasa a controlar el edificio. City Hall puede seguir reservando un rascacielos para una marca o asignarlo manualmente.

Una migración versionada (`lib/skyscraper-sales.ts`) adapta las ciudades creadas con subastas: cierra las subastas en curso (las pujas nunca se cobran), avisa por email a quienes pujaron y pone a la venta los rascacielos libres. Una adjudicación pendiente de pago se deja terminar. El código de subastas (motor, API, páginas y tests del motor) se conserva inactivo: `/auctions` redirige al mapa, `/api/bids` responde 410 y City Hall no permite abrir subastas. Para recuperarlas basta con volver a activar el interruptor.

## Emails y mantenimiento

`email_outbox` almacena mensajes de confirmación, mejora, victoria y sobrepuja. Los avisos se deduplican por identificador. En demo puedes inspeccionarlos desde City Hall; no se envían a destinatarios reales.

Para envíos reales configura `RESEND_API_KEY` y `EMAIL_FROM` con un dominio verificado. Los correos de confirmación generan un enlace Magic Link con Supabase y conservan el cuerpo antes de enviar. Resend recibe una clave de idempotencia. El webhook intenta vaciar el outbox tras responder; el mantenimiento reintenta los pendientes. Los enlaces solicitados expresamente en My Buildings los entrega Supabase Auth a través de su SMTP.

`GET /api/cron` requiere `Authorization: Bearer <CRON_SECRET>`. Procesa vencimientos, subastas, reconciliación Stripe y hasta 30 correos por ejecución. `vercel.json` programa una ejecución diaria (lo que permite el plan Hobby de Vercel) como red de seguridad; la frecuencia real (cada 10 minutos) la aporta un programador externo, por ejemplo cron-job.org, llamando a `/api/cron` con esa cabecera. Con el plan Pro puede cambiarse el `schedule` a `*/10 * * * *` y prescindir del externo. Sin mantenimiento periódico no se garantizan los avisos ni el cierre puntual de subastas.

## Métricas

Eventos: `city_impression`, `property_impression`, `property_open`, `external_link_click`, `share_clicked`, `claim_clicked`, `checkout_started`, `checkout_completed`, `claim_completed`, `renewal_completed` y `auction_bid`.

Se agregan por día, propiedad y evento. Los eventos del navegador se deduplican por cookie durante 30 minutos; las métricas de pago se registran en servidor. Las impresiones de una propiedad se cuentan al abrir su ficha o página, no por tener cientos de edificios fuera de cámara. CTR usa clicks externos / aperturas de ficha. Son indicadores del MVP, no analítica auditada contra bots. El feed se actualiza mediante polling cada 15 segundos mientras la pestaña está visible.

## Pruebas

`npm test` verifica reglas económicas y ejecuta el SQL en PostgreSQL embebido (PGlite), con roles Auth/Storage simulados para comprobar índices, permisos y aislamiento RLS.

```sh
# Con la app en marcha y Google Chrome instalado
npx playwright test
```

Los recorridos cubren los casos A–D (construir, mejorar pagando la diferencia, recargar y solares sin comprador vacíos), compartir, edición, magic link, carrera por la misma propiedad, acceso privado, administración, moderación, pujas y móvil. La prueba de exploración a **1920 × 1080** comprueba el canvas completo, marcas, selección sin redimensionar el mapa, barrios, filtros y navegación sin errores de consola. Los tests de navegador operan sobre la **ciudad demo** y crean datos de prueba; usa una carpeta `SKYCITY_DATA_DIR` separada si quieres conservar otra demostración. `TEST_URL` permite apuntar a otra instancia. No ejecutes estos tests contra producción.

Pruebas realizadas durante el desarrollo: TypeScript, build de producción, 38 tests de dominio/PostgreSQL y diez recorridos Playwright, además de inspección visual a 1920 × 1080 y 390 × 844. **No se ha realizado una transacción con servicios Supabase/Stripe/Resend reales**, porque no se han configurado credenciales en este workspace.

## Despliegue

En Vercel importa este proyecto como Next.js, usa Node 24, configura las variables live, aplica la migración y registra webhook, SMTP, Resend y cron. No hace falta subir modelos 3D externos. En un servidor Node con disco persistente puedes ejecutar `npm run build` y `npm start` para una demo privada.

El modo demo no está pensado para el filesystem efímero de Vercel. `ALLOW_HOSTED_DEMO=true` es una protección explícita, no aporta persistencia compartida. Para publicar con datos duraderos utiliza PostgreSQL/Supabase.

## Decisiones y límites del MVP

- La ciudad es el producto; el contenido editorial solo acompaña a la exploración.
- Sin cuotas recurrentes, cuentas obligatorias antes del checkout, cripto ni transferencias pagadas.
- Modelos procedurales y geometrías compartidas; no se descarga un modelo independiente por solar. Los modelos son combinaciones de cubierta/fachada, escaladas y recoloreadas.
- Logos/banners subidos se muestran en las páginas; carteles 3D usan nombre, colores y logo cuando CORS lo permite. No hay editor avanzado de texturas.
- Las cifras siempre proceden del almacenamiento y el demo se identifica en pantalla.
- El SQL y la lógica económica están probados localmente. Activar servicios reales requiere la prueba de integración con las credenciales del proyecto de destino.
- Optimizar consultas por entidad, sustituir límites en memoria, instrumentar observabilidad y revisar políticas comerciales/locales son pasos del lanzamiento público, no supuestos ya verificados.

Documentación consultada: [Next.js](https://nextjs.org/docs/app), [React Three Fiber](https://r3f.docs.pmnd.rs/getting-started/introduction), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase Storage](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [Stripe Checkout](https://docs.stripe.com/api/checkout/sessions/create), [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment), [Resend](https://resend.com/docs/api-reference/emails/send-email).

## Top marcas y métricas de ciudad

El panel flotante usa `rankBrands` y `latestPurchase` (`lib/city-social.ts`): solo edificios privados con marca activa, compra confirmada y valor actual positivo. Ordena por `current_property_value`; los empates mantienen el orden de solar. La última compra procede de `valueHistory`, que incluye adquisiciones y takeovers completados, excluyendo mejoras, reembolsos y ejemplos sin pago. En demo las compras de prueba se identifican como tales.

`CityData.metrics.totalVisits` suma los eventos `city_impression` registrados (una visita por sesión de 30 minutos según la analítica existente). No suma las visitas a edificios. El contador de personas en línea todavía no tiene proveedor: la UI muestra **18 · demo** únicamente en modo demo y **—** en live. Para conectar presencia real, proporcionar `online` y `onlineSource: "live"` en `CityData.metrics`; no requiere cambiar el componente.

El ranking selecciona el edificio a través del flujo de cámara existente y abre su ficha a la derecha. Puede cerrarse y reabrirse; en móvil arranca cerrado y se abre como panel inferior. `tests/e2e/city-social.spec.ts` comprueba navegación y responsive sobre los datos disponibles, sin realizar compras.

## Identidad visual de los edificios de marca

- **Siluetas** (`lib/massing.ts`): seis familias reutilizables (ancho y bajo, bloque, torre esbelta, escalonado, con coronación y singular: torres gemelas, voladizo o ala lateral) repartidas por tier: STARTER 4 variantes, PLUS 4, PRO 5, PREMIUM 5 y LANDMARK 6. Cada solar conserva siempre la misma variante.
- **Color** (`brandPalette` en `lib/brand-theme.ts`): el color principal cubre casi todo el volumen; el secundario marca zócalo y coronación, y un tono profundo marca marcos y retranqueos. Las marcas muy oscuras reciben marcos y vidrio más claros. Si una marca deja el color por defecto o elige blanco/gris/negro y tiene logo, el edificio toma el color dominante del logo (`lib/logo-info.ts`).
- **Soportes por tier** (`brandPlan` en `lib/brand-plan.ts`): STARTER una placa en fachada; PLUS cartel superior y panel frontal; PRO cartel y panel frontal (lateral si se pide valla lateral); PREMIUM fachada grande y panel lateral o banda vertical; LANDMARK todo, con cartel iluminado.
- **Logos e imágenes**: los logos se muestran completos (`contain`) sobre una placa que contrasta con el propio logo; un logo horizontal genera un panel ancho y uno cuadrado un panel grande. Las imágenes promocionales llenan el panel (`cover`) salvo que el recorte supere ~20 %; entonces se muestran completas sobre el color de marca.
- **Ejemplos**: `npm run demo:brands -- http://localhost:3000` añade diez marcas ficticias variadas a una ciudad demo (solo funciona en modo demo).

## Textos legales y aceptación en el checkout

- Páginas: `/aviso-legal`, `/privacidad`, `/cookies` y `/condiciones`, enlazadas desde la portada (junto a la actividad) y entre sí. La versión de las condiciones vive en `lib/legal.ts`; los datos del titular (`LEGAL_OWNER`, `LEGAL_TAX_ID`, `LEGAL_ADDRESS`, `LEGAL_EMAIL` y, en sociedades, `LEGAL_REGISTRY`) se leen de variables de entorno para que no queden en el repositorio público.
- Antes de pagar (compra, mejora o takeover) el checkout exige dos casillas: aceptar condiciones y privacidad, incluido que un takeover no reembolsa al anterior controlador, y pedir la construcción inmediata con renuncia al desistimiento. La API rechaza la compra sin ellas (`consent` en `/api/checkout` y `/api/takeover`) y guarda en la reserva la versión aceptada y la fecha.
- Los textos son un borrador redactado a partir del funcionamiento real de la app y deben revisarse con un profesional antes del lanzamiento público.

## Edificios del Ayuntamiento y curación de Top marcas

- **Montar un edificio sin pago** (City Hall → Solares → Editar un solar libre): cualquier tamaño en solares normales, la torre en los de rascacielos, con la marca completa (logo, colores, frase, web) y el email que podrá editarla en Mis edificios. No registra pagos ni aparece como compra; empieza sin valor, con la protección habitual, y después cualquiera puede quedarse la ubicación pagando.
- **Top marcas** (City Hall → Edificios y anuncios): por edificio, *Automático* (las compras reales, por valor pagado), *Destacada* (sección aparte «Destacadas por SkyCity», sin importe ni posición) u *Ocultar*. Los edificios asignados nunca entran en el ranking de pago ni en «Última compra».
