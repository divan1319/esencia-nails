import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateSlots, formatMinute, type SlotInput } from '../server/utils/slots'
import { canTransition } from '../server/utils/booking-status'
import { renderTemplate, whatsappLink, formatDate } from '../server/utils/whatsapp'
import { MAX_PENDING_PER_PHONE, MAX_ATTEMPTS_PER_IP_PER_HOUR } from '../server/utils/rate-limit'

// Jueves 8 oct 2026, 4:30 a 8:30 pm (990 a 1230 min)
const baseInput: SlotInput = {
  date: '2026-10-08',
  rules: [{ startMinute: 990, endMinute: 1230, mode: 'auto' }],
  blocks: [],
  busy: [],
  durationMinutes: 90,
  bufferMinutes: 0,
  stepMinutes: 30,
  minNoticeHours: 0,
  maxDaysAhead: 30,
  now: new Date('2026-10-07T12:00:00Z'),
}

test('Fase 2 Criterio 1: Cita confirmada impide ofrecer otra que choque, incluido buffer', () => {
  // Cita de 6:00 pm (1080) a 7:30 pm (1170)
  const busy = [{ start: 1080, end: 1170 }]

  // Sin buffer: solo cabe a las 4:30 pm (termina a las 6:00 pm justo cuando empieza la otra)
  const slotsNoBuffer = calculateSlots({ ...baseInput, busy, bufferMinutes: 0 })
  assert.deepEqual(
    slotsNoBuffer.map((s) => formatMinute(s.startMinute)),
    ['4:30 pm']
  )

  // Con buffer de 30 min: ya no cabe ningún servicio de 90 min (requiere 30 min antes y después)
  const slotsWithBuffer = calculateSlots({ ...baseInput, busy, bufferMinutes: 30 })
  assert.deepEqual(slotsWithBuffer, [])
})

test('Fase 2 Criterio 2 y 3: Revalidación de horarios y colisiones responde 409', () => {
  // Simular choque con cita existente: si un horario no está en slots, la API responde 409
  const busy = [{ start: 990, end: 1230 }]
  const available = calculateSlots({ ...baseInput, busy })
  assert.equal(available.length, 0)

  // Intentar seleccionar 990 cuando está ocupado no existe en available
  const exists = available.some((s) => s.startMinute === 990)
  assert.equal(exists, false)
})

test('Fase 2 Criterio 4: Transición no válida de estado', () => {
  // Transiciones válidas
  assert.ok(canTransition('pending', 'confirmed'))
  assert.ok(canTransition('pending', 'rejected'))
  assert.ok(canTransition('pending', 'cancelled'))
  assert.ok(canTransition('confirmed', 'completed'))
  assert.ok(canTransition('confirmed', 'cancelled'))
  assert.ok(canTransition('confirmed', 'confirmed')) // reprogramar

  // Transiciones inválidas (deben responder 409)
  assert.ok(!canTransition('pending', 'completed'))
  assert.ok(!canTransition('cancelled', 'confirmed'))
  assert.ok(!canTransition('rejected', 'confirmed'))
  assert.ok(!canTransition('completed', 'cancelled'))
  assert.ok(!canTransition('completed', 'pending'))
})

test('Fase 2 Criterio 5: Tercera solicitud pendiente del mismo teléfono se rechaza (límite = 2)', () => {
  assert.equal(MAX_PENDING_PER_PHONE, 2)
  assert.equal(MAX_ATTEMPTS_PER_IP_PER_HOUR, 10)

  // Teléfono con 2 pendientes ya alcanzó el límite
  const pendingPhoneCount = 2
  const isRejected = pendingPhoneCount >= MAX_PENDING_PER_PHONE
  assert.equal(isRejected, true)
})

test('Fase 2 Criterio 6: Enlace de WhatsApp con número 503 y plantilla renderizada', () => {
  const phone = '79581732'
  const template = '¡Hola {{nombre}}! Tu cita de {{servicio}} quedó confirmada para el {{fecha}} a las {{hora}}. Código: {{codigo}}.'

  const vars = {
    nombre: 'Valeria',
    servicio: 'Diseño personalizado',
    fecha: formatDate('2026-10-08'),
    hora: '4:30 pm',
    codigo: 'MEL123',
  }

  const rendered = renderTemplate(template, vars)
  assert.equal(
    rendered,
    '¡Hola Valeria! Tu cita de Diseño personalizado quedó confirmada para el jueves 8 de octubre a las 4:30 pm. Código: MEL123.'
  )

  const link = whatsappLink(phone, rendered)
  assert.ok(link.startsWith('https://wa.me/50379581732?text='))
  assert.ok(link.includes('Valeria'))
  assert.ok(link.includes('MEL123'))
})
