import { z } from 'zod'
import { createError, defineEventHandler, getRouterParam, readValidatedBody } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { services } from '../../../db/schema'

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  priceType: z.enum(['fixed', 'from', 'quote']).optional(),
  priceCents: z.number().int().min(0).nullable().optional(),
  durationMinutes: z.number().int().positive().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

  const data = await readValidatedBody(event, updateSchema.parse)

  const valuesToSet = { ...data }
  if (data.priceType === 'quote') {
    valuesToSet.priceCents = null
  }

  const [service] = await db
    .update(services)
    .set(valuesToSet)
    .where(eq(services.id, id))
    .returning()

  if (!service) throw createError({ statusCode: 404, statusMessage: 'Servicio no encontrado' })

  return service
})
