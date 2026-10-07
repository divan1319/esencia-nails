import { defineEventHandler } from 'h3'
import { asc, eq } from 'drizzle-orm'
import { db } from '../utils/db'
import { services } from '../db/schema'

export default defineEventHandler(async () => {
  return db
    .select()
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.sortOrder), asc(services.name))
})
