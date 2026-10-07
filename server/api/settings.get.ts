import { defineEventHandler } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../utils/db'
import { settings } from '../db/schema'

export default defineEventHandler(async () => {
  const [data] = await db.select().from(settings).where(eq(settings.id, 1))
  return data ?? null
})
