import { createError, defineEventHandler, getRouterParam } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { galleryItems } from '../../../db/schema'
import { deleteImage } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

  const [item] = await db
    .select()
    .from(galleryItems)
    .where(eq(galleryItems.id, id))

  if (!item) throw createError({ statusCode: 404, statusMessage: 'Foto no encontrada' })

  await Promise.allSettled([
    deleteImage(item.thumbKey),
    deleteImage(item.fullKey),
  ])

  await db.delete(galleryItems).where(eq(galleryItems.id, id))

  return { ok: true, id }
})
