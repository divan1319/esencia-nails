import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../db/schema'
import * as authSchema from '../db/auth-schema'

// neon-http: ideal para serverless (Netlify Functions).
// Ojo: este driver no soporta transacciones interactivas (db.transaction).
const sql = neon(process.env.DATABASE_URL!)

export const db = drizzle(sql, { schema: { ...schema, ...authSchema } })
