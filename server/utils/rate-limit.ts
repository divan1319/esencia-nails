import { and, count, eq, gt, lt } from 'drizzle-orm'
import { createError } from 'h3'
import { db } from './db'
import { bookingAttempts, bookings } from '../db/schema'

// Propuesta, por confirmar con ella
export const MAX_PENDING_PER_PHONE = 2
export const MAX_ATTEMPTS_PER_IP_PER_HOUR = 10

export async function enforceBookingRateLimit(ip: string, phone: string) {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [[byIp], [byPhone]] = await Promise.all([
    db
      .select({ n: count() })
      .from(bookingAttempts)
      .where(and(eq(bookingAttempts.ip, ip), gt(bookingAttempts.createdAt, hourAgo))),
    db
      .select({ n: count() })
      .from(bookings)
      .where(and(eq(bookings.clientPhone, phone), eq(bookings.status, 'pending'))),
  ])

  if ((byIp?.n ?? 0) >= MAX_ATTEMPTS_PER_IP_PER_HOUR) {
    throw createError({ statusCode: 429, statusMessage: 'Demasiados intentos, prueba en un rato' })
  }
  if ((byPhone?.n ?? 0) >= MAX_PENDING_PER_PHONE) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Ya tienes solicitudes pendientes; escríbenos por WhatsApp',
    })
  }

  await db.insert(bookingAttempts).values({ ip, phone })
  // Limpieza barata: los intentos de más de un día ya no sirven
  await db.delete(bookingAttempts).where(lt(bookingAttempts.createdAt, dayAgo))
}
