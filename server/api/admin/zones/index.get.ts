import { defineEventHandler } from 'h3'
import { asc } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { zones } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return db.select().from(zones).orderBy(asc(zones.sortOrder), asc(zones.name))
})
