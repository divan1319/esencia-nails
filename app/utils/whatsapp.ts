import { formatMinute } from '../../server/utils/slots'

export type TemplateVars = Record<string, string | null | undefined>

export function renderTemplate(body: string, vars: TemplateVars): string {
  return body.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) => {
    const value = vars[key]
    return value ? value : match
  })
}

export function whatsappLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '')
  const full = digits.length === 8 ? `503${digits}` : digits
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}

const money = (cents: number | null) => (cents === null ? null : `$${(cents / 100).toFixed(2)}`)

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(',', '')
}

export function bookingVars(booking: any, settings: any, zoneName?: string | null): TemplateVars {
  return {
    nombre: booking.clientName,
    servicio: booking.serviceNameSnapshot,
    fecha: formatDate(booking.date),
    hora: formatMinute(booking.startMinute),
    codigo: booking.code,
    zona: zoneName,
    direccion: booking.address,
    precio: booking.priceTypeSnapshot === 'quote' ? 'a cotizar' : money(booking.priceCentsSnapshot),
    traslado: booking.travelFeeCentsSnapshot > 0 ? money(booking.travelFeeCentsSnapshot) : null,
    anticipo: booking.depositCentsSnapshot > 0 ? money(booking.depositCentsSnapshot) : null,
    instrucciones_anticipo: settings?.depositInstructions,
  }
}
