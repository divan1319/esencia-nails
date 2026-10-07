<script setup lang="ts">
import { formatMinute } from '~/../server/utils/slots'

useHead({
  title: 'Reservar cita | Esencia Nails by Mel',
  meta: [
    {
      name: 'description',
      content: 'Agenda tu cita para manicure y diseños de uñas a domicilio en Santa Tecla.',
    },
  ],
})

// Datos iniciales
const { data: services } = await useFetch('/api/services')
const { data: zones } = await useFetch('/api/zones')
const { data: settings } = await useFetch('/api/settings')

// Pasos del Wizard: 1 = Servicio, 2 = Fecha y Hora, 3 = Datos, 4 = Confirmación
const step = ref(1)

// Datos seleccionados
const selectedService = ref<any>(null)
const selectedDate = ref('')
const selectedSlot = ref<{ startMinute: number; endMinute: number; onRequest: boolean } | null>(null)

const clientName = ref('')
const clientPhone = ref('')
const selectedZoneId = ref('')
const address = ref('')
const notes = ref('')
const websiteHoneypot = ref('') // honeypot: no debe rellenarse

// Estado de carga y confirmación
const loadingSlots = ref(false)
const availableSlots = ref<{ startMinute: number; endMinute: number; onRequest: boolean }[]>([])
const submitting = ref(false)
const bookingError = ref<string | null>(null)
const confirmedBooking = ref<{ code: string; onRequest: boolean } | null>(null)

// Fechas disponibles: hoy hasta maxDaysAhead
const minDate = computed(() => {
  const d = new Date()
  return d.toISOString().split('T')[0]
})

const maxDate = computed(() => {
  const days = settings.value?.maxDaysAhead || 30
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
})

// Inicializar fecha
onMounted(() => {
  selectedDate.value = minDate.value
})

// Cargar horarios cuando cambia el servicio o la fecha
watch([selectedService, selectedDate], async () => {
  if (selectedService.value && selectedDate.value) {
    loadingSlots.value = true
    selectedSlot.value = null
    bookingError.value = null
    try {
      const res = await $fetch<{ date: string; slots: any[] }>(
        `/api/availability?serviceId=${selectedService.value.id}&date=${selectedDate.value}`
      )
      availableSlots.value = res.slots || []
    } catch {
      availableSlots.value = []
    } finally {
      loadingSlots.value = false
    }
  }
})

function selectService(service: any) {
  selectedService.value = service
  step.value = 2
}

function selectSlot(slot: any) {
  selectedSlot.value = slot
  step.value = 3
}

async function submitBooking() {
  if (!clientName.value.trim() || !clientPhone.value.trim() || !selectedService.value || !selectedSlot.value) {
    bookingError.value = 'Por favor completa todos los campos requeridos.'
    return
  }

  // Validar teléfono de 8 dígitos
  const phoneClean = clientPhone.value.replace(/\D/g, '')
  if (phoneClean.length !== 8) {
    bookingError.value = 'El número de teléfono debe tener exactamente 8 dígitos.'
    return
  }

  submitting.value = true
  bookingError.value = null

  try {
    const res = await $fetch<{ code: string; onRequest: boolean }>('/api/bookings', {
      method: 'POST',
      body: {
        serviceId: selectedService.value.id,
        zoneId: selectedZoneId.value || undefined,
        date: selectedDate.value,
        startMinute: selectedSlot.value.startMinute,
        clientName: clientName.value.trim(),
        clientPhone: phoneClean,
        address: address.value.trim() || undefined,
        notes: notes.value.trim() || undefined,
        website: websiteHoneypot.value || undefined,
      },
    })

    confirmedBooking.value = res
    step.value = 4
  } catch (err: any) {
    bookingError.value = err.data?.statusMessage || err.message || 'Error al procesar la reserva'
  } finally {
    submitting.value = false
  }
}

function formatPrice(type: string, cents: number | null) {
  if (type === 'quote' || cents == null) return 'A cotizar'
  const dollars = (cents / 100).toFixed(2)
  if (type === 'from') return `Desde $${dollars}`
  return `$${dollars}`
}

const selectedZone = computed(() => {
  if (!selectedZoneId.value || !zones.value) return null
  return zones.value.find((z: any) => z.id === selectedZoneId.value)
})

const whatsappReferenceHref = computed(() => {
  const phone = settings.value?.whatsapp?.replace(/\D/g, '') || '79581732'
  const msg = encodeURIComponent(
    `¡Hola Mel! Estoy agendando una cita para ${selectedService.value?.name || 'uñas'} y me gustaría compartirte estas fotos de referencia.`
  )
  return `https://wa.me/503${phone}?text=${msg}`
})

const whatsappConfirmationHref = computed(() => {
  const phone = settings.value?.whatsapp?.replace(/\D/g, '') || '79581732'
  const code = confirmedBooking.value?.code || ''
  const msg = encodeURIComponent(
    `¡Hola Mel! Acabo de enviar mi solicitud de cita para ${selectedService.value?.name} el ${selectedDate.value} a las ${formatMinute(selectedSlot.value?.startMinute || 0)}. Mi código de solicitud es: ${code}`
  )
  return `https://wa.me/503${phone}?text=${msg}`
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-(--ui-bg) text-(--ui-text)">
    <PublicHeader />

    <main class="flex-1 max-w-2xl mx-auto w-full px-4 py-8 sm:py-12">
      <!-- Indicador de pasos -->
      <div v-if="step < 4" class="mb-8">
        <div class="flex items-center justify-between text-xs text-muted mb-2">
          <span :class="{ 'text-violet-600 dark:text-violet-400 font-bold': step >= 1 }">1. Servicio</span>
          <span :class="{ 'text-violet-600 dark:text-violet-400 font-bold': step >= 2 }">2. Fecha y hora</span>
          <span :class="{ 'text-violet-600 dark:text-violet-400 font-bold': step >= 3 }">3. Tus datos</span>
        </div>
        <div class="w-full bg-(--ui-border-muted) h-1.5 rounded-full overflow-hidden">
          <div
            class="bg-violet-600 h-full transition-all duration-300 rounded-full"
            :style="{ width: `${((step - 1) / 2) * 100}%` }"
          />
        </div>
      </div>

      <!-- PASO 1: ELEGIR SERVICIO -->
      <div v-if="step === 1" class="space-y-6">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-(--ui-text-highlighted)">Elige tu servicio</h1>
          <p class="text-sm text-muted mt-1">Selecciona el tipo de trabajo que deseas realizarte.</p>
        </div>

        <div v-if="services?.length" class="space-y-3">
          <div
            v-for="service in services"
            :key="service.id"
            class="p-5 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) hover:border-violet-500/50 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            @click="selectService(service)"
          >
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-semibold text-base text-(--ui-text-highlighted)">{{ service.name }}</h3>
                <UBadge color="primary" variant="subtle" size="xs">
                  {{ service.durationMinutes }} min
                </UBadge>
              </div>
              <p v-if="service.description" class="text-xs text-muted mt-1">
                {{ service.description }}
              </p>
            </div>

            <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0">
              <span class="text-sm font-bold text-violet-600 dark:text-violet-400">
                {{ formatPrice(service.priceType, service.priceCents) }}
              </span>
              <span class="text-xs font-semibold text-violet-600 dark:text-violet-400 sm:mt-1">
                Seleccionar →
              </span>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-12 text-muted">
          No hay servicios disponibles en este momento.
        </div>
      </div>

      <!-- PASO 2: ELEGIR FECHA Y HORA -->
      <div v-else-if="step === 2" class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-(--ui-text-highlighted)">Fecha y horario</h1>
            <p class="text-sm text-muted mt-1">
              Servicio: <strong class="text-(--ui-text-highlighted)">{{ selectedService?.name }}</strong>
              ({{ selectedService?.durationMinutes }} min)
            </p>
          </div>
          <UButton color="neutral" variant="ghost" size="sm" @click="step = 1">
            Cambiar
          </UButton>
        </div>

        <!-- Selector de fecha -->
        <UFormField label="Selecciona la fecha">
          <input
            v-model="selectedDate"
            type="date"
            :min="minDate"
            :max="maxDate"
            class="w-full h-11 px-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg) text-(--ui-text) text-sm focus:outline-none"
          />
        </UFormField>

        <!-- Horarios calculados -->
        <div>
          <label class="block text-sm font-medium mb-3">Horarios disponibles</label>

          <div v-if="loadingSlots" class="text-center py-8 text-muted flex items-center justify-center gap-2">
            <UIcon name="i-material-symbols-progress-activity" class="w-5 h-5 animate-spin text-violet-500" />
            <span>Calculando disponibilidad...</span>
          </div>

          <div v-else-if="availableSlots.length" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              v-for="slot in availableSlots"
              :key="slot.startMinute"
              type="button"
              class="p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
              :class="[
                selectedSlot?.startMinute === slot.startMinute
                  ? 'border-violet-600 bg-violet-500/15 text-violet-600 dark:text-violet-400 font-bold ring-2 ring-violet-500/30'
                  : 'border-(--ui-border-muted) bg-(--ui-bg-muted) text-(--ui-text) hover:border-violet-400'
              ]"
              @click="selectSlot(slot)"
            >
              <span class="text-sm font-semibold">{{ formatMinute(slot.startMinute) }}</span>
              <span v-if="slot.onRequest" class="text-[10px] text-amber-600 dark:text-amber-400">
                Bajo solicitud
              </span>
              <span v-else class="text-[10px] text-emerald-600 dark:text-emerald-400">
                Automático
              </span>
            </button>
          </div>

          <div v-else class="text-center py-8 text-muted p-6 border border-dashed border-(--ui-border-muted) rounded-2xl">
            <p>No hay horarios disponibles para esta fecha.</p>
            <p class="text-xs mt-1">Prueba seleccionando otro día o escríbele a Mel por WhatsApp.</p>
          </div>
        </div>
      </div>

      <!-- PASO 3: DATOS DE LA CLIENTA -->
      <div v-else-if="step === 3" class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-(--ui-text-highlighted)">Tus datos de contacto</h1>
            <p class="text-sm text-muted mt-1">
              {{ selectedService?.name }} · {{ selectedDate }} a las {{ formatMinute(selectedSlot?.startMinute || 0) }}
            </p>
          </div>
          <UButton color="neutral" variant="ghost" size="sm" @click="step = 2">
            Cambiar hora
          </UButton>
        </div>

        <div v-if="bookingError" class="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
          {{ bookingError }}
        </div>

        <form @submit.prevent="submitBooking" class="space-y-4">
          <!-- Honeypot anti-spam (invisible para personas) -->
          <input
            v-model="websiteHoneypot"
            type="text"
            name="website"
            tabindex="-1"
            autocomplete="off"
            style="position: absolute; left: -9999px;"
          />

          <UFormField label="Tu nombre completo">
            <UInput
              v-model="clientName"
              placeholder="Ej. Ana Martínez"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Número de WhatsApp (8 dígitos)">
            <div class="flex gap-2">
              <span class="inline-flex items-center px-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg-muted) text-sm font-semibold text-muted">
                +503
              </span>
              <UInput
                v-model="clientPhone"
                type="tel"
                placeholder="79581732"
                maxlength="8"
                required
                class="flex-1"
              />
            </div>
            <p class="text-[11px] text-muted mt-1">Te contactaremos a este número para confirmar tu cita.</p>
          </UFormField>

          <UFormField label="Zona de cobertura en Santa Tecla">
            <select
              v-model="selectedZoneId"
              class="w-full h-11 px-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg) text-(--ui-text) text-sm focus:outline-none"
            >
              <option value="">Selecciona tu zona (opcional)</option>
              <option v-for="z in zones" :key="z.id" :value="z.id">
                {{ z.name }} {{ z.travelFeeCents > 0 ? `(+${(z.travelFeeCents / 100).toFixed(2)} traslado)` : '(Sin recargo)' }}
              </option>
            </select>
          </UFormField>

          <UFormField label="Dirección exacta para el servicio a domicilio">
            <UTextarea
              v-model="address"
              placeholder="Colonia, calle, número de casa o punto de referencia..."
              class="w-full"
            />
          </UFormField>

          <UFormField label="Notas o detalles especiales (opcional)">
            <UTextarea
              v-model="notes"
              placeholder="Si tienes retiro de uñas anteriores, uñas rotas, etc."
              class="w-full"
            />
          </UFormField>

          <!-- Aviso de fotos de referencia por WhatsApp -->
          <div class="p-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 text-xs text-muted flex items-start gap-3">
            <UIcon name="i-material-symbols-photo-camera-outline-rounded" class="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
            <div>
              <p class="font-medium text-(--ui-text-highlighted)">¿Tienes una foto de referencia para tu diseño?</p>
              <p class="mt-0.5">
                Las fotos no se suben aquí. Puedes enviarlas directamente a Mel por WhatsApp antes o después de agendar.
              </p>
              <a
                :href="whatsappReferenceHref"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 font-semibold text-violet-600 dark:text-violet-400 mt-2 hover:underline"
              >
                Enviar fotos por WhatsApp →
              </a>
            </div>
          </div>

          <div class="pt-4 flex items-center justify-between">
            <UButton color="neutral" variant="ghost" @click="step = 2">
              Atrás
            </UButton>
            <UButton
              type="submit"
              color="primary"
              variant="solid"
              size="lg"
              class="font-semibold px-6"
              :loading="submitting"
            >
              Confirmar solicitud
            </UButton>
          </div>
        </form>
      </div>

      <!-- PASO 4: CONFIRMACIÓN EXITOSA -->
      <div v-else-if="step === 4" class="text-center py-8 space-y-6">
        <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <UIcon name="i-material-symbols-check-circle-outline-rounded" class="w-10 h-10" />
        </div>

        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-(--ui-text-highlighted)">¡Solicitud enviada!</h1>
          <p class="text-sm text-muted mt-2 max-w-md mx-auto">
            Hemos recibido tu solicitud de cita. Mel la revisará y te contactará por WhatsApp para confirmarla.
          </p>
        </div>

        <!-- Código de reserva -->
        <div class="p-6 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) max-w-sm mx-auto">
          <span class="text-xs uppercase tracking-wider text-muted block mb-1">Tu código de cita</span>
          <span class="text-3xl font-extrabold tracking-widest text-violet-600 dark:text-violet-400 font-mono">
            {{ confirmedBooking?.code }}
          </span>
          <p class="text-[11px] text-muted mt-2">Guarda este código para cualquier consulta.</p>
        </div>

        <!-- Resumen -->
        <div class="text-xs text-muted space-y-1">
          <p><strong>Servicio:</strong> {{ selectedService?.name }}</p>
          <p><strong>Fecha:</strong> {{ selectedDate }} a las {{ formatMinute(selectedSlot?.startMinute || 0) }}</p>
          <p v-if="selectedZone"><strong>Zona:</strong> {{ selectedZone.name }}</p>
        </div>

        <div class="pt-4 flex flex-col sm:flex-row justify-center gap-3 max-w-md mx-auto">
          <UButton
            :href="whatsappConfirmationHref"
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
            variant="solid"
            size="lg"
            class="font-semibold"
          >
            <UIcon name="i-material-symbols-chat-outline-rounded" class="w-5 h-5 mr-1" />
            Avisar a Mel por WhatsApp
          </UButton>

          <UButton
            to="/"
            color="neutral"
            variant="ghost"
            size="lg"
          >
            Volver al inicio
          </UButton>
        </div>
      </div>
    </main>

    <PublicFooter :instagram-url="settings?.instagramUrl" :whatsapp="settings?.whatsapp" />
  </div>
</template>
