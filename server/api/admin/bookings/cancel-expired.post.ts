import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { cancelExpiredPending } from '../../../utils/bookings'

// Ajustes avanzados: cancela de una vez todas las pendientes cuya hora ya pasó
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return { cancelled: await cancelExpiredPending() }
})
