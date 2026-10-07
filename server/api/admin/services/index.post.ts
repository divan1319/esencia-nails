import { z } from 'zod'
import { defineEventHandler, readValidatedBody } from 'h3'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { services } from '../../../db/schema'

const createSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  description: z.string().trim().nullable().optional(),
  priceType: z.enum(['fixed', 'from', 'quote']).default('from'),
  priceCents: z.number().int().min(0).nullable().optional(),
  durationMinutes: z.number().int().positive('La duración debe ser mayor a 0'),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const data = await readValidatedBody(event, createSchema.parse)

  const [service] = await db
    .insert(services)
    .values({
      name: data.name,
      description: data.description,
      priceType: data.priceType,
      priceCents: data.priceType === 'quote' ? null : data.priceCents,
      durationMinutes: data.durationMinutes,
      active: data.active,
      sortOrder: data.sortOrder,
    })
    .returning()

  return service
})
