import { z } from 'zod'
import { defineEventHandler, readValidatedBody } from 'h3'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { templateKind, whatsappTemplates } from '../../../db/schema'

const templateSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  kind: z.enum(templateKind.enumValues),
  body: z.string().trim().min(1, 'El texto del mensaje es requerido'),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const data = await readValidatedBody(event, templateSchema.parse)

  const [created] = await db
    .insert(whatsappTemplates)
    .values(data)
    .returning()

  return created
})
