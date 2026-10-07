import { z } from 'zod'
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm'
import { defineEventHandler, getValidatedQuery } from 'h3'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { bookings, bookingStatus } from '../../../db/schema'

const querySchema = z.object({
  status: z.enum(bookingStatus.enumValues).optional(),
  date: z.iso.date().optional(),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = await getValidatedQuery(event, querySchema.parse)

  const conditions = []

  if (q.status) {
    conditions.push(eq(bookings.status, q.status))
  }
  if (q.date) {
    conditions.push(eq(bookings.date, q.date))
  }
  if (q.dateFrom) {
    conditions.push(gte(bookings.date, q.dateFrom))
  }
  if (q.dateTo) {
    conditions.push(lte(bookings.date, q.dateTo))
  }

  const query = db
    .select()
    .from(bookings)
    .orderBy(desc(bookings.date), desc(bookings.startMinute))

  if (conditions.length > 0) {
    return query.where(and(...conditions))
  }

  return query
})
