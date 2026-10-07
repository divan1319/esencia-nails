import { z } from 'zod'
import { createError, defineEventHandler, readValidatedBody } from 'h3'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { blockedDates } from '../../../db/schema'

const blockSchema = z.object({
  date: z.iso.date(),
  startMinute: z.number().int().min(0).max(1439).nullable().optional(),
  endMinute: z.number().int().min(0).max(1439).nullable().optional(),
  reason: z.string().trim().max(200).nullable().optional(),
}).refine(
  (data) => {
    // Si uno está presente, ambos deben estar presentes y endMinute > startMinute
    if (data.startMinute != null || data.endMinute != null) {
      return data.startMinute != null && data.endMinute != null && data.endMinute > data.startMinute
    }
    return true
  },
  {
    message: 'Para bloqueos parciales, ambos minutos son requeridos y fin debe ser mayor a inicio',
    path: ['endMinute'],
  }
)

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const data = await readValidatedBody(event, blockSchema.parse)

  const [created] = await db
    .insert(blockedDates)
    .values({
      date: data.date,
      startMinute: data.startMinute ?? null,
      endMinute: data.endMinute ?? null,
      reason: data.reason ?? null,
    })
    .returning()

  return created
})
