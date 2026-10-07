<script setup lang="ts">
import { formatMinute } from '~/../server/utils/slots'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { data: rules, refresh: refreshRules } = await useFetch('/api/admin/availability-rules')
const { data: blockedDates, refresh: refreshBlocked } = await useFetch('/api/admin/blocked-dates')

const weekdays = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

// Modal Regla Semanal
const isRuleModalOpen = ref(false)
const isEditingRule = ref(false)
const currentRuleId = ref<string | null>(null)
const ruleError = ref<string | null>(null)
const savingRule = ref(false)

const ruleForm = reactive({
  weekday: 1,
  startHour: '16:30',
  endHour: '20:30',
  mode: 'auto' as 'auto' | 'on_request',
})

function timeToMinute(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function minuteToTime(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, '0')
  const m = String(min % 60).padStart(2, '0')
  return `${h}:${m}`
}

function openCreateRule(defaultWeekday = 1) {
  isEditingRule.value = false
  currentRuleId.value = null
  ruleForm.weekday = defaultWeekday
  ruleForm.startHour = '16:30'
  ruleForm.endHour = '20:30'
  ruleForm.mode = 'auto'
  ruleError.value = null
  isRuleModalOpen.value = true
}

function openEditRule(rule: any) {
  isEditingRule.value = true
  currentRuleId.value = rule.id
  ruleForm.weekday = rule.weekday
  ruleForm.startHour = minuteToTime(rule.startMinute)
  ruleForm.endHour = minuteToTime(rule.endMinute)
  ruleForm.mode = rule.mode
  ruleError.value = null
  isRuleModalOpen.value = true
}

async function saveRule() {
  const startMinute = timeToMinute(ruleForm.startHour)
  const endMinute = timeToMinute(ruleForm.endHour)

  if (endMinute <= startMinute) {
    ruleError.value = 'La hora de fin debe ser posterior a la hora de inicio'
    return
  }

  savingRule.value = true
  ruleError.value = null

  try {
    const payload = {
      weekday: Number(ruleForm.weekday),
      startMinute,
      endMinute,
      mode: ruleForm.mode,
    }

    if (isEditingRule.value && currentRuleId.value) {
      await $fetch(`/api/admin/availability-rules/${currentRuleId.value}`, {
        method: 'PATCH',
        body: payload,
      })
    } else {
      await $fetch('/api/admin/availability-rules', {
        method: 'POST',
        body: payload,
      })
    }

    isRuleModalOpen.value = false
    await refreshRules()
  } catch (err: any) {
    ruleError.value = err.data?.statusMessage || err.message || 'Error al guardar horario'
  } finally {
    savingRule.value = false
  }
}

async function deleteRule(id: string) {
  try {
    await $fetch(`/api/admin/availability-rules/${id}`, { method: 'DELETE' })
    await refreshRules()
  } catch (err: any) {
    alert(err.data?.statusMessage || err.message || 'Error al eliminar')
  }
}

// Modal Bloqueo de Fechas
const isBlockModalOpen = ref(false)
const blockError = ref<string | null>(null)
const savingBlock = ref(false)

const blockForm = reactive({
  date: new Date().toISOString().split('T')[0],
  isFullDay: true,
  startHour: '08:00',
  endHour: '12:00',
  reason: '',
})

function openCreateBlock() {
  blockForm.date = new Date().toISOString().split('T')[0]
  blockForm.isFullDay = true
  blockForm.startHour = '08:00'
  blockForm.endHour = '12:00'
  blockForm.reason = ''
  blockError.value = null
  isBlockModalOpen.value = true
}

async function saveBlock() {
  savingBlock.value = true
  blockError.value = null

  try {
    const payload: any = {
      date: blockForm.date,
      reason: blockForm.reason.trim() || null,
    }

    if (!blockForm.isFullDay) {
      const startMinute = timeToMinute(blockForm.startHour)
      const endMinute = timeToMinute(blockForm.endHour)
      if (endMinute <= startMinute) {
        blockError.value = 'La hora de fin debe ser posterior a la de inicio'
        savingBlock.value = false
        return
      }
      payload.startMinute = startMinute
      payload.endMinute = endMinute
    }

    await $fetch('/api/admin/blocked-dates', {
      method: 'POST',
      body: payload,
    })

    isBlockModalOpen.value = false
    await refreshBlocked()
  } catch (err: any) {
    blockError.value = err.data?.statusMessage || err.message || 'Error al guardar bloqueo'
  } finally {
    savingBlock.value = false
  }
}

async function deleteBlock(id: string) {
  try {
    await $fetch(`/api/admin/blocked-dates/${id}`, { method: 'DELETE' })
    await refreshBlocked()
  } catch (err: any) {
    alert(err.data?.statusMessage || err.message || 'Error al eliminar bloqueo')
  }
}
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-bold text-(--ui-text-highlighted)">Horarios y bloqueos</h1>
      <p class="text-sm text-muted mt-1">Configura tus franjas semanales de trabajo y bloquea días o franjas festivas.</p>
    </div>

    <!-- SECCIÓN 1: REGLAS SEMANALES -->
    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">Disponibilidad semanal</h2>
          <p class="text-xs text-muted">Franjas habituales en las que atiendes cada día de la semana.</p>
        </div>

        <UButton color="primary" variant="solid" size="sm" @click="openCreateRule()">
          <UIcon name="i-material-symbols-add-rounded" class="w-4 h-4 mr-1" />
          Agregar franja
        </UButton>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="day in weekdays"
          :key="day.value"
          class="p-4 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) flex flex-col justify-between"
        >
          <div class="flex items-center justify-between mb-3 border-b border-(--ui-border-muted) pb-2">
            <span class="font-bold text-sm text-(--ui-text-highlighted)">{{ day.label }}</span>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              @click="openCreateRule(day.value)"
            >
              + Franja
            </UButton>
          </div>

          <div class="space-y-2">
            <template v-if="rules?.filter((r: any) => r.weekday === day.value).length">
              <div
                v-for="rule in rules.filter((r: any) => r.weekday === day.value)"
                :key="rule.id"
                class="flex items-center justify-between p-2 rounded-xl bg-(--ui-bg) border border-(--ui-border-muted) text-xs"
              >
                <div>
                  <span class="font-semibold block">
                    {{ formatMinute(rule.startMinute) }} - {{ formatMinute(rule.endMinute) }}
                  </span>
                  <UBadge
                    :color="rule.mode === 'auto' ? 'success' : 'neutral'"
                    variant="soft"
                    size="xs"
                    class="mt-1"
                  >
                    {{ rule.mode === 'auto' ? 'Automático' : 'Bajo solicitud' }}
                  </UBadge>
                </div>

                <div class="flex items-center gap-1">
                  <UButton size="xs" color="neutral" variant="ghost" @click="openEditRule(rule)">
                    <UIcon name="i-material-symbols-edit-outline-rounded" class="w-3.5 h-3.5" />
                  </UButton>
                  <UButton size="xs" color="error" variant="ghost" @click="deleteRule(rule.id)">
                    <UIcon name="i-material-symbols-delete-outline-rounded" class="w-3.5 h-3.5" />
                  </UButton>
                </div>
              </div>
            </template>
            <p v-else class="text-xs text-muted italic py-1">No hay atención este día.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- SECCIÓN 2: BLOQUEOS DE FECHAS -->
    <section class="space-y-4 pt-4 border-t border-(--ui-border-muted)">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">Fechas y franjas bloqueadas</h2>
          <p class="text-xs text-muted">Días festivos, compromisos personales o momentos en los que no aceptarás citas.</p>
        </div>

        <UButton color="neutral" variant="subtle" size="sm" @click="openCreateBlock">
          <UIcon name="i-material-symbols-event-busy-outline-rounded" class="w-4 h-4 mr-1" />
          Bloquear fecha
        </UButton>
      </div>

      <div v-if="blockedDates?.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="b in blockedDates"
          :key="b.id"
          class="p-3.5 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg-muted) flex items-center justify-between gap-4 text-xs"
        >
          <div>
            <div class="flex items-center gap-2">
              <span class="font-semibold text-(--ui-text-highlighted)">{{ b.date }}</span>
              <UBadge color="error" variant="soft" size="xs">
                {{ b.startMinute == null ? 'Día completo' : `${formatMinute(b.startMinute)} - ${formatMinute(b.endMinute)}` }}
              </UBadge>
            </div>
            <p v-if="b.reason" class="text-muted text-[11px] mt-0.5">Motivo: {{ b.reason }}</p>
          </div>

          <UButton size="xs" color="error" variant="ghost" @click="deleteBlock(b.id)">
            <UIcon name="i-material-symbols-delete-outline-rounded" class="w-4 h-4" />
          </UButton>
        </div>
      </div>
      <div v-else class="text-center py-6 text-xs text-muted p-6 border border-dashed border-(--ui-border-muted) rounded-xl">
        No hay fechas bloqueadas actualmente.
      </div>
    </section>

    <!-- Modal Franja Semanal -->
    <UModal v-model:open="isRuleModalOpen" :title="isEditingRule ? 'Editar franja horaria' : 'Nueva franja horaria'">
      <template #body>
        <form @submit.prevent="saveRule" class="space-y-4">
          <div v-if="ruleError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            {{ ruleError }}
          </div>

          <UFormField label="Día de la semana">
            <select
              v-model="ruleForm.weekday"
              class="w-full h-10 px-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg) text-(--ui-text) text-sm focus:outline-none"
            >
              <option v-for="d in weekdays" :key="d.value" :value="d.value">{{ d.label }}</option>
            </select>
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Hora inicio">
              <input
                v-model="ruleForm.startHour"
                type="time"
                required
                class="w-full h-10 px-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg) text-(--ui-text) text-sm focus:outline-none"
              />
            </UFormField>

            <UFormField label="Hora fin">
              <input
                v-model="ruleForm.endHour"
                type="time"
                required
                class="w-full h-10 px-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg) text-(--ui-text) text-sm focus:outline-none"
              />
            </UFormField>
          </div>

          <UFormField label="Modo de disponibilidad">
            <select
              v-model="ruleForm.mode"
              class="w-full h-10 px-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg) text-(--ui-text) text-sm focus:outline-none"
            >
              <option value="auto">Automático (se ofrecen horarios directos)</option>
              <option value="on_request">Bajo solicitud (indica a la clienta que está sujeto a confirmación)</option>
            </select>
          </UFormField>
        </form>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="isRuleModalOpen = false">Cancelar</UButton>
          <UButton color="primary" variant="solid" :loading="savingRule" @click="saveRule">
            {{ isEditingRule ? 'Guardar cambios' : 'Crear franja' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal Bloqueo de Fechas -->
    <UModal v-model:open="isBlockModalOpen" title="Bloquear fecha u horario">
      <template #body>
        <form @submit.prevent="saveBlock" class="space-y-4">
          <div v-if="blockError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            {{ blockError }}
          </div>

          <UFormField label="Fecha a bloquear">
            <input
              v-model="blockForm.date"
              type="date"
              required
              class="w-full h-10 px-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg) text-(--ui-text) text-sm focus:outline-none"
            />
          </UFormField>

          <div class="flex items-center gap-2 pt-1">
            <input
              id="fullDayCheckbox"
              v-model="blockForm.isFullDay"
              type="checkbox"
              class="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
            />
            <label for="fullDayCheckbox" class="text-sm font-medium">Bloquear todo el día</label>
          </div>

          <div v-if="!blockForm.isFullDay" class="grid grid-cols-2 gap-4 pt-2">
            <UFormField label="Hora inicio">
              <input
                v-model="blockForm.startHour"
                type="time"
                class="w-full h-10 px-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg) text-(--ui-text) text-sm focus:outline-none"
              />
            </UFormField>
            <UFormField label="Hora fin">
              <input
                v-model="blockForm.endHour"
                type="time"
                class="w-full h-10 px-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg) text-(--ui-text) text-sm focus:outline-none"
              />
            </UFormField>
          </div>

          <UFormField label="Motivo del bloqueo (opcional)">
            <UInput v-model="blockForm.reason" placeholder="Ej. Día festivo / Médico" class="w-full" />
          </UFormField>
        </form>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="isBlockModalOpen = false">Cancelar</UButton>
          <UButton color="error" variant="solid" :loading="savingBlock" @click="saveBlock">
            Crear bloqueo
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
