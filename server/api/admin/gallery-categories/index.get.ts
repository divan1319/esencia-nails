import { defineEventHandler } from 'h3'
import { asc } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { galleryCategories } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return db.select().from(galleryCategories).orderBy(asc(galleryCategories.sortOrder), asc(galleryCategories.name))
})
