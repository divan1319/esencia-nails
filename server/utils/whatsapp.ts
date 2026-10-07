import type { Booking, Settings } from '../db/schema'
import { formatMinute } from './slots'

export type TemplateVars = Record<string, string | null | undefined>

/**
 * Reemplaza {{variable}}. Una variable desconocida o vacía se deja tal cual
 * para que ella la vea en la vista previa antes de enviar.
 */
export function renderTemplate(body: string, vars: TemplateVars): string {
  return body.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) => {
    const value = vars[key]
    return value ? value : match
  })
}

/** Números salvadoreños de 8 dígitos -> wa.me con código de país 503. */
export function whatsappLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '')
  const full = digits.length === 8 ? `503${digits}` : digits
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}

const money = (cents: number | null) => (cents === null ? null : `$${(cents / 100).toFixed(2)}`)

/** 'jueves 8 de octubre'. Mediodía UTC para que la zona horaria no mueva el día. */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(',', '')
}

export function bookingVars(booking: Booking, settings: Settings, zoneName?: string | null): TemplateVars {
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
    instrucciones_anticipo: settings.depositInstructions,
  }
}
