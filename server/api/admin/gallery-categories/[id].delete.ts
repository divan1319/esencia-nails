import { createError, defineEventHandler, getRouterParam } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { galleryCategories } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

  const [deleted] = await db
    .delete(galleryCategories)
    .where(eq(galleryCategories.id, id))
    .returning()

  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada' })

  return { ok: true, deleted }
})
