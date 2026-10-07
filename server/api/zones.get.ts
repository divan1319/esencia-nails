import { defineEventHandler } from 'h3'
import { asc, eq } from 'drizzle-orm'
import { db } from '../utils/db'
import { zones } from '../db/schema'

export default defineEventHandler(async () => {
  return db
    .select()
    .from(zones)
    .where(eq(zones.active, true))
    .orderBy(asc(zones.sortOrder), asc(zones.name))
})
