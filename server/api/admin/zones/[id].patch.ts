import { z } from 'zod'
import { createError, defineEventHandler, getRouterParam, readValidatedBody } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { zones } from '../../../db/schema'

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  travelFeeCents: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

  const data = await readValidatedBody(event, updateSchema.parse)

  const [zone] = await db
    .update(zones)
    .set(data)
    .where(eq(zones.id, id))
    .returning()

  if (!zone) throw createError({ statusCode: 404, statusMessage: 'Zona no encontrada' })

  return zone
})
