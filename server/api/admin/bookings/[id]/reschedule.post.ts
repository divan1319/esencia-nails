import { z } from 'zod'
import { defineEventHandler, getRouterParam, readValidatedBody } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { rescheduleBooking } from '../../../../utils/bookings'

const body = z.object({
  date: z.iso.date(),
  startMinute: z.number().int().min(0).max(1439),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const { date, startMinute } = await readValidatedBody(event, body.parse)
  return rescheduleBooking(id, date, startMinute)
})
