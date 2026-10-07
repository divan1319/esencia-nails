// Uso: npx tsx --env-file=.env server/db/seed.ts
// Datos tomados del perfil de Instagram (esencianailssv). Lo marcado [EJEMPLO] lo reemplaza ella desde el panel.
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../utils/db'
import {
  availabilityRules,
  galleryCategories,
  services,
  settings,
  whatsappTemplates,
  zones,
} from './schema'

const [existing] = await db.select({ id: settings.id }).from(settings)
if (existing) {
  console.log('Ya hay datos (settings existe). No se hizo nada.')
  process.exit(0)
}

await db.insert(settings).values({
  id: 1,
  businessName: 'Esencia Nails by Mel',
  tagline: 'Santa Tecla · Servicio a domicilio',
  heroText: '[EJEMPLO] Uñas con diseño, a domicilio en Santa Tecla. Puedes cotizar tu diseño.',
  whatsapp: '79581732',
  instagramUrl: 'https://www.instagram.com/esencianailssv/',
  paymentMethodsText: 'Efectivo o transferencia',
})

await db.insert(services).values([
  {
    name: 'Diseño personalizado',
    description: 'Manda tu idea o foto de referencia por WhatsApp y te cotizamos. [EJEMPLO: duración]',
    priceType: 'quote',
    durationMinutes: 120,
    sortOrder: 0,
  },
  { name: '[EJEMPLO] Esmaltado en gel', priceType: 'quote', durationMinutes: 60, sortOrder: 1 },
  { name: '[EJEMPLO] Uñas acrílicas', priceType: 'quote', durationMinutes: 120, sortOrder: 2 },
  { name: '[EJEMPLO] Retiro', priceType: 'quote', durationMinutes: 30, sortOrder: 3 },
])

await db.insert(zones).values({ name: 'Santa Tecla', travelFeeCents: 0 })

await db.insert(galleryCategories).values([
  { name: 'Puntos', slug: 'puntos', sortOrder: 0 },
  { name: 'Aurora', slug: 'aurora', sortOrder: 1 },
  { name: 'Moños', slug: 'monos', sortOrder: 2 },
  { name: 'Estrellas', slug: 'estrellas', sortOrder: 3 },
])

// Lunes a viernes 4:30 a 8:30 pm (publicación de horario).
// Sábado y domingo "sujeto a disponibilidad": bajo solicitud, horas [EJEMPLO] 9:00 am a 5:00 pm.
await db.insert(availabilityRules).values([
  ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMinute: 990, endMinute: 1230, mode: 'auto' as const })),
  ...[6, 0].map((weekday) => ({ weekday, startMinute: 540, endMinute: 1020, mode: 'on_request' as const })),
])

await db.insert(whatsappTemplates).values([
  {
    name: 'Confirmación',
    kind: 'confirmation',
    body: '¡Hola {{nombre}}! Tu cita de {{servicio}} quedó confirmada para el {{fecha}} a las {{hora}}. Código: {{codigo}}. ¡Será un gusto atenderte!',
  },
  {
    name: 'Rechazo',
    kind: 'rejection',
    body: 'Hola {{nombre}}, lamentablemente no tengo disponibilidad el {{fecha}} a las {{hora}}. ¿Te puedo ofrecer otro horario?',
  },
  {
    name: 'Reprogramación',
    kind: 'reschedule',
    body: 'Hola {{nombre}}, tu cita de {{servicio}} quedó reprogramada para el {{fecha}} a las {{hora}}. Código: {{codigo}}.',
  },
  {
    name: 'Cancelación',
    kind: 'cancellation',
    body: 'Hola {{nombre}}, tu cita del {{fecha}} a las {{hora}} fue cancelada. Escríbeme si quieres agendar otra fecha.',
  },
  {
    name: 'Anticipo',
    kind: 'deposit',
    body: 'Hola {{nombre}}, para confirmar tu cita del {{fecha}} a las {{hora}} necesito un anticipo de {{anticipo}}. {{instrucciones_anticipo}}',
  },
  {
    name: 'Recordatorio',
    kind: 'reminder',
    body: 'Hola {{nombre}}, te recuerdo tu cita de {{servicio}} el {{fecha}} a las {{hora}}. ¡Nos vemos!',
  },
])

// Cuenta de ella. Instancia aparte con registro habilitado solo para este script:
// la app usa disableSignUp. Requiere que las tablas de Better Auth ya estén migradas.
const email = process.env.SEED_ADMIN_EMAIL
const password = process.env.SEED_ADMIN_PASSWORD
if (email && password) {
  const seedAuth = betterAuth({
    database: drizzleAdapter(db, { provider: 'pg' }),
    emailAndPassword: { enabled: true },
  })
  await seedAuth.api.signUpEmail({ body: { name: 'Mel', email, password } })
  console.log(`Usuario admin creado: ${email}`)
} else {
  console.log('Sin SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD: no se creó el usuario admin.')
}

console.log('Seed listo.')
