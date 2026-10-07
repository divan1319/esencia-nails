import { z } from 'zod'
import { defineEventHandler, readValidatedBody } from 'h3'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { zones } from '../../../db/schema'

const createSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  travelFeeCents: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const data = await readValidatedBody(event, createSchema.parse)

  const [zone] = await db.insert(zones).values(data).returning()
  return zone
})
