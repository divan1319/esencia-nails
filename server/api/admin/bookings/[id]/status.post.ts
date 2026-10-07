import { z } from 'zod'
import { defineEventHandler, getRouterParam, readValidatedBody } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { cancelBooking, completeBooking, confirmBooking, rejectBooking } from '../../../../utils/bookings'

const body = z.object({ action: z.enum(['confirm', 'reject', 'cancel', 'complete']) })

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const { action } = await readValidatedBody(event, body.parse)

  const actions = { confirm: confirmBooking, reject: rejectBooking, cancel: cancelBooking, complete: completeBooking }
  return actions[action](id)
})
