import { z } from 'zod'
import { createError, defineEventHandler, readValidatedBody } from 'h3'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { availabilityRules } from '../../../db/schema'

const ruleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(0).max(1439),
  mode: z.enum(['auto', 'on_request']).default('auto'),
}).refine((data) => data.endMinute > data.startMinute, {
  message: 'El minuto de fin debe ser mayor al minuto de inicio',
  path: ['endMinute'],
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const data = await readValidatedBody(event, ruleSchema.parse)

  const [created] = await db
    .insert(availabilityRules)
    .values(data)
    .returning()

  return created
})
