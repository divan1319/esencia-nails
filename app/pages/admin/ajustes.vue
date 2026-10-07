<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { data: settings, refresh, status } = await useFetch('/api/settings')

const saving = ref(false)
const successMessage = ref(false)
const errorMessage = ref<string | null>(null)

const form = reactive({
  slotStepMinutes: 30,
  travelBufferMinutes: 0,
  minNoticeHours: 12,
  maxDaysAhead: 30,
  pendingBlocksSlot: true,
  chargeTravelFee: false,
  depositMode: 'none' as 'none' | 'fixed' | 'percent',
  depositValue: 0,
  depositInstructions: '',
})

watch(
  settings,
  (val) => {
    if (val) {
      form.slotStepMinutes = val.slotStepMinutes ?? 30
      form.travelBufferMinutes = val.travelBufferMinutes ?? 0
      form.minNoticeHours = val.minNoticeHours ?? 12
      form.maxDaysAhead = val.maxDaysAhead ?? 30
      form.pendingBlocksSlot = val.pendingBlocksSlot ?? true
      form.chargeTravelFee = val.chargeTravelFee ?? false
      form.depositMode = val.depositMode ?? 'none'
      form.depositValue = val.depositMode === 'fixed' ? (val.depositValue ? val.depositValue / 100 : 0) : (val.depositValue ?? 0)
      form.depositInstructions = val.depositInstructions || ''
    }
  },
  { immediate: true }
)

async function saveSettings() {
  saving.value = true
  errorMessage.value = null
  successMessage.value = false

  try {
    const depositRaw = form.depositMode === 'fixed'
      ? Math.round(form.depositValue * 100)
      : Math.round(form.depositValue)

    await $fetch('/api/admin/settings', {
      method: 'PATCH',
      body: {
        slotStepMinutes: form.slotStepMinutes,
        travelBufferMinutes: form.travelBufferMinutes,
        minNoticeHours: form.minNoticeHours,
        maxDaysAhead: form.maxDaysAhead,
        pendingBlocksSlot: form.pendingBlocksSlot,
        chargeTravelFee: form.chargeTravelFee,
        depositMode: form.depositMode,
        depositValue: depositRaw,
        depositInstructions: form.depositInstructions.trim() || null,
      },
    })

    successMessage.value = true
    await refresh()
    setTimeout(() => {
      successMessage.value = false
    }, 4000)
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message || 'Error al guardar ajustes'
  } finally {
    saving.value = false
  }
}

// Acción masiva de Ajustes Avanzados: Cancelar pendientes vencidas
const cancelingExpired = ref(false)
const cancelResult = ref<string | null>(null)

async function cancelExpired() {
  if (!confirm('¿Deseas cancelar todas las solicitudes pendientes cuya fecha y hora de inicio ya pasaron?')) {
    return
  }

  cancelingExpired.value = true
  cancelResult.value = null

  try {
    const res = await $fetch<{ cancelledCount: number }>('/api/admin/bookings/cancel-expired', {
      method: 'POST',
    })
    cancelResult.value = `Se cancelaron ${res.cancelledCount} solicitud(es) pendiente(s) vencida(s).`
  } catch (err: any) {
    cancelResult.value = `Error: ${err.data?.statusMessage || err.message}`
  } finally {
    cancelingExpired.value = false
  }
}
</script>

<template>
  <div class="space-y-8 w-full">
    <div>
      <h1 class="text-2xl font-bold text-(--ui-text-highlighted)">Ajustes y reglas de negocio</h1>
      <p class="text-sm text-muted mt-1">Configura las reglas de cálculo de horarios, anticipos y traslados.</p>
    </div>

    <div v-if="successMessage" class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
      <UIcon name="i-material-symbols-check-circle-outline-rounded" class="w-4 h-4 shrink-0" />
      <span>Ajustes guardados correctamente.</span>
    </div>

    <div v-if="errorMessage" class="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
      <UIcon name="i-material-symbols-error-outline-rounded" class="w-4 h-4 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <!-- FORMULARIO PRINCIPAL -->
      <form @submit.prevent="saveSettings" class="lg:col-span-2 space-y-6">
        <!-- REGLAS DE RESERVAS -->
        <div class="p-6 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) space-y-4">
          <h2 class="text-base font-semibold text-(--ui-text-highlighted) border-b border-(--ui-border-muted) pb-2">
            Horarios y Disponibilidad
          </h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Intervalo entre horarios ofrecidos (minutos)">
              <UInput v-model.number="form.slotStepMinutes" type="number" step="15" min="15" class="w-full" />
              <p class="text-[11px] text-muted mt-1">Ej. 30 min (ofrece 4:30, 5:00, 5:30...)</p>
            </UFormField>

            <UFormField label="Tiempo de traslado entre citas (minutos)">
              <UInput v-model.number="form.travelBufferMinutes" type="number" step="15" min="0" class="w-full" />
              <p class="text-[11px] text-muted mt-1">0 = apagado. Margen antes y después de cada cita.</p>
            </UFormField>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Anticipación mínima para reservar (horas)">
              <UInput v-model.number="form.minNoticeHours" type="number" min="0" class="w-full" />
              <p class="text-[11px] text-muted mt-1">Horas previas requeridas antes de poder agendar.</p>
            </UFormField>

            <UFormField label="Días máximos hacia adelante">
              <UInput v-model.number="form.maxDaysAhead" type="number" min="1" max="180" class="w-full" />
              <p class="text-[11px] text-muted mt-1">Ventana máxima visible en el calendario (ej. 30 días).</p>
            </UFormField>
          </div>

          <div class="pt-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="form.pendingBlocksSlot"
                type="checkbox"
                class="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
              />
              <span class="text-sm font-medium">Una solicitud pendiente ya ocupa el horario</span>
            </label>
            <p class="text-[11px] text-muted ml-6 mt-0.5">
              Impide que dos personas pidan la misma hora simultáneamente antes de que la confirmes.
            </p>
          </div>
        </div>

        <!-- TRASLADO Y ANTICIPOS -->
        <div class="p-6 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) space-y-4">
          <h2 class="text-base font-semibold text-(--ui-text-highlighted) border-b border-(--ui-border-muted) pb-2">
            Traslado y Anticipos
          </h2>

          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="form.chargeTravelFee"
                type="checkbox"
                class="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
              />
              <span class="text-sm font-medium">Cobrar recargo de traslado por zona</span>
            </label>
            <p class="text-[11px] text-muted ml-6 mt-0.5">
              Si está activo, suma la tarifa de traslado de la zona elegida al total de la reserva.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <UFormField label="Modalidad de anticipo">
              <select
                v-model="form.depositMode"
                class="w-full h-10 px-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg) text-(--ui-text) text-sm focus:outline-none"
              >
                <option value="none">Ninguno (pago al finalizar)</option>
                <option value="fixed">Monto fijo ($ USD)</option>
                <option value="percent">Porcentaje (%)</option>
              </select>
            </UFormField>

            <UFormField v-if="form.depositMode !== 'none'" :label="form.depositMode === 'fixed' ? 'Monto de anticipo ($ USD)' : 'Porcentaje de anticipo (%)'">
              <UInput
                v-model.number="form.depositValue"
                type="number"
                step="0.5"
                min="0"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField v-if="form.depositMode !== 'none'" label="Instrucciones para transferir el anticipo">
            <UTextarea
              v-model="form.depositInstructions"
              placeholder="Ej. Transferencia a cuenta Banco Agrícola #..., o Chivo Wallet a..."
              class="w-full text-xs font-sans"
            />
          </UFormField>
        </div>

        <div class="flex justify-end">
          <UButton
            type="submit"
            color="primary"
            variant="solid"
            size="lg"
            class="font-semibold px-6"
            :loading="saving"
          >
            Guardar ajustes
          </UButton>
        </div>
      </form>

      <!-- PANEL LATERAL: RESUMEN Y ACCIONES AVANZADAS -->
      <div class="space-y-6">
        <!-- Resumen de reglas activas -->
        <div class="p-5 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) space-y-3">
          <h3 class="text-xs font-semibold text-(--ui-text-highlighted) uppercase tracking-wider">Reglas activas</h3>
          <div class="space-y-2 text-xs text-muted">
            <div class="flex justify-between py-1 border-b border-(--ui-border-muted)">
              <span>Paso de franjas:</span>
              <span class="font-semibold text-(--ui-text-highlighted)">{{ form.slotStepMinutes }} min</span>
            </div>
            <div class="flex justify-between py-1 border-b border-(--ui-border-muted)">
              <span>Margen entre citas:</span>
              <span class="font-semibold text-(--ui-text-highlighted)">{{ form.travelBufferMinutes }} min</span>
            </div>
            <div class="flex justify-between py-1 border-b border-(--ui-border-muted)">
              <span>Anticipación mínima:</span>
              <span class="font-semibold text-(--ui-text-highlighted)">{{ form.minNoticeHours }} h</span>
            </div>
            <div class="flex justify-between py-1 border-b border-(--ui-border-muted)">
              <span>Ventana visible:</span>
              <span class="font-semibold text-(--ui-text-highlighted)">{{ form.maxDaysAhead }} días</span>
            </div>
            <div class="flex justify-between py-1">
              <span>Recargo por zona:</span>
              <span class="font-semibold" :class="form.chargeTravelFee ? 'text-emerald-500' : 'text-muted'">
                {{ form.chargeTravelFee ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
          </div>
        </div>

        <!-- AJUSTES AVANZADOS -->
        <div class="p-5 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-4">
          <div>
            <h2 class="text-sm font-semibold text-red-600 dark:text-red-400">Ajustes avanzados</h2>
            <p class="text-[11px] text-muted mt-0.5">Acciones masivas de limpieza y mantenimiento.</p>
          </div>

          <div class="space-y-2">
            <span class="text-xs font-medium block">Cancelar pendientes vencidas</span>
            <p class="text-[11px] text-muted leading-relaxed">
              Pasa a estado cancelado todas las solicitudes pendientes cuya fecha y hora de inicio ya pasaron.
            </p>

            <div class="pt-2">
              <UButton
                color="error"
                variant="solid"
                size="sm"
                block
                :loading="cancelingExpired"
                @click="cancelExpired"
              >
                Cancelar vencidas
              </UButton>
            </div>
          </div>

          <div v-if="cancelResult" class="p-3 rounded-xl bg-(--ui-bg) border border-(--ui-border-muted) text-xs text-muted">
            {{ cancelResult }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
