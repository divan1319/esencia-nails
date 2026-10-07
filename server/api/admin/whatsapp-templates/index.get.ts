import { defineEventHandler } from 'h3'
import { asc } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { whatsappTemplates } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return db
    .select()
    .from(whatsappTemplates)
    .orderBy(asc(whatsappTemplates.sortOrder), asc(whatsappTemplates.name))
})
