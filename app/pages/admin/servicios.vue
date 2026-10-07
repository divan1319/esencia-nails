<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { data: services, refresh, status } = await useFetch('/api/admin/services')

// Estado de modal Crear/Editar
const isModalOpen = ref(false)
const isEditing = ref(false)
const currentId = ref<string | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)

const form = reactive({
  name: '',
  description: '',
  priceType: 'quote' as 'fixed' | 'from' | 'quote',
  priceDollars: 0,
  durationMinutes: 60,
  active: true,
  sortOrder: 0,
})

function openCreate() {
  isEditing.value = false
  currentId.value = null
  form.name = ''
  form.description = ''
  form.priceType = 'quote'
  form.priceDollars = 0
  form.durationMinutes = 60
  form.active = true
  form.sortOrder = (services.value?.length || 0) * 10
  formError.value = null
  isModalOpen.value = true
}

function openEdit(item: any) {
  isEditing.value = true
  currentId.value = item.id
  form.name = item.name
  form.description = item.description || ''
  form.priceType = item.priceType
  form.priceDollars = item.priceCents ? item.priceCents / 100 : 0
  form.durationMinutes = item.durationMinutes
  form.active = item.active
  form.sortOrder = item.sortOrder
  formError.value = null
  isModalOpen.value = true
}

async function saveService() {
  if (!form.name.trim()) {
    formError.value = 'El nombre es requerido'
    return
  }

  saving.value = true
  formError.value = null

  try {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      priceType: form.priceType,
      priceCents: form.priceType === 'quote' ? null : Math.round(form.priceDollars * 100),
      durationMinutes: form.durationMinutes,
      active: form.active,
      sortOrder: form.sortOrder,
    }

    if (isEditing.value && currentId.value) {
      await $fetch(`/api/admin/services/${currentId.value}`, {
        method: 'PATCH',
        body: payload,
      })
    } else {
      await $fetch('/api/admin/services', {
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
const serviceToDelete = ref<any>(null)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

function confirmDelete(item: any) {
  serviceToDelete.value = item
  deleteError.value = null
  isDeleteOpen.value = true
}

async function executeDelete() {
  if (!serviceToDelete.value) return
  deleting.value = true
  deleteError.value = null

  try {
    await $fetch(`/api/admin/services/${serviceToDelete.value.id}`, {
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

function formatPrice(type: string, cents: number | null) {
  if (type === 'quote' || cents == null) return 'A cotizar'
  const dollars = (cents / 100).toFixed(2)
  if (type === 'from') return `Desde $${dollars}`
  return `$${dollars}`
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-(--ui-text-highlighted)">Servicios</h1>
        <p class="text-sm text-muted mt-1">Gestiona los tipos de manicure, duración y precios.</p>
      </div>

      <UButton color="primary" variant="solid" @click="openCreate">
        <UIcon name="i-material-symbols-add-rounded" class="w-4 h-4 mr-1" />
        Nuevo servicio
      </UButton>
    </div>

    <!-- Lista de servicios -->
    <div v-if="services?.length" class="space-y-3">
      <div
        v-for="service in services"
        :key="service.id"
        class="p-4 sm:p-5 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div class="flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="font-semibold text-base text-(--ui-text-highlighted)">{{ service.name }}</h3>
            <UBadge :color="service.active ? 'success' : 'neutral'" variant="soft" size="xs">
              {{ service.active ? 'Activo' : 'Inactivo' }}
            </UBadge>
            <UBadge color="primary" variant="subtle" size="xs">
              {{ service.durationMinutes }} min
            </UBadge>
          </div>

          <p v-if="service.description" class="text-xs text-muted mt-1 line-clamp-2">
            {{ service.description }}
          </p>

          <div class="text-xs font-semibold text-violet-600 dark:text-violet-400 mt-2">
            {{ formatPrice(service.priceType, service.priceCents) }}
            <span class="text-muted font-normal ml-2">Orden: {{ service.sortOrder }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-center">
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            @click="openEdit(service)"
          >
            <UIcon name="i-material-symbols-edit-outline-rounded" class="w-4 h-4" />
          </UButton>
          <UButton
            size="sm"
            color="error"
            variant="ghost"
            @click="confirmDelete(service)"
          >
            <UIcon name="i-material-symbols-delete-outline-rounded" class="w-4 h-4" />
          </UButton>
        </div>
      </div>
    </div>
    <div v-else-if="status === 'pending'" class="text-center py-12 text-muted">
      Cargando servicios...
    </div>
    <div v-else class="text-center py-12 text-muted p-8 border border-dashed border-(--ui-border-muted) rounded-2xl">
      No hay servicios registrados. Crea el primero con el botón superior.
    </div>

    <!-- Modal Crear / Editar -->
    <UModal v-model:open="isModalOpen" :title="isEditing ? 'Editar servicio' : 'Nuevo servicio'">
      <template #body>
        <form @submit.prevent="saveService" class="space-y-4">
          <div v-if="formError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            {{ formError }}
          </div>

          <UFormField label="Nombre del servicio">
            <UInput v-model="form.name" placeholder="Ej. Esmaltado en gel" required class="w-full" />
          </UFormField>

          <UFormField label="Descripción (opcional)">
            <UTextarea v-model="form.description" placeholder="Detalles de lo que incluye el servicio..." class="w-full" />
          </UFormField>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Tipo de precio">
              <select
                v-model="form.priceType"
                class="w-full h-9 px-3 rounded-lg border border-(--ui-border-muted) bg-(--ui-bg) text-(--ui-text) text-sm focus:outline-none"
              >
                <option value="fixed">Fijo</option>
                <option value="from">Desde</option>
                <option value="quote">A cotizar</option>
              </select>
            </UFormField>

            <UFormField v-if="form.priceType !== 'quote'" label="Precio ($ USD)">
              <UInput
                v-model.number="form.priceDollars"
                type="number"
                step="0.25"
                min="0"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Duración (minutos)">
              <UInput
                v-model.number="form.durationMinutes"
                type="number"
                step="15"
                min="15"
                required
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
          </div>

          <div class="flex items-center gap-2 pt-2">
            <input
              id="activeCheckbox"
              v-model="form.active"
              type="checkbox"
              class="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
            />
            <label for="activeCheckbox" class="text-sm font-medium">Servicio activo (visible al público)</label>
          </div>
        </form>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="isModalOpen = false">
            Cancelar
          </UButton>
          <UButton color="primary" variant="solid" :loading="saving" @click="saveService">
            {{ isEditing ? 'Guardar cambios' : 'Crear servicio' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal Confirmar Eliminación -->
    <UModal v-model:open="isDeleteOpen" title="Confirmar eliminación">
      <template #body>
        <div class="space-y-3">
          <p class="text-sm text-muted">
            ¿Estás segura de que deseas eliminar el servicio <strong>{{ serviceToDelete?.name }}</strong>?
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
