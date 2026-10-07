import { z } from 'zod'
import { createError, defineEventHandler, getRouterParam, readValidatedBody } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { availabilityRules } from '../../../db/schema'

const updateSchema = z.object({
  weekday: z.number().int().min(0).max(6).optional(),
  startMinute: z.number().int().min(0).max(1439).optional(),
  endMinute: z.number().int().min(0).max(1439).optional(),
  mode: z.enum(['auto', 'on_request']).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

  const data = await readValidatedBody(event, updateSchema.parse)

  const [current] = await db
    .select()
    .from(availabilityRules)
    .where(eq(availabilityRules.id, id))

  if (!current) throw createError({ statusCode: 404, statusMessage: 'Regla no encontrada' })

  const newStart = data.startMinute ?? current.startMinute
  const newEnd = data.endMinute ?? current.endMinute

  if (newEnd <= newStart) {
    throw createError({ statusCode: 400, statusMessage: 'El fin debe ser mayor al inicio' })
  }

  const [updated] = await db
    .update(availabilityRules)
    .set(data)
    .where(eq(availabilityRules.id, id))
    .returning()

  return updated
})
