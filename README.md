# SkyCity

Una ciudad virtual explorable donde cada edificio aloja un único anuncio durante un alquiler temporal. Sin registro previo, contraseñas para compradores, blockchain ni promesas de inversión.

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

- Ciudad WebGL con **210 propiedades**, siete barrios y 20 combinaciones geométricas reutilizables. Materiales suaves, sombras, árboles, zonas verdes, río, coches y carteles integrados. Ventanas y árboles mediante `InstancedMesh`.
- Ciudad a pantalla completa bajo una barra de 68 px, sin sidebar ni tarjetas debajo del mapa. Búsqueda flotante, barrios desplegables, directorio y controles superpuestos.
- Cámara ortográfica a escala de barrio: arrastrar para desplazar, rueda/pellizco para zoom y botón derecho/dos dedos para rotar. Al seleccionar, la cámara se acerca y los edificios cercanos se atenúan para despejar la vista. Ficha flotante en escritorio y panel inferior en móvil.
- Marcas integradas mediante un rótulo principal y una superficie secundaria con logo, sin repetir el nombre por todas las fachadas. Pixel Coffee usa madera, vidrio cálido y terraza; Moonlight Club, neón violeta y una pulsación lenta; Green Market, cubierta plantada, toldo a rayas y vegetación. Los anunciantes propios conservan sus colores, logo, banner y estilo de cartel.
- Sin etiquetas flotantes permanentes para marcas o disponibilidad: los disponibles llevan un pequeño + tridimensional, contorno sutil y precio al pasar el cursor. Las subastas combinan fachada oscura, remates dorados y un distintivo que se oculta al seleccionar otra propiedad.
- Vista inicial de escritorio un 50 % más cercana (zoom 27), enfoque animado de unos 950 ms al seleccionar y contorno dorado ajustado al edificio. Arrastrar interrumpe la transición; cerrar una ficha conserva la posición de exploración.
- Hero compacto, paletas y mobiliario diferenciados por barrio, paseo de madera junto al río, seis coches lentos y una pequeña embarcación con movimiento ambiental. La preferencia del sistema de movimiento reducido detiene las animaciones ambientales y hace inmediato el enfoque de cámara. El mobiliario urbano utiliza instancias compartidas.
- Búsqueda por edificio, número, marca o barrio; filtros de disponibilidad, precio, subasta y categoría; directorio accesible mediante teclado.
- **Explorar → seleccionar → personalizar → email → checkout → anuncio activo → compartir**.
- Alquileres de 7, 30 y 90 días, precios y plazos editables en administración, reservas exclusivas y renovación manual.
- Nombre, logo, banner, descripción, web, redes, código promocional, CTA, colores y estilo del cartel. Carga de PNG/JPEG/WebP hasta 2 MB. Las imágenes externas requieren HTTPS; los logos remotos necesitan CORS para aparecer en una textura WebGL. Si no lo permiten, se conserva el nombre de la marca en el cartel.
- My Buildings con enlaces de acceso de un solo uso, edición de anuncios, renovaciones, compartir y métricas agregadas.
- Subastas con pujas validadas en servidor, historial, contador basado en una fecha persistida, avisos y adjudicación.
- City Hall: propiedades, ubicaciones, precios, tipos, categorías, destacados, barrios, alquileres, moderación, subastas, pujas, clientes, transacciones, correos y ajustes.
- URLs públicas renderizadas en servidor, metadata, canonical, sitemap, robots y tarjetas Open Graph PNG de 1200 × 630.

## Modo demo

Se activa sin variables. También puede fijarse con `SKYCITY_MODE=demo`. Los datos viven en **`.data/skycity.sqlite`**, con WAL, transacciones y persistencia entre reinicios. Los archivos subidos viven en `.data/uploads`. `SKYCITY_DATA_DIR` permite una carpeta alternativa.

La ciudad comienza con 16 anuncios ficticios (7,6 %), tres subastas y actividad claramente etiquetada como demo. Todos los contadores se calculan desde el almacenamiento; no hay ventas ni espectadores inventados fuera del seed demo. El checkout indica que no cobra dinero.

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
5. Stripe recibe `property_id`, `reservation_id` y `lease_duration`. El importe proviene de la reserva, nunca del navegador.
6. El webhook verifica la firma sobre el cuerpo original, estado pagado, moneda, importe y metadata. La transacción crea/renueva el lease y registra pago, actividad y correo conjuntamente.
7. El ID de sesión y el ID de reserva son únicos: un evento duplicado no produce una segunda compra.
8. `/success` solo consulta confirmación; nunca concede una propiedad por visitar una URL.

Las reservas demo vencen en cinco minutos, configurables. Stripe impone un mínimo de 30 minutos; se usa un margen de 30 segundos al crear la sesión. Una reserva con Checkout Session **no se libera por el reloj local**: espera `checkout.session.expired` o confirmación de Stripe desde mantenimiento. Los pagos con webhook perdido pueden reconciliarse con la API autenticada de Stripe. Una respuesta ambigua al crear checkout conserva la reserva hasta el vencimiento en vez de permitir otra venta inmediata.

Los leases vencidos desaparecen del snapshot público sin esperar al cron. Los índices persistentes se actualizan en mantenimiento o al iniciar otra reserva.

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

La implementación usa `allowed_payment_method_types` del SDK Stripe 23 fijado en el lockfile. Prueba una compra y una renovación con claves test, y repite el webhook para confirmar idempotencia antes de habilitar pagos reales.

## Subastas

Para pujar hace falta acceder por enlace: evita pujas atribuidas a emails sin verificar en producción. La oferta mínima, el incremento y el final se validan dentro de la transacción. Se guardan importes en euros y se convierten a céntimos al enviar a Stripe.

En demo el ganador recibe automáticamente un lease al cerrar la subasta. En live se reserva el espacio al mayor postor y se envía un enlace de pago válido 24 horas. **Un lease real se activa solo después de pagar**. El ganador personaliza el anuncio desde My Buildings. No se cobran automáticamente las pujas ni se retienen tarjetas.

Una subasta sin pujas se cierra. Las adjudicaciones impagadas requieren revisión del administrador; la renovación del proceso o adjudicación al segundo postor no está automatizada. No hay pagos entre usuarios ni Stripe Connect.

## Emails y mantenimiento

`email_outbox` almacena mensajes de confirmación, renovación, vencimiento, recordatorio (7 días, 3 días y 24 horas), victoria y sobrepuja. Los avisos se deduplican por lease, fecha y umbral. En demo puedes inspeccionarlos desde City Hall; no se envían a destinatarios reales.

Para envíos reales configura `RESEND_API_KEY` y `EMAIL_FROM` con un dominio verificado. Los correos de confirmación generan un enlace Magic Link con Supabase y conservan el cuerpo antes de enviar. Resend recibe una clave de idempotencia. El webhook intenta vaciar el outbox tras responder; el mantenimiento reintenta los pendientes. Los enlaces solicitados expresamente en My Buildings los entrega Supabase Auth a través de su SMTP.

`GET /api/cron` requiere `Authorization: Bearer <CRON_SECRET>`. Procesa vencimientos, subastas, reconciliación Stripe y hasta 30 correos por ejecución. `vercel.json` contiene una ejecución cada diez minutos: necesita un plan que admita esa frecuencia o un programador externo equivalente. Sin mantenimiento periódico no se garantizan los avisos ni el cierre puntual de subastas.

## Métricas

Eventos: `city_impression`, `property_impression`, `property_open`, `external_link_click`, `share_clicked`, `claim_clicked`, `checkout_started`, `checkout_completed`, `claim_completed`, `renewal_completed` y `auction_bid`.

Se agregan por día, propiedad y evento. Los eventos del navegador se deduplican por cookie durante 30 minutos; las métricas de pago se registran en servidor. Las impresiones de una propiedad se cuentan al abrir su ficha o página, no por tener cientos de edificios fuera de cámara. CTR usa clicks externos / aperturas de ficha. Son indicadores del MVP, no analítica auditada contra bots. El feed se actualiza mediante polling cada 15 segundos mientras la pestaña está visible.

## Pruebas

`npm test` verifica reglas económicas y ejecuta el SQL en PostgreSQL embebido (PGlite), con roles Auth/Storage simulados para comprobar índices, permisos y aislamiento RLS.

```sh
# Con la app en marcha y Google Chrome instalado
npx playwright test
```

Los seis recorridos cubren compra, compartir, edición, renovación, magic link, carrera por la misma propiedad, acceso privado, administración, moderación, pujas y móvil. La prueba de exploración a **1920 × 1080** comprueba el canvas completo, marcas, selección sin redimensionar el mapa, barrios, filtros y navegación sin errores de consola. Los tests de navegador operan sobre la **ciudad demo** y crean datos de prueba; usa una carpeta `SKYCITY_DATA_DIR` separada si quieres conservar otra demostración. `TEST_URL` permite apuntar a otra instancia. No ejecutes estos tests contra producción.

Pruebas realizadas durante el desarrollo: TypeScript, build de producción, 11 tests de dominio/PostgreSQL y seis recorridos Playwright, además de inspección visual a 1920 × 1080 y 390 × 844. **No se ha realizado una transacción con servicios Supabase/Stripe/Resend reales**, porque no se han configurado credenciales en este workspace.

## Despliegue

En Vercel importa este proyecto como Next.js, usa Node 24, configura las variables live, aplica la migración y registra webhook, SMTP, Resend y cron. No hace falta subir modelos 3D externos. En un servidor Node con disco persistente puedes ejecutar `npm run build` y `npm start` para una demo privada.

El modo demo no está pensado para el filesystem efímero de Vercel. `ALLOW_HOSTED_DEMO=true` es una protección explícita, no aporta persistencia compartida. Para publicar con datos duraderos utiliza PostgreSQL/Supabase.

## Decisiones y límites del MVP

- La ciudad es el producto; el contenido editorial solo acompaña a la exploración.
- Sin cuotas recurrentes, cuentas obligatorias antes del checkout, cripto ni transferencias pagadas.
- Modelos procedurales y geometrías compartidas; no son 210 modelos descargados. Los modelos son combinaciones de cubierta/fachada, escaladas y recoloreadas.
- Logos/banners subidos se muestran en las páginas; carteles 3D usan nombre, colores y logo cuando CORS lo permite. No hay editor avanzado de texturas.
- Las cifras siempre proceden del almacenamiento y el demo se identifica en pantalla.
- El SQL y la lógica económica están probados localmente. Activar servicios reales requiere la prueba de integración con las credenciales del proyecto de destino.
- Optimizar consultas por entidad, sustituir límites en memoria, instrumentar observabilidad y revisar políticas comerciales/locales son pasos del lanzamiento público, no supuestos ya verificados.

Documentación consultada: [Next.js](https://nextjs.org/docs/app), [React Three Fiber](https://r3f.docs.pmnd.rs/getting-started/introduction), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase Storage](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [Stripe Checkout](https://docs.stripe.com/api/checkout/sessions/create), [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment), [Resend](https://resend.com/docs/api-reference/emails/send-email).
