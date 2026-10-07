// Lógica pura: no toca la BD, así se puede probar con datos en memoria.
// Todas las horas son minutos desde medianoche en hora local de El Salvador.

export const TIMEZONE = 'America/El_Salvador'

export type Range = { start: number; end: number }

export type Rule = { startMinute: number; endMinute: number; mode: 'auto' | 'on_request' }

export type Block = { startMinute: number | null; endMinute: number | null }

export type Slot = { startMinute: number; endMinute: number; onRequest: boolean }

export type SlotInput = {
  date: string // 'YYYY-MM-DD'
  rules: Rule[] // reglas del weekday de `date`
  blocks: Block[] // bloqueos de `date`
  busy: Range[] // citas que ocupan horario ese día
  durationMinutes: number
  bufferMinutes: number
  stepMinutes: number
  minNoticeHours: number
  maxDaysAhead: number
  now?: Date // inyectable para pruebas
}

/** Fecha y minuto actuales en El Salvador, sin depender de la zona horaria del servidor. */
export function localNow(now: Date = new Date()): { date: string; minute: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minute: Number(get('hour')) * 60 + Number(get('minute')),
  }
}

/** 0 = domingo ... 6 = sábado. Mediodía UTC para no cruzar de día. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay()
}

/** Días calendario entre dos fechas 'YYYY-MM-DD'. */
export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

const overlaps = (a: Range, b: Range) => a.start < b.end && b.start < a.end

export function calculateSlots(input: SlotInput): Slot[] {
  const {
    date, rules, blocks, busy, durationMinutes,
    bufferMinutes, stepMinutes, minNoticeHours, maxDaysAhead,
  } = input

  if (durationMinutes <= 0 || stepMinutes <= 0) return []

  // Ventana de fechas permitidas
  const today = localNow(input.now)
  const dayOffset = daysBetween(today.date, date)
  if (dayOffset < 0 || dayOffset > maxDaysAhead) return []

  // Día completo bloqueado
  if (blocks.some((b) => b.startMinute === null || b.endMinute === null)) return []
  const partialBlocks: Range[] = blocks.map((b) => ({ start: b.startMinute!, end: b.endMinute! }))

  // Anticipación mínima, expresada en minutos relativos al inicio de `date`
  const earliestStart = today.minute + minNoticeHours * 60 - dayOffset * 1440

  const slots: Slot[] = []

  for (const rule of rules) {
    for (let t = rule.startMinute; t + durationMinutes <= rule.endMinute; t += stepMinutes) {
      if (t < earliestStart) continue

      const service: Range = { start: t, end: t + durationMinutes }
      // El buffer se aplica a ambos lados: tiempo para llegar y para irse
      const withBuffer: Range = { start: t - bufferMinutes, end: t + durationMinutes + bufferMinutes }

      if (busy.some((b) => overlaps(withBuffer, b))) continue
      if (partialBlocks.some((b) => overlaps(service, b))) continue

      slots.push({ startMinute: t, endMinute: t + durationMinutes, onRequest: rule.mode === 'on_request' })
    }
  }

  // Si dos reglas se traslapan podrían repetirse slots
  const unique = new Map(slots.map((s) => [s.startMinute, s]))
  return [...unique.values()].sort((a, b) => a.startMinute - b.startMinute)
}

/** 990 -> '4:30 pm' */
export function formatMinute(minute: number): string {
  const h24 = Math.floor(minute / 60)
  const m = String(minute % 60).padStart(2, '0')
  const suffix = h24 >= 12 ? 'pm' : 'am'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${m} ${suffix}`
}
