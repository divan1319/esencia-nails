import { z } from 'zod'
import { createError, defineEventHandler, getRouterParam, readValidatedBody } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../../../../utils/db'
import { requireAdmin } from '../../../../utils/auth'
import { bookings, depositStatus } from '../../../../db/schema'

const updateSchema = z.object({
  adminNotes: z.string().trim().nullable().optional(),
  depositStatus: z.enum(depositStatus.enumValues).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

  const data = await readValidatedBody(event, updateSchema.parse)

  const [updated] = await db
    .update(bookings)
    .set(data)
    .where(eq(bookings.id, id))
    .returning()

  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Reserva no encontrada' })

  return updated
})
