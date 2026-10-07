# Plan: App Esencia Nails

Oct 7, 2026 · @Daniel Lopez

## Resumen

Una web app para Esencia Nails by Mel (Santa Tecla, servicio a domicilio) donde las clientas ven los trabajos y solicitan cita sin crear cuenta, y ella administra todo desde un panel. Hoy las citas llegan por WhatsApp y DM de Instagram; la app ordena esas solicitudes y muestra solo horarios realmente libres.

- **Para las clientas:** inicio con servicios, galería, horario y formas de pago; formulario de reserva en pocos pasos.
- **Para ella:** panel para aceptar o rechazar solicitudes, editar el contenido del inicio, definir horarios y ajustar reglas de negocio sin tocar código.
- **Costo de infraestructura esperado:** $0 al mes con los planes gratuitos de Neon y Netlify, mientras el tráfico se mantenga en el volumen actual del negocio.

## Sitio público

Dos páginas principales, ambas sin cuenta y con todo el contenido editable desde el panel.

**`/` Inicio**

- Hero con logo, nombre, Santa Tecla y servicio a domicilio; botones "Reservar" y WhatsApp.
- Servicios con precio fijo, "desde" o "a cotizar", y duración.
- Galería filtrable por categoría (aurora, puntos, moños, estrellas, etc.), con fotos destacadas.
- Horario de atención, zonas de cobertura y formas de pago (efectivo o transferencia).
- Sección de cuidados y preguntas frecuentes; enlace a Instagram.

**`/reservar`** — formulario por pasos:

1. Elegir servicio.
2. Elegir fecha y hora entre los horarios libres que calcula el servidor.
3. Datos: nombre, WhatsApp (8 dígitos), zona, dirección y notas; un enlace invita a mandar fotos de referencia por WhatsApp.
4. Confirmación con un código de 6 caracteres.

**`/reserva/[codigo]`** (opcional) — la clienta consulta el estado de su solicitud con el código.

Protección contra spam sin pedir cuenta: campo honeypot y límite de solicitudes por IP y teléfono. Cloudflare Turnstile queda como opción si llega spam.

## Panel administrativo

Un solo usuario (ella), con login por correo y contraseña de Better Auth y el registro público desactivado; su cuenta se crea con un script de seed.

| Sección | Qué hace |
| --- | --- |
| Dashboard | Solicitudes pendientes y citas de hoy y de la semana |
| Solicitudes | Confirmar, rechazar, reprogramar, cancelar o marcar completada; marcar anticipo recibido; botón que abre WhatsApp (`wa.me`) con la plantilla elegida |
| Horarios | Reglas semanales (varias franjas por día), modo automático o bajo solicitud, fechas o franjas bloqueadas |
| Contenido | Textos del inicio, servicios, galería (subir, ordenar, destacar, categorizar), cuidados y FAQ |
| Ajustes | WhatsApp, Instagram, zonas, formas de pago reglas de reserva y plantillas de WhatsApp; en Ajustes avanzados, cancelar de una vez todas las pendientes vencidas |

La confirmación a la clienta se hace por WhatsApp desde el botón del panel: no hay costo de API de mensajería y coincide con cómo ella ya trabaja.

## Decisiones de flujo

Solo ella cambia el estado de una reserva; la clienta nunca cancela ni reprograma desde la app.

| Situación | Decisión |
| --- | --- |
| Reprogramar | La reserva queda confirmada en la nueva fecha y hora; el servidor revalida contra las demás confirmadas |
| Cancelar | Solo ella, desde el panel; luego elige una plantilla y avisa por WhatsApp |
| Pendiente con fecha pasada | Pasa a cancelada a mano, una por una, o con la acción masiva de Ajustes avanzados |
| Completada | Ella la marca a mano |
| Fotos de referencia | La clienta no sube fotos; el formulario muestra un enlace para mandarlas por WhatsApp |
| Rate limit (propuesta, por confirmar) | Máximo 2 solicitudes pendientes por teléfono y 10 solicitudes por IP por hora, contadas en Postgres |

Transiciones válidas:

- **Pendiente** → confirmada, rechazada o cancelada.
- **Confirmada** → confirmada en otra hora (reprogramar), cancelada o completada.
- **Rechazada, cancelada y completada** son finales.

Cualquier otra transición la rechaza el servidor con un 409.

## Plantillas de WhatsApp

Ella crea y edita sus plantillas; después de cada acción elige cuál enviar y la app abre WhatsApp con el texto ya armado.

1. Al confirmar, rechazar, reprogramar o cancelar, el panel abre un modal con las plantillas activas de ese tipo.
2. Ella elige una, ve la vista previa con los datos reales y puede editar el texto antes de enviar.
3. El botón abre `https://wa.me/503XXXXXXXX?text=<texto codificado>` con el número de la clienta.

Tipos: confirmación, rechazo, reprogramación, cancelación, anticipo, recordatorio y otro. Cada plantilla tiene nombre, tipo, cuerpo, activa y orden.

| Variable | Valor |
| --- | --- |
| `{{nombre}}` | Nombre de la clienta |
| `{{servicio}}` | Servicio reservado |
| `{{fecha}}` | Fecha, por ejemplo "jueves 8 de octubre" |
| `{{hora}}` | Hora de inicio, por ejemplo "4:30 pm" |
| `{{codigo}}` | Código de la reserva |
| `{{zona}}` / `{{direccion}}` | Zona y dirección |
| `{{precio}}` / `{{traslado}}` / `{{anticipo}}` | Montos guardados en la reserva, en dólares |
| `{{instrucciones_anticipo}}` | Texto de Ajustes, por ejemplo la cuenta para transferir |

Una variable desconocida o vacía se deja tal cual en la vista previa, para que ella la note antes de enviar. El seed trae una plantilla por tipo.

## Reglas configurables

Todas las reglas de negocio se editan desde Ajustes y viven en una tabla `settings` de una sola fila con columnas tipadas, más las tablas `services` y `zones`.

| Regla | Dónde vive | Valor inicial |
| --- | --- | --- |
| Precio y duración por servicio | `services`: tipo de precio (fijo, desde, cotizar), precio en centavos, duración en minutos | Lo define ella |
| Cargo de traslado | `settings.charge_travel_fee` + `zones.travel_fee_cents` | Desactivado |
| Anticipo | `settings.deposit_mode` (ninguno, fijo, porcentaje), `deposit_value`, `deposit_instructions` | Ninguno |
| Tiempo entre citas | `settings.travel_buffer_minutes` | 0 min (apagado) |
| Intervalo entre horarios ofrecidos | `settings.slot_step_minutes` | 30 min |
| Anticipación mínima | `settings.min_notice_hours` | 12 h |
| Días hacia adelante | `settings.max_days_ahead` | 30 días |
| Solicitud pendiente ocupa el horario | `settings.pending_blocks_slot` | Sí |

Cada reserva guarda una copia del nombre del servicio, precio, cargo de traslado y anticipo vigentes al crearla. Así, si ella cambia un precio, las reservas viejas siguen mostrando lo que la clienta vio.

El tiempo entre citas queda implementado pero apagado: se activará solo si ella lo pide después de ver la propuesta.

## Stack e infraestructura

Nuxt 4 desplegado en Netlify, con Postgres y almacenamiento de fotos en un mismo proyecto de Neon.

| Pieza | Elección | Motivo |
| --- | --- | --- |
| Framework | Nuxt 4 + Nuxt UI v4 | Stack conocido; rutas de servidor con Nitro |
| Auth | Better Auth (correo y contraseña, sin registro público) | Un solo usuario administrador |
| Base de datos | Neon Postgres, Drizzle ORM, driver `neon-http` | Postgres conocido; driver adecuado para funciones serverless |
| Fotos | Neon Object Storage (compatible con S3), `@aws-sdk/client-s3` | Mismo proveedor y credencial que la BD |
| Validación | Zod | Valida query y body en las rutas |
| Hosting | Netlify, plan Free | Permite uso comercial gratis; Vercel Hobby no |

Se descartó Turso + Neon Storage: igual hace falta un proyecto de Neon para las fotos, y el límite que más aprieta, la transferencia de 5 GB al mes, viene de las fotos y no de la base de datos. Se descartó Vercel porque su plan Hobby es solo para uso personal no comercial ([Vercel ToS](https://conductatlas.com/platform/vercel/vercel-terms-of-service/provision/CA-P-048642/hobby-plan-personal-non-commercial-use-only/)).

**Variables de entorno**

```
DATABASE_URL=
AWS_ENDPOINT_URL_S3=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_BUCKET=
S3_PUBLIC_BASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
```

Las seis primeras ya existen: salen del proyecto de Neon creado. Faltan `S3_PUBLIC_BASE_URL` (URL base pública de `S3_BUCKET`), las dos de Better Auth y las dos del seed, que solo se usan al crear la cuenta de ella. Como la clienta ya no sube fotos, no hace falta un bucket privado. `S3_BUCKET` debe tener lectura pública. El servidor lee `process.env` directamente; el `S3Client` recibe `endpoint` y `region` explícitos y probablemente `forcePathStyle: true`, porque la URL de Neon pone el bucket en la ruta.

## Diseño visual

El tema ya está definido con el editor de temas de Nuxt UI: color primario violeta, botones y badges en variante `soft` e íconos Material Symbols redondeados.

| Elemento | Valor |
| --- | --- |
| Color primario | `violet` |
| Fondo claro / oscuro | `neutral-50` / `neutral-900` |
| Fondo atenuado claro / oscuro | `neutral-100` / `neutral-800` |
| Variante por defecto de `UButton` y `UBadge` | `soft` |
| Íconos | Material Symbols (`i-material-symbols-*`), requiere `@iconify-json/material-symbols` |

Los archivos `app/assets/css/main.css` y `app/app.config.ts` van tal cual en el repo; el agente no inventa colores ni íconos fuera de ese tema.

Criterios para las pantallas: interfaz en español, pensada primero para celular porque sus clientas llegan desde Instagram, y modo claro y oscuro funcionando. El ícono `light` usa `i-material-symbols:` con dos puntos en lugar de guion; hay que confirmar que cargue.

## Imágenes

Solo ella sube fotos, a la galería, y cada foto se guarda en dos versiones WebP optimizadas en el bucket público `S3_BUCKET`. Las fotos se sirven directo desde Neon, sin pasar por Netlify.

| Versión | Lado mayor | Tamaño máximo aceptado | Uso |
| --- | --- | --- | --- |
| Miniatura | 600 px | 300 KB | Cuadrícula de la galería e inicio |
| Completa | 1600 px | 1 MB | Vista ampliada al tocar una foto |

**Optimización en el navegador** (componente del panel)

1. Rechaza archivos que no sean imagen o que pesen más de 15 MB.
2. Corrige la orientación con `createImageBitmap` y redimensiona con `canvas` a las dos medidas.
3. Codifica en WebP con calidad 0.8; si el navegador entrega otro formato (algunas versiones de Safari, no verificado), usa JPEG con calidad 0.82.
4. Envía las dos versiones en un solo `multipart/form-data` a la ruta de Nitro.

**Validación en el servidor** (Nitro)

1. Exige sesión de admin.
2. Confirma el formato leyendo los primeros bytes del archivo (WebP o JPEG), no el `Content-Type`.
3. Rechaza si una versión supera su tamaño máximo.
4. Guarda con keys inmutables `galeria/<uuid>-600.webp` y `galeria/<uuid>-1600.webp` y `Cache-Control: public, max-age=31536000, immutable`.

Se eligió optimizar en el navegador porque `sharp` usa binarios nativos y no verifiqué que funcione en las funciones de Netlify; además, así el request llega ya pequeño. Se usa WebP y no AVIF porque, hasta donde sé, los navegadores no codifican AVIF de forma confiable desde `canvas`.

Cálculo aproximado: una miniatura WebP de 600 px pesa del orden de 40 a 80 KB, así que un inicio con 12 fotos consume 0.5 a 1 MB por visita y los 5 GB de Neon alcanzan para varios miles de visitas al mes.

## Modelo de datos

Diez tablas propias más las de Better Auth. Dinero en centavos, horas como minutos desde medianoche en hora local de El Salvador (16:30 = 990) y fechas como `YYYY-MM-DD`.

| Tabla | Columnas principales |
| --- | --- |
| `settings` | Una fila (id = 1): textos del inicio, contacto, reglas de reserva, traslado, anticipo |
| `services` | nombre, descripción, tipo de precio, precio en centavos, duración, activo, orden |
| `zones` | nombre, cargo de traslado en centavos, activo, orden |
| `gallery_categories` | nombre, slug único, orden |
| `gallery_items` | categoría, key miniatura, key completa, ancho, alto, alt, destacado, orden |
| `availability_rules` | día de semana (0 = domingo), minuto inicio, minuto fin, modo automático o bajo solicitud |
| `blocked_dates` | fecha, minuto inicio y fin (vacíos = día completo), motivo |
| `bookings` | código único, servicio, zona, fecha, inicio, fin, estado, datos de la clienta, copias de precio, traslado y anticipo, estado del anticipo, notas internas |
| `whatsapp_templates` | nombre, tipo, cuerpo, activa, orden |
| `booking_attempts` | IP, teléfono, fecha y hora; solo para el rate limit |

Estados de una reserva: pendiente, confirmada, rechazada, cancelada y completada. Estados del anticipo: no requerido, pendiente y recibido.

Índices: `bookings(date, status)`, `bookings(client_phone, status)`, `availability_rules(weekday)`, `blocked_dates(date)`, `whatsapp_templates(kind)` y `booking_attempts(ip, created_at)`.

## Datos de muestra

El seed carga lo que muestra el perfil de Instagram; lo que no aparece ahí va marcado como `[EJEMPLO]` para que ella lo reemplace desde el panel.

| Dato | Valor en el seed | Origen |
| --- | --- | --- |
| Nombre | Esencia Nails by Mel | Perfil |
| Ubicación | Santa Tecla, servicio a domicilio | Perfil y publicación de horario |
| WhatsApp | 79581732 | Publicación de horario |
| Instagram | instagram.com/esencianailssv | Perfil |
| Formas de pago | Efectivo o transferencia | Publicación de horario |
| Horario lunes a viernes | 4:30 a 8:30 pm, automático | Publicación de horario |
| Horario sábado y domingo | Bajo solicitud; horas 9:00 am a 5:00 pm `[EJEMPLO]` | El perfil solo dice "sujeto a disponibilidad" |
| Zona | Santa Tecla, sin cargo de traslado | Perfil |
| Categorías de galería | Puntos, Aurora, Moños, Estrellas | Leídas de las fotos del perfil |
| Servicios | Diseño personalizado (a cotizar) y tres servicios `[EJEMPLO]` a cotizar con duración de ejemplo | El perfil dice "puedes cotizar tu diseño"; no publica precios |
| Plantillas de WhatsApp | Una por tipo | Escritas para el seed |
| Usuario admin | Correo y contraseña desde variables `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` | — |

La galería arranca vacía: las fotos se suben desde el panel para que pasen por la optimización.

## Disponibilidad y flujo de una reserva

Un horario se ofrece solo si cabe completo en una franja, respeta la anticipación mínima y no choca con citas ni bloqueos. El servidor lo recalcula al crear la reserva y otra vez al confirmarla.

&#91;embedded content: flujo de una reserva · 2 pasos, 5 estados\]

Si `pending_blocks_slot` está activo, una solicitud pendiente ya ocupa su horario; al confirmar se revalida solo contra citas confirmadas.

Reprogramar no cambia el estado: la cita sigue confirmada en la nueva hora, siempre que no choque con otra confirmada. Las pendientes vencidas pasan a canceladas solo cuando ella lo decide, una por una o en bloque.

**Reglas del cálculo** (`calculateSlots`, función pura sin acceso a la BD)

1. Toma las franjas del día de la semana; un día bloqueado completo no ofrece nada.
2. Recorre cada franja en pasos de `slot_step_minutes`; el servicio debe terminar antes del fin de la franja.
3. Descarta horarios antes de ahora más la anticipación mínima, o fechas fuera de `max_days_ahead`.
4. Descarta si, ampliado con el buffer a ambos lados, choca con una cita que ocupa horario.
5. Descarta si choca con un bloqueo parcial.

**Prueba con datos en memoria** — franja de 4:30 a 8:30 pm, servicio de 90 min:

| Caso | Horarios ofrecidos |
| --- | --- |
| Sin citas | 4:30, 5:00, 5:30, 6:00, 6:30, 7:00 pm |
| Cita de 6:00 a 7:30 pm | 4:30 pm |
| Misma cita + buffer de 30 min | Ninguno |
| Bloqueo de 7:00 a 8:30 pm | 4:30, 5:00, 5:30 pm |
| Hoy a las 6:00 am con 12 h de anticipación | 6:00, 6:30, 7:00 pm |

## Costos y límites

Costo mensual esperado: $0. Ningún plan cobra excedentes en Free: al topar un límite el servicio se suspende hasta el siguiente ciclo, así que hay que vigilar dos cifras: la transferencia de Neon y los créditos de Netlify.

| Servicio | Plan Free | Qué pasa al topar |
| --- | --- | --- |
| Neon Postgres | 1 GB por proyecto, 100 CU-hours al mes, scale to zero a los 5 min | Cómputo suspendido o escrituras fallan |
| Neon transferencia | 5 GB al mes por proyecto, compartidos entre Postgres y Object Storage | Cómputo suspendido |
| Neon Object Storage | 5 GB por proyecto; en planes pagos $0.023/GB-mes | — |
| Netlify | 300 créditos al mes: deploy de producción 15, ancho de banda 20 por GB (por verificar) | Sitio pausado |

Fuentes: [planes de Neon](https://neon.com/docs/introduction/plans) y [límites de Netlify Free](https://netli.fyi/blog/netlify-free-plan-limits-2026), esta última de terceros; confirmar en el dashboard de Netlify.

Para no gastar créditos de Netlify durante el desarrollo, se usan Deploy Previews (gratis) y solo se despliega a producción lo terminado. Si algún día no alcanza, el plan Launch de Neon y Personal de Netlify son de pago por uso o bajo costo.

## Riesgos y supuestos por verificar

El mayor riesgo es Neon Object Storage: es muy nuevo y su documentación no coincide sobre si está en preview privada o beta pública ([overview](https://neon.com/docs/storage/overview)).

| Riesgo o supuesto | Mitigación |
| --- | --- |
| Neon Storage solo en proyectos nuevos en us-east-2 | Proyecto ya creado; confirmar que esté en esa región |
| Neon Storage sin CDN | Miniaturas WebP y keys inmutables; si falla, migrar a Cloudflare R2 cambiando solo endpoint y credenciales |
| Primera petición lenta por scale to zero de Neon | Aceptable para el tráfico actual |
| `neon-http` no soporta transacciones interactivas | Cambios de estado con UPDATE condicionado al estado actual; basta con un solo administrador |
| Safari podría no codificar WebP desde `canvas` (no verificado) | Respaldo automático a JPEG |
| Límites del rate limit propuestos, no confirmados con ella | Constantes en un solo archivo, fáciles de ajustar |
| Ícono `light` del tema con formato distinto | Confirmar que carga; si no, cambiar `:` por `-` |
| Comando de la CLI de Better Auth para generar tablas | Revisar la documentación actual |
| Versión de h3 que trae Nuxt 4 | Confirmar antes de usar imports explícitos de `h3` |
| Nombres exactos de componentes de Nuxt UI v4 | Revisar la documentación de v4 |

Lo verificado hasta ahora: el schema, la lógica de slots, las transiciones de estado, el render de plantillas y las rutas pasan el chequeo de tipos; la lógica de slots y las plantillas se probaron con datos en memoria. Falta probar contra la base de datos real en Neon.

## Fases

Tres fases; al cerrar la fase 1 ya hay un sitio que se le puede presentar a ella. Cada fase termina cuando se cumplen sus criterios, no cuando el agente dice que terminó.

**Fase 1 — Base y contenido**

- [ ] Proyecto Nuxt 4 + Nuxt UI v4 con el tema, deploy en Netlify con Deploy Previews
- [x] Proyecto Neon con base de datos y bucket público (`S3_BUCKET`)
- [ ] Migraciones y seed con los datos de muestra
- [ ] Better Auth con login de admin y rutas `/admin` protegidas
- [ ] Inicio público y panel de contenido: servicios, zonas, galería con subida optimizada, textos

Criterios: `check-connection.ts` pasa; sin sesión, `/admin` redirige al login y las rutas `/api/admin/*` responden 401; una foto de 8 MB se guarda como dos WebP dentro de sus límites; el inicio se ve bien a 375 px de ancho en claro y oscuro.

**Fase 2 — Reservas**

- [ ] Panel de horarios: reglas semanales y bloqueos
- [ ] Disponibilidad y formulario `/reservar` con rate limit
- [ ] Panel de solicitudes: confirmar, rechazar, reprogramar, cancelar, completar, anticipo
- [ ] Plantillas de WhatsApp: CRUD y modal para elegir y enviar
- [ ] Ajustes avanzados: cancelar todas las pendientes vencidas

Criterios: una cita confirmada impide ofrecer otra que choque, incluido el buffer; reservar un horario ya ocupado responde 409; reprogramar sobre una confirmada responde 409 y no cambia nada; una transición no válida responde 409; la tercera solicitud pendiente del mismo teléfono se rechaza; el enlace de WhatsApp abre con el texto y el número `503` correctos.

**Fase 3 — Pulido**

- [ ] Consulta de reserva por código
- [ ] SEO local, imagen Open Graph para compartir en Instagram y WhatsApp
- [ ] PWA opcional

**Para validar con ella al presentar**

- [ ] Lista de servicios, precios y duración de cada uno
- [ ] Horario real de sábado y domingo
- [ ] Zonas que cubre y si cobra traslado
- [ ] Si pedirá anticipo
- [ ] Si necesita tiempo de traslado entre citas
- [ ] Límites del rate limit

## Instrucciones para el agente

El agente trabaja con este plan exportado a `docs/plan.md` y con `AGENTS.md` en la raíz del repo, que resume convenciones, reglas de negocio, archivos existentes y lo que falta por fase.

**Cómo trabajar con él**

1. Copia al repo los archivos ya escritos, `AGENTS.md` y este plan exportado como Markdown.
2. Pídele una fase a la vez y que primero proponga la lista de archivos que va a tocar.
3. Al cerrar cada fase, corre `check-connection.ts` y `tests/logic.test.ts`, revisa el diff y verifica los criterios de aceptación.

**Reglas clave de `AGENTS.md`**

- No inventar APIs: verificar en la documentación actual de Nuxt UI v4, Better Auth, Drizzle y Nitro, o decir que no pudo.
- No rellenar huecos de negocio: preguntar.
- Funciones en `server/utils` y rutas delgadas; nada de capas de Actions, Repositories o Strategy.
- Cambios de estado solo con `server/utils/bookings.ts`; disponibilidad siempre recalculada en el servidor.
- Solo el tema dado; español y primero para celular.

**Ya escrito y verificado** (chequeo de tipos y 10 pruebas de lógica pura que pasan; sin probar contra Neon todavía)

| Área | Archivos |
| --- | --- |
| Base de datos | `schema.ts`, `seed.ts`, `db.ts`, `drizzle.config.ts` |
| Reglas de negocio | `slots.ts`, `availability.ts`, `booking-status.ts`, `bookings.ts`, `rate-limit.ts` |
| WhatsApp | `whatsapp.ts` |
| Imágenes | `image.ts`, `storage.ts`, `app/utils/optimize-image.ts` |
| Rutas | disponibilidad, crear reserva, cambiar estado, reprogramar, cancelar vencidas, subir foto de galería |
| Tema | `app/app.config.ts`, `app/assets/css/main.css` |
| Verificación | `tests/logic.test.ts`, `scripts/check-connection.ts` |

Falta todo el frontend, la integración de Better Auth en Nuxt, las migraciones y los CRUD del panel.
