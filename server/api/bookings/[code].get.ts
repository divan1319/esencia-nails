import { createError, defineEventHandler, getRouterParam } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../../utils/db'
import { bookings } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const rawCode = getRouterParam(event, 'code')
  if (!rawCode) throw createError({ statusCode: 400, statusMessage: 'Código requerido' })

  const code = rawCode.trim().toUpperCase()

  const [booking] = await db
    .select({
      code: bookings.code,
      status: bookings.status,
      date: bookings.date,
      startMinute: bookings.startMinute,
      endMinute: bookings.endMinute,
      clientName: bookings.clientName,
      clientPhone: bookings.clientPhone,
      address: bookings.address,
      notes: bookings.notes,
      serviceNameSnapshot: bookings.serviceNameSnapshot,
      priceTypeSnapshot: bookings.priceTypeSnapshot,
      priceCentsSnapshot: bookings.priceCentsSnapshot,
      travelFeeCentsSnapshot: bookings.travelFeeCentsSnapshot,
      depositCentsSnapshot: bookings.depositCentsSnapshot,
      depositStatus: bookings.depositStatus,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .where(eq(bookings.code, code))

  if (!booking) {
    throw createError({ statusCode: 404, statusMessage: 'Reserva no encontrada con ese código' })
  }

  return booking
})
