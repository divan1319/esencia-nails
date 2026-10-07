import { z } from 'zod'
import { createError, defineEventHandler, getRouterParam, readValidatedBody } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { galleryItems } from '../../../db/schema'

const updateSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  alt: z.string().trim().nullable().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

  const data = await readValidatedBody(event, updateSchema.parse)

  const [item] = await db
    .update(galleryItems)
    .set(data)
    .where(eq(galleryItems.id, id))
    .returning()

  if (!item) throw createError({ statusCode: 404, statusMessage: 'Foto no encontrada' })

  return item
})
