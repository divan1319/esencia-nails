<script setup lang="ts">
import { formatMinute } from '~/../server/utils/slots'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

// Filtros
const filterStatus = ref<string>('')
const filterDate = ref<string>('')

const { data: bookings, refresh, status } = await useFetch('/api/admin/bookings', {
  query: computed(() => ({
    status: filterStatus.value || undefined,
    date: filterDate.value || undefined,
  })),
})

const { data: settings } = await useFetch('/api/settings')
const { data: zones } = await useFetch('/api/zones')

// Modal de WhatsApp
const isWhatsAppModalOpen = ref(false)
const selectedBookingForWhatsApp = ref<any>(null)
const whatsAppModalKind = ref<string>('confirmation')

function triggerWhatsApp(booking: any, kind: string) {
  selectedBookingForWhatsApp.value = booking
  whatsAppModalKind.value = kind
  isWhatsAppModalOpen.value = true
}

// Acciones de estado
const actionLoading = ref<string | null>(null)
const actionError = ref<string | null>(null)

async function changeStatus(booking: any, action: 'confirm' | 'reject' | 'cancel' | 'complete') {
  actionLoading.value = `${booking.id}-${action}`
  actionError.value = null

  try {
    const updated = await $fetch(`/api/admin/bookings/${booking.id}/status`, {
      method: 'POST',
      body: { action },
    })

    await refresh()

    // Abrir modal de WhatsApp si no es 'complete'
    if (action !== 'complete') {
      triggerWhatsApp(updated, action)
    }
  } catch (err: any) {
    actionError.value = err.data?.statusMessage || err.message || 'Error al cambiar de estado'
  } finally {
    actionLoading.value = null
  }
}

// Modal de Reprogramación
const isRescheduleOpen = ref(false)
const rescheduleBookingTarget = ref<any>(null)
const rescheduleDate = ref('')
const rescheduleMinute = ref<number | null>(null)
const rescheduleSlots = ref<any[]>([])
const loadingRescheduleSlots = ref(false)
const rescheduleSaving = ref(false)
const rescheduleError = ref<string | null>(null)

function openReschedule(booking: any) {
  rescheduleBookingTarget.value = booking
  rescheduleDate.value = booking.date
  rescheduleMinute.value = null
  rescheduleError.value = null
  isRescheduleOpen.value = true
}

watch([rescheduleBookingTarget, rescheduleDate], async () => {
  if (rescheduleBookingTarget.value && rescheduleDate.value) {
    loadingRescheduleSlots.value = true
    rescheduleMinute.value = null
    try {
      const res = await $fetch<{ slots: any[] }>(
        `/api/availability?serviceId=${rescheduleBookingTarget.value.serviceId}&date=${rescheduleDate.value}`
      )
      rescheduleSlots.value = res.slots || []
    } catch {
      rescheduleSlots.value = []
    } finally {
      loadingRescheduleSlots.value = false
    }
  }
})

async function executeReschedule() {
  if (!rescheduleBookingTarget.value || !rescheduleDate.value || rescheduleMinute.value == null) {
    rescheduleError.value = 'Debes seleccionar una fecha y un horario'
    return
  }

  rescheduleSaving.value = true
  rescheduleError.value = null

  try {
    const updated = await $fetch(`/api/admin/bookings/${rescheduleBookingTarget.value.id}/reschedule`, {
      method: 'POST',
      body: {
        date: rescheduleDate.value,
        startMinute: rescheduleMinute.value,
      },
    })

    isRescheduleOpen.value = false
    await refresh()
    triggerWhatsApp(updated, 'reschedule')
  } catch (err: any) {
    rescheduleError.value = err.data?.statusMessage || err.message || 'Error al reprogramar'
  } finally {
    rescheduleSaving.value = false
  }
}

// Marcar anticipo como recibido
async function toggleDepositReceived(booking: any) {
  const newStatus = booking.depositStatus === 'received' ? 'pending' : 'received'
  try {
    await $fetch(`/api/admin/bookings/${booking.id}/notes`, {
      method: 'PATCH',
      body: { depositStatus: newStatus },
    })
    await refresh()
  } catch (err: any) {
    actionError.value = err.data?.statusMessage || err.message || 'Error al actualizar anticipo'
  }
}

// Editar notas internas
const editingNotesId = ref<string | null>(null)
const tempNotes = ref('')
const savingNotes = ref(false)

function startEditNotes(booking: any) {
  editingNotesId.value = booking.id
  tempNotes.value = booking.adminNotes || ''
}

async function saveAdminNotes(booking: any) {
  savingNotes.value = true
  try {
    await $fetch(`/api/admin/bookings/${booking.id}/notes`, {
      method: 'PATCH',
      body: { adminNotes: tempNotes.value.trim() || null },
    })
    editingNotesId.value = null
    await refresh()
  } catch (err: any) {
    actionError.value = err.data?.statusMessage || err.message || 'Error al guardar notas'
  } finally {
    savingNotes.value = false
  }
}

function statusBadge(s: string) {
  switch (s) {
    case 'pending':
      return { label: 'Pendiente', color: 'neutral', variant: 'subtle' as const }
    case 'confirmed':
      return { label: 'Confirmada', color: 'primary', variant: 'solid' as const }
    case 'completed':
      return { label: 'Completada', color: 'success', variant: 'soft' as const }
    case 'rejected':
      return { label: 'Rechazada', color: 'error', variant: 'subtle' as const }
    case 'cancelled':
      return { label: 'Cancelada', color: 'neutral', variant: 'ghost' as const }
    default:
      return { label: s, color: 'neutral', variant: 'subtle' as const }
  }
}

function formatCents(cents: number | null) {
  if (cents == null) return '$0.00'
  return `$${(cents / 100).toFixed(2)}`
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-(--ui-text-highlighted)">Solicitudes y reservas</h1>
        <p class="text-sm text-muted mt-1">Revisa solicitudes entrantes, confirma citas y avisa por WhatsApp.</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model="filterStatus"
          class="h-9 px-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg-muted) text-(--ui-text) text-xs focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="confirmed">Confirmadas</option>
          <option value="completed">Completadas</option>
          <option value="rejected">Rechazadas</option>
          <option value="cancelled">Canceladas</option>
        </select>

        <input
          v-model="filterDate"
          type="date"
          class="h-9 px-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg-muted) text-(--ui-text) text-xs focus:outline-none"
        />

        <UButton
          v-if="filterStatus || filterDate"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="filterStatus = ''; filterDate = ''"
        >
          Limpiar
        </UButton>
      </div>
    </div>

    <div v-if="actionError" class="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
      <span>{{ actionError }}</span>
      <UButton size="xs" color="error" variant="ghost" @click="actionError = null">Cerrar</UButton>
    </div>

    <!-- Lista de reservas -->
    <div v-if="bookings?.length" class="space-y-4">
      <div
        v-for="b in bookings"
        :key="b.id"
        class="p-5 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) flex flex-col gap-4 shadow-2xs"
      >
        <!-- Encabezado de la tarjeta -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-(--ui-border-muted) pb-3">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-mono font-bold text-sm tracking-wider text-violet-600 dark:text-violet-400">
              #{{ b.code }}
            </span>
            <UBadge
              :color="statusBadge(b.status).color"
              :variant="statusBadge(b.status).variant"
              size="xs"
            >
              {{ statusBadge(b.status).label }}
            </UBadge>
            <span class="text-xs text-muted">
              {{ b.date }} · {{ formatMinute(b.startMinute) }} - {{ formatMinute(b.endMinute) }}
            </span>
          </div>

          <!-- Botón rápido WhatsApp -->
          <UButton
            size="xs"
            color="primary"
            variant="soft"
            @click="triggerWhatsApp(b, b.status === 'confirmed' ? 'confirmation' : 'reminder')"
          >
            <UIcon name="i-material-symbols-chat-outline-rounded" class="w-3.5 h-3.5 mr-1 text-emerald-500" />
            WhatsApp
          </UButton>
        </div>

        <!-- Detalles de la clienta y servicio -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <!-- Clienta -->
          <div>
            <span class="text-muted block text-[11px] mb-0.5">Clienta</span>
            <span class="font-semibold text-sm text-(--ui-text-highlighted) block">{{ b.clientName }}</span>
            <a
              :href="`https://wa.me/503${b.clientPhone}`"
              target="_blank"
              class="text-emerald-600 dark:text-emerald-400 font-medium hover:underline inline-flex items-center gap-1 mt-0.5"
            >
              +503 {{ b.clientPhone }}
            </a>
            <p v-if="b.address" class="text-muted mt-1 leading-relaxed">
              📍 {{ b.address }}
            </p>
          </div>

          <!-- Servicio y montos -->
          <div>
            <span class="text-muted block text-[11px] mb-0.5">Servicio y montos</span>
            <span class="font-semibold text-sm text-(--ui-text-highlighted) block">{{ b.serviceNameSnapshot }}</span>
            <div class="mt-1 space-y-0.5 text-muted">
              <p>Precio: <strong class="text-(--ui-text-highlighted)">{{ b.priceTypeSnapshot === 'quote' ? 'A cotizar' : formatCents(b.priceCentsSnapshot) }}</strong></p>
              <p v-if="b.travelFeeCentsSnapshot > 0">Traslado: {{ formatCents(b.travelFeeCentsSnapshot) }}</p>
              <p v-if="b.depositCentsSnapshot > 0">
                Anticipo: {{ formatCents(b.depositCentsSnapshot) }}
                <button
                  type="button"
                  class="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer"
                  :class="b.depositStatus === 'received' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'"
                  @click="toggleDepositReceived(b)"
                >
                  {{ b.depositStatus === 'received' ? 'Recibido ✓' : 'Pendiente ⏳' }}
                </button>
              </p>
            </div>
          </div>

          <!-- Notas de clienta y admin -->
          <div>
            <span class="text-muted block text-[11px] mb-0.5">Notas</span>
            <p v-if="b.notes" class="text-muted italic mb-2">
              "{{ b.notes }}"
            </p>
            <p v-else class="text-muted text-[11px] mb-2">Sin notas de clienta.</p>

            <!-- Notas de admin -->
            <div class="pt-1">
              <div v-if="editingNotesId === b.id" class="space-y-1">
                <UTextarea v-model="tempNotes" placeholder="Notas internas..." rows="2" class="w-full text-xs" />
                <div class="flex gap-1 justify-end">
                  <UButton size="xs" color="neutral" variant="ghost" @click="editingNotesId = null">Cancelar</UButton>
                  <UButton size="xs" color="primary" variant="solid" :loading="savingNotes" @click="saveAdminNotes(b)">Guardar</UButton>
                </div>
              </div>
              <div v-else class="flex items-center justify-between group">
                <span class="text-[11px] text-muted truncate">
                  {{ b.adminNotes ? `Nota: ${b.adminNotes}` : 'Agregar nota interna...' }}
                </span>
                <UButton size="xs" color="neutral" variant="ghost" @click="startEditNotes(b)">
                  <UIcon name="i-material-symbols-edit-outline-rounded" class="w-3.5 h-3.5" />
                </UButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Barra de acciones según el estado -->
        <div class="pt-3 border-t border-(--ui-border-muted) flex flex-wrap items-center justify-end gap-2">
          <!-- Si es pendiente: confirmar, rechazar, cancelar -->
          <template v-if="b.status === 'pending'">
            <UButton
              size="sm"
              color="error"
              variant="ghost"
              :loading="actionLoading === `${b.id}-reject`"
              @click="changeStatus(b, 'reject')"
            >
              Rechazar
            </UButton>
            <UButton
              size="sm"
              color="neutral"
              variant="subtle"
              :loading="actionLoading === `${b.id}-cancel`"
              @click="changeStatus(b, 'cancel')"
            >
              Cancelar
            </UButton>
            <UButton
              size="sm"
              color="primary"
              variant="solid"
              :loading="actionLoading === `${b.id}-confirm`"
              @click="changeStatus(b, 'confirm')"
            >
              <UIcon name="i-material-symbols-check-rounded" class="w-4 h-4 mr-1" />
              Confirmar cita
            </UButton>
          </template>

          <!-- Si es confirmada: reprogramar, completar, cancelar -->
          <template v-else-if="b.status === 'confirmed'">
            <UButton
              size="sm"
              color="neutral"
              variant="subtle"
              @click="openReschedule(b)"
            >
              <UIcon name="i-material-symbols-update-rounded" class="w-4 h-4 mr-1" />
              Reprogramar
            </UButton>
            <UButton
              size="sm"
              color="neutral"
              variant="ghost"
              :loading="actionLoading === `${b.id}-cancel`"
              @click="changeStatus(b, 'cancel')"
            >
              Cancelar
            </UButton>
            <UButton
              size="sm"
              color="success"
              variant="solid"
              :loading="actionLoading === `${b.id}-complete`"
              @click="changeStatus(b, 'complete')"
            >
              <UIcon name="i-material-symbols-task-alt-rounded" class="w-4 h-4 mr-1" />
              Marcar completada
            </UButton>
          </template>
        </div>
      </div>
    </div>
    <div v-else-if="status === 'pending'" class="text-center py-12 text-muted">
      Cargando solicitudes...
    </div>
    <div v-else class="text-center py-16 text-muted p-8 border border-dashed border-(--ui-border-muted) rounded-2xl">
      <UIcon name="i-material-symbols-calendar-month-outline" class="w-12 h-12 mx-auto mb-2 opacity-40" />
      <p class="font-medium text-base text-(--ui-text-highlighted)">No hay solicitudes registradas</p>
      <p class="text-xs text-muted mt-1">
        Las solicitudes enviadas desde la página web aparecerán aquí en tiempo real.
      </p>
    </div>

    <!-- Modal de Reprogramación -->
    <UModal v-model:open="isRescheduleOpen" title="Reprogramar cita">
      <template #body>
        <div v-if="rescheduleBookingTarget" class="space-y-4">
          <div v-if="rescheduleError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            {{ rescheduleError }}
          </div>

          <p class="text-xs text-muted">
            Reprogramando a: <strong>{{ rescheduleBookingTarget.clientName }}</strong> (#{{ rescheduleBookingTarget.code }})
          </p>

          <UFormField label="Nueva fecha">
            <input
              v-model="rescheduleDate"
              type="date"
              class="w-full h-10 px-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg) text-(--ui-text) text-sm focus:outline-none"
            />
          </UFormField>

          <div>
            <label class="block text-sm font-medium mb-2">Horarios disponibles</label>

            <div v-if="loadingRescheduleSlots" class="text-center py-4 text-xs text-muted">
              Consultando horarios libres...
            </div>

            <div v-else-if="rescheduleSlots.length" class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                v-for="s in rescheduleSlots"
                :key="s.startMinute"
                type="button"
                class="p-2.5 rounded-lg border text-xs text-center transition-colors cursor-pointer"
                :class="[
                  rescheduleMinute === s.startMinute
                    ? 'border-violet-600 bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold'
                    : 'border-(--ui-border-muted) bg-(--ui-bg) text-(--ui-text) hover:border-violet-400'
                ]"
                @click="rescheduleMinute = s.startMinute"
              >
                {{ formatMinute(s.startMinute) }}
              </button>
            </div>

            <p v-else class="text-xs text-muted py-2">
              No hay horarios libres para la fecha seleccionada.
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="isRescheduleOpen = false">
            Cancelar
          </UButton>
          <UButton
            color="primary"
            variant="solid"
            :loading="rescheduleSaving"
            :disabled="rescheduleMinute == null"
            @click="executeReschedule"
          >
            Confirmar reprogramación
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal de WhatsApp -->
    <WhatsAppModal
      v-model:open="isWhatsAppModalOpen"
      :booking="selectedBookingForWhatsApp"
      :initial-kind="whatsAppModalKind"
      :settings="settings"
      :zones="zones || []"
    />
  </div>
</template>
