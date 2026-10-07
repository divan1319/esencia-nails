import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { createError, defineEventHandler, getValidatedQuery } from 'h3'
import { db } from '../utils/db'
import { services } from '../db/schema'
import { getAvailableSlots, getSettings } from '../utils/availability'

const query = z.object({
  serviceId: z.uuid(),
  date: z.iso.date(),
})

export default defineEventHandler(async (event) => {
  const { serviceId, date } = await getValidatedQuery(event, query.parse)

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.active, true)))
  if (!service) throw createError({ statusCode: 404, statusMessage: 'Servicio no encontrado' })

  const slots = await getAvailableSlots({
    date,
    durationMinutes: service.durationMinutes,
    settings: await getSettings(),
  })

  return { date, slots }
})
