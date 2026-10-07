import { z } from 'zod'
import { createError, defineEventHandler, getRouterParam, readValidatedBody } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { templateKind, whatsappTemplates } from '../../../db/schema'

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  kind: z.enum(templateKind.enumValues).optional(),
  body: z.string().trim().min(1).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

  const data = await readValidatedBody(event, updateSchema.parse)

  const [updated] = await db
    .update(whatsappTemplates)
    .set(data)
    .where(eq(whatsappTemplates.id, id))
    .returning()

  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Plantilla no encontrada' })

  return updated
})
