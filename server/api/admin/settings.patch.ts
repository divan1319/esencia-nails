import { z } from 'zod'
import { defineEventHandler, readValidatedBody } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'
import { settings } from '../../db/schema'

const updateSchema = z.object({
  businessName: z.string().trim().min(1).optional(),
  tagline: z.string().trim().nullable().optional(),
  heroText: z.string().trim().nullable().optional(),
  whatsapp: z.string().trim().nullable().optional(),
  instagramUrl: z.string().trim().nullable().optional(),
  paymentMethodsText: z.string().trim().nullable().optional(),
  slotStepMinutes: z.number().int().positive().optional(),
  travelBufferMinutes: z.number().int().min(0).optional(),
  minNoticeHours: z.number().int().min(0).optional(),
  maxDaysAhead: z.number().int().positive().optional(),
  pendingBlocksSlot: z.boolean().optional(),
  chargeTravelFee: z.boolean().optional(),
  depositMode: z.enum(['none', 'fixed', 'percent']).optional(),
  depositValue: z.number().int().min(0).optional(),
  depositInstructions: z.string().trim().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, updateSchema.parse)

  const [updated] = await db
    .update(settings)
    .set(body)
    .where(eq(settings.id, 1))
    .returning()

  return updated
})
