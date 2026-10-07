<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { data: categories, refresh, status } = await useFetch('/api/admin/gallery-categories')

const isModalOpen = ref(false)
const isEditing = ref(false)
const currentId = ref<string | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)

const form = reactive({
  name: '',
  slug: '',
  sortOrder: 0,
})

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function onNameInput() {
  if (!isEditing.value) {
    form.slug = slugify(form.name)
  }
}

function openCreate() {
  isEditing.value = false
  currentId.value = null
  form.name = ''
  form.slug = ''
  form.sortOrder = (categories.value?.length || 0) * 10
  formError.value = null
  isModalOpen.value = true
}

function openEdit(item: any) {
  isEditing.value = true
  currentId.value = item.id
  form.name = item.name
  form.slug = item.slug
  form.sortOrder = item.sortOrder
  formError.value = null
  isModalOpen.value = true
}

async function saveCategory() {
  if (!form.name.trim() || !form.slug.trim()) {
    formError.value = 'El nombre y el slug son requeridos'
    return
  }

  saving.value = true
  formError.value = null

  try {
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      sortOrder: form.sortOrder,
    }

    if (isEditing.value && currentId.value) {
      await $fetch(`/api/admin/gallery-categories/${currentId.value}`, {
        method: 'PATCH',
        body: payload,
      })
    } else {
      await $fetch('/api/admin/gallery-categories', {
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
const categoryToDelete = ref<any>(null)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

function confirmDelete(item: any) {
  categoryToDelete.value = item
  deleteError.value = null
  isDeleteOpen.value = true
}

async function executeDelete() {
  if (!categoryToDelete.value) return
  deleting.value = true
  deleteError.value = null

  try {
    await $fetch(`/api/admin/gallery-categories/${categoryToDelete.value.id}`, {
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
        <h1 class="text-2xl font-bold text-(--ui-text-highlighted)">Categorías de galería</h1>
        <p class="text-sm text-muted mt-1">Organiza tus fotos por estilo o técnica (ej. Aurora, Puntos, Moños).</p>
      </div>

      <UButton color="primary" variant="solid" @click="openCreate">
        <UIcon name="i-material-symbols-add-rounded" class="w-4 h-4 mr-1" />
        Nueva categoría
      </UButton>
    </div>

    <div v-if="categories?.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="p-4 sm:p-5 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) flex items-center justify-between gap-4"
      >
        <div>
          <h3 class="font-semibold text-base text-(--ui-text-highlighted)">{{ cat.name }}</h3>
          <p class="text-xs text-muted mt-0.5">
            Slug: <code class="px-1.5 py-0.5 rounded bg-(--ui-bg) text-violet-600 dark:text-violet-400">{{ cat.slug }}</code>
            <span class="ml-2">· Orden: {{ cat.sortOrder }}</span>
          </p>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            @click="openEdit(cat)"
          >
            <UIcon name="i-material-symbols-edit-outline-rounded" class="w-4 h-4" />
          </UButton>
          <UButton
            size="sm"
            color="error"
            variant="ghost"
            @click="confirmDelete(cat)"
          >
            <UIcon name="i-material-symbols-delete-outline-rounded" class="w-4 h-4" />
          </UButton>
        </div>
      </div>
    </div>
    <div v-else-if="status === 'pending'" class="text-center py-12 text-muted">
      Cargando categorías...
    </div>
    <div v-else class="text-center py-12 text-muted p-8 border border-dashed border-(--ui-border-muted) rounded-2xl">
      No hay categorías registradas. Crea una con el botón superior.
    </div>

    <!-- Modal Crear / Editar -->
    <UModal v-model:open="isModalOpen" :title="isEditing ? 'Editar categoría' : 'Nueva categoría'">
      <template #body>
        <form @submit.prevent="saveCategory" class="space-y-4">
          <div v-if="formError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            {{ formError }}
          </div>

          <UFormField label="Nombre de la categoría">
            <UInput
              v-model="form.name"
              placeholder="Ej. Aurora"
              required
              class="w-full"
              @input="onNameInput"
            />
          </UFormField>

          <UFormField label="Slug identificador (enlace)">
            <UInput
              v-model="form.slug"
              placeholder="ej. aurora"
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
        </form>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="isModalOpen = false">
            Cancelar
          </UButton>
          <UButton color="primary" variant="solid" :loading="saving" @click="saveCategory">
            {{ isEditing ? 'Guardar cambios' : 'Crear categoría' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal Confirmar Eliminación -->
    <UModal v-model:open="isDeleteOpen" title="Confirmar eliminación">
      <template #body>
        <div class="space-y-3">
          <p class="text-sm text-muted">
            ¿Estás segura de que deseas eliminar la categoría <strong>{{ categoryToDelete?.name }}</strong>?
            (Las fotos que tengan esta categoría asignada quedarán sin categoría).
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
