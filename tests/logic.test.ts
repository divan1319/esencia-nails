// Uso: npx tsx --test tests/logic.test.ts
// Lógica pura, sin base de datos.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateSlots, formatMinute, localNow, type SlotInput } from '../server/utils/slots'
import { canTransition, sourcesOf } from '../server/utils/booking-status'
import { formatDate, renderTemplate, whatsappLink } from '../server/utils/whatsapp'
import { detectImageKind } from '../server/utils/image'

// Jueves 7 oct 2026, 6:00 am en El Salvador (12:00 UTC)
const now = new Date('2026-10-07T12:00:00Z')
const base: SlotInput = {
  date: '2026-10-08',
  rules: [{ startMinute: 990, endMinute: 1230, mode: 'auto' }], // 4:30 a 8:30 pm
  blocks: [],
  busy: [],
  durationMinutes: 90,
  bufferMinutes: 0,
  stepMinutes: 30,
  minNoticeHours: 0,
  maxDaysAhead: 30,
  now,
}
const starts = (input: Partial<SlotInput>) => calculateSlots({ ...base, ...input }).map((s) => formatMinute(s.startMinute))

test('hora local de El Salvador', () => {
  assert.deepEqual(localNow(now), { date: '2026-10-07', minute: 360 })
})

test('slots: franja libre', () => {
  assert.deepEqual(starts({}), ['4:30 pm', '5:00 pm', '5:30 pm', '6:00 pm', '6:30 pm', '7:00 pm'])
})

test('slots: cita ocupada y buffer', () => {
  const busy = [{ start: 1080, end: 1170 }] // 6:00 a 7:30 pm
  assert.deepEqual(starts({ busy }), ['4:30 pm'])
  assert.deepEqual(starts({ busy, bufferMinutes: 30 }), [])
})

test('slots: bloqueos', () => {
  assert.deepEqual(starts({ blocks: [{ startMinute: null, endMinute: null }] }), [])
  assert.deepEqual(starts({ blocks: [{ startMinute: 1140, endMinute: 1230 }] }), ['4:30 pm', '5:00 pm', '5:30 pm'])
})

test('slots: anticipación y ventana de días', () => {
  assert.deepEqual(starts({ date: '2026-10-07', minNoticeHours: 12 }), ['6:00 pm', '6:30 pm', '7:00 pm'])
  assert.deepEqual(starts({ date: '2026-10-06' }), [])
  assert.deepEqual(starts({ date: '2026-12-01' }), [])
})

test('slots: modo bajo solicitud', () => {
  const [first] = calculateSlots({ ...base, rules: [{ startMinute: 540, endMinute: 1020, mode: 'on_request' }] })
  assert.equal(first?.onRequest, true)
})

test('transiciones de estado', () => {
  assert.ok(canTransition('pending', 'confirmed'))
  assert.ok(canTransition('confirmed', 'confirmed')) // reprogramar
  assert.ok(canTransition('confirmed', 'completed'))
  assert.ok(!canTransition('pending', 'completed'))
  assert.ok(!canTransition('cancelled', 'confirmed'))
  assert.ok(!canTransition('completed', 'cancelled'))
  assert.deepEqual(sourcesOf('cancelled').sort(), ['confirmed', 'pending'])
})

test('plantillas: variables conocidas, vacías y desconocidas', () => {
  const out = renderTemplate('Hola {{nombre}}, {{fecha}} a las {{ hora }}. {{anticipo}} {{otra}}', {
    nombre: 'Ana',
    fecha: formatDate('2026-10-08'),
    hora: formatMinute(990),
    anticipo: null,
  })
  assert.equal(out, 'Hola Ana, jueves 8 de octubre a las 4:30 pm. {{anticipo}} {{otra}}')
})

test('enlace de WhatsApp con 503', () => {
  assert.equal(whatsappLink('7958-1732', 'Hola Ana'), 'https://wa.me/50379581732?text=Hola%20Ana')
})

test('detección de formato por bytes', () => {
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
  assert.equal(detectImageKind(webp), 'webp')
  assert.equal(detectImageKind(jpeg), 'jpeg')
  assert.equal(detectImageKind(png), null)
})
