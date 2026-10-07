// Uso: npx tsx --env-file=.env scripts/create-admin.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../server/utils/db'

const email = process.env.SEED_ADMIN_EMAIL
const password = process.env.SEED_ADMIN_PASSWORD

if (!email || !password) {
  console.error('Faltan SEED_ADMIN_EMAIL y/o SEED_ADMIN_PASSWORD en .env')
  process.exit(1)
}

const seedAuth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
})

try {
  await seedAuth.api.signUpEmail({ body: { name: 'Mel', email, password } })
  console.log(`Usuario admin creado exitosamente: ${email}`)
} catch (e: any) {
  console.error('Error al crear usuario admin:', e.message || e)
}
