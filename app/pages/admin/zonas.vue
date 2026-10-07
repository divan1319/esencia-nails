<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { data: zones, refresh, status } = await useFetch('/api/admin/zones')

const isModalOpen = ref(false)
const isEditing = ref(false)
const currentId = ref<string | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)

const form = reactive({
  name: '',
  travelFeeDollars: 0,
  active: true,
  sortOrder: 0,
})

function openCreate() {
  isEditing.value = false
  currentId.value = null
  form.name = ''
  form.travelFeeDollars = 0
  form.active = true
  form.sortOrder = (zones.value?.length || 0) * 10
  formError.value = null
  isModalOpen.value = true
}

function openEdit(item: any) {
  isEditing.value = true
  currentId.value = item.id
  form.name = item.name
  form.travelFeeDollars = item.travelFeeCents ? item.travelFeeCents / 100 : 0
  form.active = item.active
  form.sortOrder = item.sortOrder
  formError.value = null
  isModalOpen.value = true
}

async function saveZone() {
  if (!form.name.trim()) {
    formError.value = 'El nombre de la zona es requerido'
    return
  }

  saving.value = true
  formError.value = null

  try {
    const payload = {
      name: form.name.trim(),
      travelFeeCents: Math.round(form.travelFeeDollars * 100),
      active: form.active,
      sortOrder: form.sortOrder,
    }

    if (isEditing.value && currentId.value) {
      await $fetch(`/api/admin/zones/${currentId.value}`, {
        method: 'PATCH',
        body: payload,
      })
    } else {
      await $fetch('/api/admin/zones', {
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
const zoneToDelete = ref<any>(null)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

function confirmDelete(item: any) {
  zoneToDelete.value = item
  deleteError.value = null
  isDeleteOpen.value = true
}

async function executeDelete() {
  if (!zoneToDelete.value) return
  deleting.value = true
  deleteError.value = null

  try {
    await $fetch(`/api/admin/zones/${zoneToDelete.value.id}`, {
      method: 'DELETE',
    })
    isDeleteOpen.value = false
    await refresh()
  } catch (err: any) {
    deleteError.value = err.data?.statusMessage || err.message || 'Error al eliminar'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-(--ui-text-highlighted)">Zonas de cobertura</h1>
        <p class="text-sm text-muted mt-1">Configura las zonas donde brindas servicio y el costo de traslado.</p>
      </div>

      <UButton color="primary" variant="solid" @click="openCreate">
        <UIcon name="i-material-symbols-add-rounded" class="w-4 h-4 mr-1" />
        Nueva zona
      </UButton>
    </div>

    <div v-if="zones?.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="zone in zones"
        :key="zone.id"
        class="p-4 sm:p-5 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) flex items-center justify-between gap-4"
      >
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-base text-(--ui-text-highlighted)">{{ zone.name }}</h3>
            <UBadge :color="zone.active ? 'success' : 'neutral'" variant="soft" size="xs">
              {{ zone.active ? 'Activa' : 'Inactiva' }}
            </UBadge>
          </div>

          <p class="text-xs text-muted mt-1">
            Recargo de traslado:
            <span class="font-semibold text-violet-600 dark:text-violet-400">
              {{ zone.travelFeeCents === 0 ? 'Sin cargo ($0.00)' : `$${(zone.travelFeeCents / 100).toFixed(2)}` }}
            </span>
            <span class="ml-2">· Orden: {{ zone.sortOrder }}</span>
          </p>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            @click="openEdit(zone)"
          >
            <UIcon name="i-material-symbols-edit-outline-rounded" class="w-4 h-4" />
          </UButton>
          <UButton
            size="sm"
            color="error"
            variant="ghost"
            @click="confirmDelete(zone)"
          >
            <UIcon name="i-material-symbols-delete-outline-rounded" class="w-4 h-4" />
          </UButton>
        </div>
      </div>
    </div>
    <div v-else-if="status === 'pending'" class="text-center py-12 text-muted">
      Cargando zonas...
    </div>
    <div v-else class="text-center py-12 text-muted p-8 border border-dashed border-(--ui-border-muted) rounded-2xl">
      No hay zonas registradas. Crea la primera con el botón superior.
    </div>

    <!-- Modal Crear / Editar -->
    <UModal v-model:open="isModalOpen" :title="isEditing ? 'Editar zona' : 'Nueva zona'">
      <template #body>
        <form @submit.prevent="saveZone" class="space-y-4">
          <div v-if="formError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            {{ formError }}
          </div>

          <UFormField label="Nombre de la zona">
            <UInput v-model="form.name" placeholder="Ej. Santa Tecla Centro" required class="w-full" />
          </UFormField>

          <UFormField label="Cargo de traslado ($ USD)">
            <UInput
              v-model.number="form.travelFeeDollars"
              type="number"
              step="0.25"
              min="0"
              placeholder="0.00"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Orden de aparición">
            <UInput
              v-model.number="form.sortOrder"
              type="number"
              class="w-full"
            />
          </UFormField>

          <div class="flex items-center gap-2 pt-2">
            <input
              id="zoneActiveCheckbox"
              v-model="form.active"
              type="checkbox"
              class="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
            />
            <label for="zoneActiveCheckbox" class="text-sm font-medium">Zona activa (disponible para reservas)</label>
          </div>
        </form>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="isModalOpen = false">
            Cancelar
          </UButton>
          <UButton color="primary" variant="solid" :loading="saving" @click="saveZone">
            {{ isEditing ? 'Guardar cambios' : 'Crear zona' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal Confirmar Eliminación -->
    <UModal v-model:open="isDeleteOpen" title="Confirmar eliminación">
      <template #body>
        <div class="space-y-3">
          <p class="text-sm text-muted">
            ¿Estás segura de que deseas eliminar la zona <strong>{{ zoneToDelete?.name }}</strong>?
          </p>
          <div v-if="deleteError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            {{ deleteError }}
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="isDeleteOpen = false">
            Cancelar
          </UButton>
          <UButton color="error" variant="solid" :loading="deleting" @click="executeDelete">
            Eliminar
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
