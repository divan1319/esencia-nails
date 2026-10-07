import type { BookingStatus } from '../db/schema'

// Transiciones permitidas. confirmed -> confirmed solo ocurre al reprogramar.
const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['confirmed', 'cancelled', 'completed'],
  rejected: [],
  cancelled: [],
  completed: [],
}

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

/** Estados desde los que se puede llegar a `to` (para el WHERE del UPDATE condicionado). */
export function sourcesOf(to: BookingStatus): BookingStatus[] {
  return (Object.keys(TRANSITIONS) as BookingStatus[]).filter((from) => canTransition(from, to))
}
