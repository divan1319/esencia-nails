import { z } from 'zod'
import { createError, defineEventHandler, getRouterParam, readValidatedBody } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { galleryCategories } from '../../../db/schema'

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  sortOrder: z.number().int().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

  const data = await readValidatedBody(event, updateSchema.parse)

  const [category] = await db
    .update(galleryCategories)
    .set(data)
    .where(eq(galleryCategories.id, id))
    .returning()

  if (!category) throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada' })

  return category
})
