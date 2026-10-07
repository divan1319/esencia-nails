import { z } from 'zod'
import { defineEventHandler, readValidatedBody } from 'h3'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { galleryCategories } from '../../../db/schema'

const createSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  slug: z
    .string()
    .trim()
    .min(1, 'El slug es obligatorio')
    .regex(/^[a-z0-9-]+$/, 'Slug inválido (solo letras minúsculas, números y guiones)'),
  sortOrder: z.number().int().default(0),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const data = await readValidatedBody(event, createSchema.parse)

  const [category] = await db.insert(galleryCategories).values(data).returning()
  return category
})
