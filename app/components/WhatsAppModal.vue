<script setup lang="ts">
import { renderTemplate, bookingVars, whatsappLink } from '~/utils/whatsapp'

const props = defineProps<{
  open: boolean
  booking: any
  initialKind?: string
  settings: any
  zones?: any[]
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'closed'): void
}>()

const isOpen = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
})

const { data: allTemplates } = await useFetch('/api/admin/whatsapp-templates')

const selectedTemplateId = ref<string>('')
const editableMessage = ref<string>('')

const zoneName = computed(() => {
  if (!props.booking?.zoneId || !props.zones) return null
  return props.zones.find((z) => z.id === props.booking.zoneId)?.name
})

const vars = computed(() => {
  if (!props.booking) return {}
  return bookingVars(props.booking, props.settings, zoneName.value)
})

// Plantillas activas
const activeTemplates = computed(() => {
  return allTemplates.value?.filter((t: any) => t.active) || []
})

// Mapear kind de acción a template kind
function mapKind(kind?: string) {
  if (!kind) return 'confirmation'
  if (kind === 'confirm') return 'confirmation'
  if (kind === 'reject') return 'rejection'
  if (kind === 'reschedule') return 'reschedule'
  if (kind === 'cancel') return 'cancellation'
  return kind
}

// Inicializar cuando se abre
watch(
  () => props.open,
  (val) => {
    if (val && activeTemplates.value.length) {
      const targetKind = mapKind(props.initialKind)
      // Buscar primera plantilla del tipo
      const matching = activeTemplates.value.find((t: any) => t.kind === targetKind)
      const selected = matching || activeTemplates.value[0]
      if (selected) {
        selectedTemplateId.value = selected.id
        editableMessage.value = renderTemplate(selected.body, vars.value)
      }
    }
  },
  { immediate: true }
)

function onTemplateChange() {
  const chosen = activeTemplates.value.find((t: any) => t.id === selectedTemplateId.value)
  if (chosen) {
    editableMessage.value = renderTemplate(chosen.body, vars.value)
  }
}

function openWhatsApp() {
  if (!props.booking?.clientPhone) return
  const link = whatsappLink(props.booking.clientPhone, editableMessage.value)
  window.open(link, '_blank')
  isOpen.value = false
  emit('closed')
}
</script>

<template>
  <UModal v-model:open="isOpen" title="Enviar mensaje por WhatsApp">
    <template #body>
      <div v-if="booking" class="space-y-4">
        <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-muted flex items-center justify-between">
          <span>Clienta: <strong class="text-(--ui-text-highlighted)">{{ booking.clientName }}</strong></span>
          <span class="font-mono font-semibold">+503 {{ booking.clientPhone }}</span>
        </div>

        <UFormField label="Seleccionar plantilla">
          <select
            v-model="selectedTemplateId"
            class="w-full h-10 px-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg) text-(--ui-text) text-sm focus:outline-none"
            @change="onTemplateChange"
          >
            <option v-for="tpl in activeTemplates" :key="tpl.id" :value="tpl.id">
              {{ tpl.name }} ({{ tpl.kind }})
            </option>
          </select>
        </UFormField>

        <UFormField label="Mensaje a enviar (puedes editarlo antes de abrir WhatsApp)">
          <UTextarea
            v-model="editableMessage"
            rows="6"
            class="w-full font-sans text-sm"
          />
        </UFormField>

        <p class="text-[11px] text-muted">
          Si alguna variable no tenía datos asignados, aparecerá entre llaves <code class="text-violet-600 dark:text-violet-400">\{\{ejemplo\}\}</code> para que puedas completarla a mano.
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          Cerrar
        </UButton>
        <UButton
          color="primary"
          variant="solid"
          class="font-semibold"
          @click="openWhatsApp"
        >
          <UIcon name="i-material-symbols-chat-outline-rounded" class="w-4 h-4 mr-1 text-emerald-300" />
          Abrir en WhatsApp
        </UButton>
      </div>
    </template>
  </UModal>
</template>
