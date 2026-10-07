# Esencia Nails — instrucciones para el agente

App web para Esencia Nails by Mel (Santa Tecla, servicio a domicilio): inicio público, reservas sin cuenta y panel administrativo para una sola usuaria (la dueña).

La fuente de verdad del producto es `docs/plan.md` (exportado del plan). Si algo de este archivo choca con el plan, pregunta antes de decidir.

## Forma de trabajo

1. Trabaja **una fase a la vez** (ver "Fases" en `docs/plan.md`). No adelantes trabajo de otra fase.
2. Antes de escribir código, **propón la lista de archivos** que vas a crear o tocar y espera aprobación.
3. Una fase termina cuando se cumplen sus **criterios de aceptación** del plan, no antes. Al terminar, di cuáles verificaste y cómo.
4. **No inventes APIs.** Para Nuxt 4, Nuxt UI v4, Better Auth, Drizzle, Nitro/h3 y Netlify, verifica en la documentación actual. Si no puedes verificar algo, dilo explícitamente en lugar de suponer.
5. **No rellenes huecos con suposiciones.** Si una regla de negocio no está en el plan, pregunta.
6. Código pragmático y legible: funciones en `server/utils`, rutas delgadas. **Nada de** capas de Actions, Repositories, Services genéricos, Strategy o Pipes salvo que se pida.
7. No cambies sin preguntar: la semántica del schema, las transiciones de estado, los límites de imágenes ni el tema visual.

## Stack

- Nuxt 4 + Nuxt UI v4, desplegado en **Netlify** (Vercel Hobby no permite uso comercial).
- Postgres en **Neon** con Drizzle ORM y driver `neon-http`. **No soporta `db.transaction`**: los cambios de estado son UPDATE condicionados al estado actual.
- Fotos en **Neon Object Storage** (compatible con S3), un solo bucket público `S3_BUCKET`.
- Better Auth con correo y contraseña, `disableSignUp: true`. La cuenta de ella la crea el seed.
- Zod 4 para validar query y body.

Versiones con las que se verificó el código existente: drizzle-orm 0.45.3, better-auth 1.7.7, zod 4.6.5, h3 1.15.11, @aws-sdk/client-s3 3.x. Las rutas importan explícitamente de `h3`; confirma que coincide con la versión de h3 que trae Nuxt 4, o quita los imports y usa los auto-imports.

## Variables de entorno

Ver `.env.example`. El servidor lee `process.env` directamente. `SEED_ADMIN_*` solo las usa el seed.

## Convenciones (obligatorias)

- **Horas** = minutos desde medianoche, hora local de El Salvador (16:30 = 990). **Fechas** = texto `YYYY-MM-DD`. **Zona horaria** = `America/El_Salvador` vía `localNow()`; nunca la del servidor.
- **weekday**: 0 = domingo … 6 = sábado.
- **Dinero** = centavos (`integer`). Se muestra como `$12.50`.
- **Teléfonos** = 8 dígitos sin código de país; el enlace de WhatsApp agrega `503`.
- **Disponibilidad**: siempre `getAvailableSlots()` / `calculateSlots()` en el servidor. Nunca confíes en el horario que manda el cliente.
- **Cambios de estado**: solo con las funciones de `server/utils/bookings.ts`. Transiciones válidas en `server/utils/booking-status.ts`.
- **Copias de valores**: cada reserva guarda nombre del servicio, precio, traslado y anticipo vigentes al crearla. Muestra siempre esas copias, no los valores actuales.
- **Imágenes**: solo la admin sube fotos, solo a la galería. Primero `optimizeImage()` en el navegador y luego `POST /api/admin/gallery`. No uses `sharp`. Las clientas **no** suben fotos; el formulario enlaza a WhatsApp para mandar referencias.
- **WhatsApp**: `renderTemplate()`, `bookingVars()` y `whatsappLink()` de `server/utils/whatsapp.ts`. Una variable vacía o desconocida se deja visible en la vista previa.
- **Rate limit**: `enforceBookingRateLimit()`; los límites son constantes en `server/utils/rate-limit.ts`.
- **UI**: español, primero para celular (375 px), modo claro y oscuro. Usa solo el tema de `app/app.config.ts` y `app/assets/css/main.css`; íconos Material Symbols (`@iconify-json/material-symbols`).

## Reglas de negocio clave

- Toda reserva entra **pendiente**. Solo ella confirma, rechaza, cancela, reprograma o completa.
- **Reprogramar** deja la reserva **confirmada** en la nueva hora, si no choca con otra confirmada.
- **Cancelar**: solo ella; después elige una plantilla y avisa por WhatsApp.
- **Pendientes vencidas**: pasan a canceladas a mano, una por una, o con "Cancelar pendientes vencidas" en Ajustes avanzados.
- **Completada**: se marca a mano.
- Después de confirmar, rechazar, reprogramar o cancelar, el panel abre un modal para elegir una plantilla activa de ese tipo, ver la vista previa editable y abrir WhatsApp.

## Lo que ya existe

| Archivo | Qué es |
| --- | --- |
| `server/db/schema.ts` | Schema completo de Drizzle (sin las tablas de Better Auth) |
| `server/db/seed.ts` | Datos de muestra del perfil de Instagram + usuario admin |
| `server/utils/db.ts` | Cliente Drizzle `neon-http` |
| `server/utils/auth.ts` | Better Auth + `requireAdmin(event)` |
| `server/utils/slots.ts` | Cálculo puro de horarios, `localNow`, `formatMinute` |
| `server/utils/availability.ts` | Carga datos de la BD y llama a `calculateSlots` |
| `server/utils/booking-status.ts` | Transiciones de estado válidas |
| `server/utils/bookings.ts` | Confirmar, rechazar, cancelar, completar, reprogramar, cancelar vencidas |
| `server/utils/whatsapp.ts` | Plantillas, variables y enlace `wa.me` |
| `server/utils/rate-limit.ts` | Rate limit del formulario público |
| `server/utils/image.ts` | Límites y detección de formato por bytes |
| `server/utils/storage.ts` | Cliente S3 de Neon, subir, borrar, URL pública |
| `server/api/availability.get.ts` | Horarios libres por servicio y fecha |
| `server/api/bookings.post.ts` | Crear solicitud (honeypot, rate limit, revalidación) |
| `server/api/admin/bookings/[id]/status.post.ts` | `confirm`, `reject`, `cancel`, `complete` |
| `server/api/admin/bookings/[id]/reschedule.post.ts` | Reprogramar |
| `server/api/admin/bookings/cancel-expired.post.ts` | Cancelar pendientes vencidas |
| `server/api/admin/gallery.post.ts` | Subida de las dos versiones de una foto |
| `app/utils/optimize-image.ts` | Optimización en el navegador y `FormData` para la subida |
| `app/app.config.ts`, `app/assets/css/main.css` | Tema de Nuxt UI |
| `tests/logic.test.ts` | Pruebas de la lógica pura (10 casos) |
| `scripts/check-connection.ts` | Verifica Postgres y el bucket |

## Lo que falta (por fase)

- **Fase 1**: proyecto Nuxt con estos archivos; ruta de Better Auth (`server/api/auth/[...all].ts`, verificar en la doc de Better Auth para Nuxt) y cliente en el frontend; generar las tablas de Better Auth en `server/db/auth-schema.ts` y sumarlas en `db.ts` (ver comentario ahí); migraciones; middleware que proteja `/admin`; inicio público; CRUD de servicios, zonas, categorías, textos y galería (incluye borrar fotos con `deleteImage`).
- **Fase 2**: CRUD de reglas de horario y bloqueos; página `/reservar` por pasos; listado de solicitudes con filtros por estado y fecha; modal de plantillas; CRUD de plantillas; Ajustes avanzados; edición de los campos de `settings`.
- **Fase 3**: `/reserva/[codigo]`, SEO local, Open Graph, PWA opcional.

## Comandos

```bash
npx tsx --env-file=.env scripts/check-connection.ts   # conexión a Neon
npx tsx --test tests/logic.test.ts                     # lógica pura
npx drizzle-kit generate && npx drizzle-kit migrate    # migraciones
npx tsx --env-file=.env server/db/seed.ts              # datos de muestra (una sola vez)
```

El comando de la CLI de Better Auth para generar su schema cambia entre versiones: verifícalo en su documentación.

## Pendiente de verificar

- `forcePathStyle: true` en el cliente S3 de Neon (si `check-connection` falla en el bucket, probar sin él).
- Que Safari codifique WebP desde `canvas` (hay respaldo a JPEG).
- Que `getRequestIP(event, { xForwardedFor: true })` dé la IP real detrás de Netlify.
- El ícono `light` del tema usa `i-material-symbols:` con dos puntos.
- Límites del rate limit y horario de fin de semana: son propuestas, se confirman con ella.
