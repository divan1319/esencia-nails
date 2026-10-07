<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { data: templates, refresh, status } = await useFetch('/api/admin/whatsapp-templates')

const kinds = [
  { value: 'confirmation', label: 'Confirmación' },
  { value: 'rejection', label: 'Rechazo' },
  { value: 'reschedule', label: 'Reprogramación' },
  { value: 'cancellation', label: 'Cancelación' },
  { value: 'deposit', label: 'Anticipo' },
  { value: 'reminder', label: 'Recordatorio' },
  { value: 'other', label: 'Otro' },
]

const isModalOpen = ref(false)
const isEditing = ref(false)
const currentId = ref<string | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)

const form = reactive({
  name: '',
  kind: 'confirmation',
  body: '',
  active: true,
  sortOrder: 0,
})

function openCreate() {
  isEditing.value = false
  currentId.value = null
  form.name = ''
  form.kind = 'confirmation'
  form.body = '¡Hola {{nombre}}! Tu cita de {{servicio}}...'
  form.active = true
  form.sortOrder = (templates.value?.length || 0) * 10
  formError.value = null
  isModalOpen.value = true
}

function openEdit(item: any) {
  isEditing.value = true
  currentId.value = item.id
  form.name = item.name
  form.kind = item.kind
  form.body = item.body
  form.active = item.active
  form.sortOrder = item.sortOrder
  formError.value = null
  isModalOpen.value = true
}

async function saveTemplate() {
  if (!form.name.trim() || !form.body.trim()) {
    formError.value = 'El nombre y el texto son obligatorios'
    return
  }

  saving.value = true
  formError.value = null

  try {
    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      body: form.body.trim(),
      active: form.active,
      sortOrder: form.sortOrder,
    }

    if (isEditing.value && currentId.value) {
      await $fetch(`/api/admin/whatsapp-templates/${currentId.value}`, {
        method: 'PATCH',
        body: payload,
      })
    } else {
      await $fetch('/api/admin/whatsapp-templates', {
        method: 'POST',
        body: payload,
      })
    }

    isModalOpen.value = false
    await refresh()
  } catch (err: any) {
    formError.value = err.data?.statusMessage || err.message || 'Error al guardar'
  } finally {
    saving.value = false
  }
}

// Eliminación
const isDeleteOpen = ref(false)
const itemToDelete = ref<any>(null)
const deleting = ref(false)

function confirmDelete(item: any) {
  itemToDelete.value = item
  isDeleteOpen.value = true
}

async function executeDelete() {
  if (!itemToDelete.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/whatsapp-templates/${itemToDelete.value.id}`, { method: 'DELETE' })
    isDeleteOpen.value = false
    await refresh()
  } catch (err: any) {
    alert(err.data?.statusMessage || err.message || 'Error al eliminar')
  } finally {
    deleting.value = false
  }
}

function kindLabel(k: string) {
  return kinds.find((x) => x.value === k)?.label || k
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-(--ui-text-highlighted)">Plantillas de WhatsApp</h1>
        <p class="text-sm text-muted mt-1">
          Crea y personaliza los mensajes que se enviarán a tus clientas con los datos de sus citas.
        </p>
      </div>

      <UButton color="primary" variant="solid" @click="openCreate">
        <UIcon name="i-material-symbols-add-rounded" class="w-4 h-4 mr-1" />
        Nueva plantilla
      </UButton>
    </div>

    <!-- Lista de plantillas -->
    <div v-if="templates?.length" class="space-y-4">
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="p-5 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) flex flex-col gap-3"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-base text-(--ui-text-highlighted)">{{ tpl.name }}</h3>
            <UBadge color="primary" variant="subtle" size="xs">
              {{ kindLabel(tpl.kind) }}
            </UBadge>
            <UBadge :color="tpl.active ? 'success' : 'neutral'" variant="soft" size="xs">
              {{ tpl.active ? 'Activa' : 'Inactiva' }}
            </UBadge>
          </div>

          <div class="flex items-center gap-1">
            <UButton size="sm" color="neutral" variant="ghost" @click="openEdit(tpl)">
              <UIcon name="i-material-symbols-edit-outline-rounded" class="w-4 h-4" />
            </UButton>
            <UButton size="sm" color="error" variant="ghost" @click="confirmDelete(tpl)">
              <UIcon name="i-material-symbols-delete-outline-rounded" class="w-4 h-4" />
            </UButton>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-(--ui-bg) border border-(--ui-border-muted) text-xs font-sans text-muted whitespace-pre-wrap">
          {{ tpl.body }}
        </div>
      </div>
    </div>
    <div v-else-if="status === 'pending'" class="text-center py-12 text-muted">
      Cargando plantillas...
    </div>
    <div v-else class="text-center py-12 text-muted p-8 border border-dashed border-(--ui-border-muted) rounded-2xl">
      No hay plantillas registradas.
    </div>

    <!-- Modal Crear / Editar -->
    <UModal v-model:open="isModalOpen" :title="isEditing ? 'Editar plantilla' : 'Nueva plantilla'">
      <template #body>
        <form @submit.prevent="saveTemplate" class="space-y-4">
          <div v-if="formError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            {{ formError }}
          </div>

          <UFormField label="Nombre de la plantilla">
            <UInput v-model="form.name" placeholder="Ej. Confirmación estándar" required class="w-full" />
          </UFormField>

          <UFormField label="Tipo de acción">
            <select
              v-model="form.kind"
              class="w-full h-10 px-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg) text-(--ui-text) text-sm focus:outline-none"
            >
              <option v-for="k in kinds" :key="k.value" :value="k.value">{{ k.label }}</option>
            </select>
          </UFormField>

          <UFormField label="Cuerpo del mensaje">
            <UTextarea
              v-model="form.body"
              rows="5"
              placeholder="Escribe el mensaje usando las variables..."
              required
              class="w-full font-sans text-sm"
            />
          </UFormField>

          <!-- Cheat-sheet de variables -->
          <div class="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-muted space-y-1">
            <span class="font-semibold text-(--ui-text-highlighted) block mb-1">Variables dinámicas disponibles:</span>
            <div class="flex flex-wrap gap-1.5 text-[11px] font-mono">
              <span class="px-1.5 py-0.5 rounded bg-(--ui-bg)">\{\{nombre\}\}</span>
              <span class="px-1.5 py-0.5 rounded bg-(--ui-bg)">\{\{servicio\}\}</span>
              <span class="px-1.5 py-0.5 rounded bg-(--ui-bg)">\{\{fecha\}\}</span>
              <span class="px-1.5 py-0.5 rounded bg-(--ui-bg)">\{\{hora\}\}</span>
              <span class="px-1.5 py-0.5 rounded bg-(--ui-bg)">\{\{codigo\}\}</span>
              <span class="px-1.5 py-0.5 rounded bg-(--ui-bg)">\{\{zona\}\}</span>
              <span class="px-1.5 py-0.5 rounded bg-(--ui-bg)">\{\{direccion\}\}</span>
              <span class="px-1.5 py-0.5 rounded bg-(--ui-bg)">\{\{precio\}\}</span>
              <span class="px-1.5 py-0.5 rounded bg-(--ui-bg)">\{\{traslado\}\}</span>
              <span class="px-1.5 py-0.5 rounded bg-(--ui-bg)">\{\{anticipo\}\}</span>
              <span class="px-1.5 py-0.5 rounded bg-(--ui-bg)">\{\{instrucciones_anticipo\}\}</span>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-1">
            <input
              id="templateActive"
              v-model="form.active"
              type="checkbox"
              class="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
            />
            <label for="templateActive" class="text-sm font-medium">Plantilla activa (disponible para enviar)</label>
          </div>
        </form>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="isModalOpen = false">Cancelar</UButton>
          <UButton color="primary" variant="solid" :loading="saving" @click="saveTemplate">
            {{ isEditing ? 'Guardar cambios' : 'Crear plantilla' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal Confirmar Eliminación -->
    <UModal v-model:open="isDeleteOpen" title="Confirmar eliminación">
      <template #body>
        <p class="text-sm text-muted">
          ¿Estás segura de eliminar la plantilla <strong>{{ itemToDelete?.name }}</strong>?
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="isDeleteOpen = false">Cancelar</UButton>
          <UButton color="error" variant="solid" :loading="deleting" @click="executeDelete">Eliminar</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
