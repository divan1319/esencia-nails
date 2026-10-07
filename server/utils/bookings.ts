import { and, eq, inArray, lt, lte, or } from 'drizzle-orm'
import { createError } from 'h3'
import { db } from './db'
import { bookings, type Booking, type BookingStatus } from '../db/schema'
import { getAvailableSlots, getSettings } from './availability'
import { sourcesOf } from './booking-status'
import { localNow } from './slots'

// Todas las escrituras son UPDATE condicionados al estado actual:
// neon-http no tiene transacciones interactivas y con una sola admin basta.

async function findOr404(id: string): Promise<Booking> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, id))
  if (!booking) throw createError({ statusCode: 404, statusMessage: 'Reserva no encontrada' })
  return booking
}

function invalid(booking: Booking, to: BookingStatus): never {
  throw createError({
    statusCode: 409,
    statusMessage: `No se puede pasar de ${booking.status} a ${to}`,
  })
}

/** ¿El horario [date, startMinute] está libre frente a las confirmadas, sin contar esta reserva? */
async function assertFreeForConfirmed(booking: Booking, date: string, startMinute: number) {
  const s = await getSettings()
  const slots = await getAvailableSlots({
    date,
    durationMinutes: booking.endMinute - booking.startMinute,
    // Ella puede agendar para hoy o más allá de la ventana pública
    settings: { ...s, minNoticeHours: 0, maxDaysAhead: 365 },
    onlyConfirmed: true,
    excludeBookingId: booking.id,
  })
  if (!slots.some((x) => x.startMinute === startMinute)) {
    throw createError({ statusCode: 409, statusMessage: 'Choca con otra cita confirmada o con un bloqueo' })
  }
}

async function transition(booking: Booking, to: BookingStatus, extra: Partial<Booking> = {}) {
  const from = sourcesOf(to)
  if (!from.includes(booking.status)) invalid(booking, to)

  const updated = await db
    .update(bookings)
    .set({ ...extra, status: to })
    .where(and(eq(bookings.id, booking.id), eq(bookings.status, booking.status), inArray(bookings.status, from)))
    .returning()
  if (updated.length === 0) {
    throw createError({ statusCode: 409, statusMessage: 'La reserva cambió mientras tanto; recarga' })
  }
  return updated[0]!
}

export async function confirmBooking(id: string) {
  const booking = await findOr404(id)
  if (booking.status !== 'pending') invalid(booking, 'confirmed')
  await assertFreeForConfirmed(booking, booking.date, booking.startMinute)
  return transition(booking, 'confirmed')
}

export async function rejectBooking(id: string) {
  return transition(await findOr404(id), 'rejected')
}

export async function cancelBooking(id: string) {
  return transition(await findOr404(id), 'cancelled')
}

export async function completeBooking(id: string) {
  return transition(await findOr404(id), 'completed')
}

/** Reprogramar: queda confirmada en la nueva fecha y hora. */
export async function rescheduleBooking(id: string, date: string, startMinute: number) {
  const booking = await findOr404(id)
  if (booking.status !== 'pending' && booking.status !== 'confirmed') invalid(booking, 'confirmed')
  await assertFreeForConfirmed(booking, date, startMinute)
  const duration = booking.endMinute - booking.startMinute
  return transition(booking, 'confirmed', { date, startMinute, endMinute: startMinute + duration })
}

/** Ajustes avanzados: pendientes cuya hora de inicio ya pasó -> canceladas. Devuelve cuántas. */
export async function cancelExpiredPending(): Promise<number> {
  const now = localNow()
  const updated = await db
    .update(bookings)
    .set({ status: 'cancelled' })
    .where(
      and(
        eq(bookings.status, 'pending'),
        or(lt(bookings.date, now.date), and(eq(bookings.date, now.date), lte(bookings.startMinute, now.minute))),
      ),
    )
    .returning({ id: bookings.id })
  return updated.length
}
