<script setup lang="ts">
import { formatMinute } from '~/../server/utils/slots'

const route = useRoute()
const code = computed(() => (route.params.codigo as string || '').toUpperCase())

useHead({
  title: computed(() => `Consulta de Cita #${code.value} | Esencia Nails`),
  meta: [
    {
      name: 'description',
      content: 'Consulta el estado de tu solicitud de cita en Esencia Nails by Mel.',
    },
  ],
})

const { data: booking, error, status } = await useFetch(() => `/api/bookings/${code.value}`)
const { data: settings } = await useFetch('/api/settings')

function statusInfo(s?: string) {
  switch (s) {
    case 'pending':
      return {
        title: 'Solicitud pendiente de revisión',
        desc: 'Mel revisará tu horario y te enviará un mensaje por WhatsApp para confirmar.',
        color: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
        icon: 'i-material-symbols-hourglass-empty-rounded',
        badge: { label: 'Pendiente', color: 'neutral' as const },
      }
    case 'confirmed':
      return {
        title: '¡Tu cita está confirmada!',
        desc: 'Todo listo para tu cita a domicilio en la fecha y hora indicadas.',
        color: 'bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400',
        icon: 'i-material-symbols-check-circle-outline-rounded',
        badge: { label: 'Confirmada', color: 'primary' as const },
      }
    case 'completed':
      return {
        title: 'Cita completada con éxito',
        desc: '¡Gracias por confiar en Esencia Nails! Esperamos que te hayan encantado tus uñas.',
        color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
        icon: 'i-material-symbols-task-alt-rounded',
        badge: { label: 'Completada', color: 'success' as const },
      }
    case 'rejected':
      return {
        title: 'Solicitud no disponible',
        desc: 'Lamentablemente no fue posible agendar en este horario. Escríbele a Mel si deseas buscar otra fecha.',
        color: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
        icon: 'i-material-symbols-cancel-outline-rounded',
        badge: { label: 'Rechazada', color: 'error' as const },
      }
    case 'cancelled':
      return {
        title: 'Cita cancelada',
        desc: 'Esta cita ha sido cancelada.',
        color: 'bg-neutral-500/10 border-neutral-500/30 text-muted',
        icon: 'i-material-symbols-event-busy-outline-rounded',
        badge: { label: 'Cancelada', color: 'neutral' as const },
      }
    default:
      return {
        title: 'Consultando estado...',
        desc: '',
        color: '',
        icon: 'i-material-symbols-schedule-outline',
        badge: { label: '', color: 'neutral' as const },
      }
  }
}

function formatCents(cents: number | null) {
  if (cents == null) return '$0.00'
  return `$${(cents / 100).toFixed(2)}`
}

const whatsappHref = computed(() => {
  const phone = settings.value?.whatsapp?.replace(/\D/g, '') || '79581732'
  const msg = encodeURIComponent(
    `¡Hola Mel! Tengo una consulta sobre mi cita #${code.value} (${booking.value?.serviceNameSnapshot || 'servicio'}).`
  )
  return `https://wa.me/503${phone}?text=${msg}`
})

// Búsqueda de otro código
const otherCode = ref('')
function searchOther() {
  if (otherCode.value.trim()) {
    navigateTo(`/reserva/${otherCode.value.trim().toUpperCase()}`)
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-(--ui-bg) text-(--ui-text)">
    <PublicHeader />

    <main class="flex-1 max-w-xl mx-auto w-full px-4 py-8 sm:py-12">
      <!-- Si la reserva fue encontrada -->
      <div v-if="booking" class="space-y-6">
        <div class="flex items-center justify-between">
          <NuxtLink to="/" class="text-xs text-muted hover:text-(--ui-text-highlighted) transition-colors inline-flex items-center gap-1">
            ← Volver al inicio
          </NuxtLink>
          <span class="font-mono font-bold text-sm tracking-widest text-violet-600 dark:text-violet-400">
            CÓDIGO #{{ booking.code }}
          </span>
        </div>

        <!-- Banner de Estado -->
        <div class="p-6 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center gap-4" :class="statusInfo(booking.status).color">
          <div class="w-12 h-12 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center shrink-0">
            <UIcon :name="statusInfo(booking.status).icon" class="w-7 h-7" />
          </div>
          <div>
            <h1 class="text-lg font-bold">{{ statusInfo(booking.status).title }}</h1>
            <p class="text-xs mt-1 leading-relaxed opacity-90">{{ statusInfo(booking.status).desc }}</p>
          </div>
        </div>

        <!-- Tarjeta de Detalles -->
        <div class="p-6 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) space-y-4 shadow-2xs">
          <h2 class="text-base font-semibold text-(--ui-text-highlighted) border-b border-(--ui-border-muted) pb-3">
            Detalles de tu cita
          </h2>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between items-center py-1">
              <span class="text-muted text-xs">Clienta</span>
              <span class="font-medium text-(--ui-text-highlighted)">{{ booking.clientName }}</span>
            </div>

            <div class="flex justify-between items-center py-1">
              <span class="text-muted text-xs">Servicio</span>
              <span class="font-semibold text-violet-600 dark:text-violet-400">{{ booking.serviceNameSnapshot }}</span>
            </div>

            <div class="flex justify-between items-center py-1">
              <span class="text-muted text-xs">Fecha y horario</span>
              <span class="font-medium text-(--ui-text-highlighted)">
                {{ booking.date }} · {{ formatMinute(booking.startMinute) }} - {{ formatMinute(booking.endMinute) }}
              </span>
            </div>

            <div v-if="booking.address" class="flex justify-between items-start py-1">
              <span class="text-muted text-xs shrink-0">Dirección</span>
              <span class="font-medium text-(--ui-text-highlighted) text-right text-xs leading-relaxed max-w-[240px]">
                {{ booking.address }}
              </span>
            </div>

            <!-- Valores -->
            <div class="pt-2 border-t border-(--ui-border-muted) space-y-1 text-xs">
              <div class="flex justify-between text-muted">
                <span>Precio estimado:</span>
                <span class="font-semibold text-(--ui-text-highlighted)">
                  {{ booking.priceTypeSnapshot === 'quote' ? 'A cotizar' : formatCents(booking.priceCentsSnapshot) }}
                </span>
              </div>

              <div v-if="booking.travelFeeCentsSnapshot > 0" class="flex justify-between text-muted">
                <span>Traslado a domicilio:</span>
                <span>{{ formatCents(booking.travelFeeCentsSnapshot) }}</span>
              </div>

              <div v-if="booking.depositCentsSnapshot > 0" class="flex justify-between items-center text-muted pt-1">
                <span>Anticipo: {{ formatCents(booking.depositCentsSnapshot) }}</span>
                <UBadge
                  :color="booking.depositStatus === 'received' ? 'success' : 'neutral'"
                  variant="soft"
                  size="xs"
                >
                  {{ booking.depositStatus === 'received' ? 'Anticipo recibido' : 'Anticipo pendiente' }}
                </UBadge>
              </div>
            </div>
          </div>
        </div>

        <!-- Acciones de contacto -->
        <div class="flex flex-col sm:flex-row gap-3 pt-2">
          <UButton
            :href="whatsappHref"
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
            variant="solid"
            size="lg"
            block
            class="font-semibold"
          >
            <UIcon name="i-material-symbols-chat-outline-rounded" class="w-5 h-5 mr-1" />
            Contactar por WhatsApp
          </UButton>

          <UButton
            to="/reservar"
            color="neutral"
            variant="subtle"
            size="lg"
            block
          >
            Nueva cita
          </UButton>
        </div>
      </div>

      <!-- Si hubo error / No encontrada -->
      <div v-else-if="error" class="text-center py-12 space-y-5">
        <div class="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
          <UIcon name="i-material-symbols-error-outline-rounded" class="w-10 h-10" />
        </div>

        <div>
          <h1 class="text-xl font-bold text-(--ui-text-highlighted)">No encontramos tu reserva</h1>
          <p class="text-xs text-muted mt-1 max-w-sm mx-auto">
            El código <strong class="font-mono text-(--ui-text-highlighted)">#{{ code }}</strong> no coincide con ninguna reserva registrada.
          </p>
        </div>

        <!-- Input para intentar con otro código -->
        <div class="p-5 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) max-w-sm mx-auto">
          <label class="block text-xs text-muted mb-2 font-medium">Ingresa otro código de 6 caracteres</label>
          <div class="flex gap-2">
            <UInput
              v-model="otherCode"
              placeholder="Ej. MEL123"
              class="flex-1 font-mono uppercase"
              @keydown.enter="searchOther"
            />
            <UButton color="primary" variant="solid" size="sm" @click="searchOther">
              Buscar
            </UButton>
          </div>
        </div>

        <div class="pt-4">
          <NuxtLink to="/" class="text-xs text-violet-600 dark:text-violet-400 hover:underline">
            ← Volver a la página de inicio
          </NuxtLink>
        </div>
      </div>

      <!-- Cargando -->
      <div v-else class="text-center py-16 text-muted flex items-center justify-center gap-2">
        <UIcon name="i-material-symbols-progress-activity" class="w-5 h-5 animate-spin text-violet-500" />
        <span>Buscando tu cita...</span>
      </div>
    </main>

    <PublicFooter :instagram-url="settings?.instagramUrl" :whatsapp="settings?.whatsapp" />
  </div>
</template>
