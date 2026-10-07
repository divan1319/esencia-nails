import { and, eq, inArray, ne } from 'drizzle-orm'
import { db } from './db'
import { availabilityRules, blockedDates, bookings, settings, type Settings } from '../db/schema'
import { calculateSlots, weekdayOf, type Range, type Slot } from './slots'

export async function getSettings(): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1))
  if (!row) throw new Error('Falta la fila de settings: corre el seed')
  return row
}

type Options = {
  date: string
  durationMinutes: number
  settings: Settings
  /** Al confirmar, solo cuentan las confirmadas y se excluye la propia reserva */
  onlyConfirmed?: boolean
  excludeBookingId?: string
}

export async function getAvailableSlots(opts: Options): Promise<Slot[]> {
  const { date, durationMinutes, settings: s } = opts

  const blockingStatuses: ('pending' | 'confirmed')[] =
    !opts.onlyConfirmed && s.pendingBlocksSlot ? ['pending', 'confirmed'] : ['confirmed']

  const [rules, blocks, taken] = await Promise.all([
    db.select().from(availabilityRules).where(eq(availabilityRules.weekday, weekdayOf(date))),
    db.select().from(blockedDates).where(eq(blockedDates.date, date)),
    db
      .select({ start: bookings.startMinute, end: bookings.endMinute })
      .from(bookings)
      .where(
        and(
          eq(bookings.date, date),
          inArray(bookings.status, blockingStatuses),
          opts.excludeBookingId ? ne(bookings.id, opts.excludeBookingId) : undefined,
        ),
      ),
  ])

  return calculateSlots({
    date,
    rules,
    blocks,
    busy: taken as Range[],
    durationMinutes,
    bufferMinutes: s.travelBufferMinutes,
    stepMinutes: s.slotStepMinutes,
    minNoticeHours: s.minNoticeHours,
    maxDaysAhead: s.maxDaysAhead,
  })
}
