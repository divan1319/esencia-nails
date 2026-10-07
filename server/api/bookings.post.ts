import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { createError, defineEventHandler, getRequestIP, readValidatedBody } from 'h3'
import { db } from '../utils/db'
import { bookings, services, zones } from '../db/schema'
import { getAvailableSlots, getSettings } from '../utils/availability'
import { enforceBookingRateLimit } from '../utils/rate-limit'

const body = z.object({
  serviceId: z.uuid(),
  zoneId: z.uuid().optional(),
  date: z.iso.date(),
  startMinute: z.number().int().min(0).max(1439),
  clientName: z.string().trim().min(2).max(80),
  clientPhone: z.string().trim().regex(/^\d{8}$/, 'Teléfono de 8 dígitos'),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
  website: z.string().optional(), // honeypot: debe llegar vacío
})

// Sin 0/O ni 1/I para que se pueda dictar por WhatsApp
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generateCode(length = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, body.parse)
  if (input.website) throw createError({ statusCode: 400, statusMessage: 'Solicitud inválida' }) // honeypot

  // Detrás del proxy de Netlify la IP real viene en x-forwarded-for (verificar en producción)
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'desconocida'
  await enforceBookingRateLimit(ip, input.clientPhone)

  const s = await getSettings()

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, input.serviceId), eq(services.active, true)))
  if (!service) throw createError({ statusCode: 404, statusMessage: 'Servicio no encontrado' })

  const zone = input.zoneId
    ? (await db.select().from(zones).where(and(eq(zones.id, input.zoneId), eq(zones.active, true))))[0]
    : undefined
  if (input.zoneId && !zone) throw createError({ statusCode: 400, statusMessage: 'Zona no válida' })

  // Nunca confiar en el slot que manda el cliente: se recalcula
  const slots = await getAvailableSlots({ date: input.date, durationMinutes: service.durationMinutes, settings: s })
  const slot = slots.find((x) => x.startMinute === input.startMinute)
  if (!slot) throw createError({ statusCode: 409, statusMessage: 'Ese horario ya no está disponible' })

  const travelFee = s.chargeTravelFee ? (zone?.travelFeeCents ?? 0) : 0
  const price = service.priceType === 'quote' ? null : service.priceCents

  let deposit = 0
  if (s.depositMode === 'fixed') deposit = s.depositValue
  if (s.depositMode === 'percent' && price !== null) deposit = Math.round(((price + travelFee) * s.depositValue) / 100)
  // Si es 'percent' y el servicio es a cotizar, queda en 0 y ella lo define al confirmar

  const [created] = await db
    .insert(bookings)
    .values({
      code: generateCode(),
      serviceId: service.id,
      zoneId: zone?.id,
      date: input.date,
      startMinute: slot.startMinute,
      endMinute: slot.endMinute,
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      address: input.address,
      notes: input.notes,
      serviceNameSnapshot: service.name,
      priceTypeSnapshot: service.priceType,
      priceCentsSnapshot: price,
      travelFeeCentsSnapshot: travelFee,
      depositCentsSnapshot: deposit,
      depositStatus: s.depositMode === 'none' ? 'not_required' : 'pending',
    })
    .returning({ code: bookings.code })

  return { code: created!.code, onRequest: slot.onRequest }
})
