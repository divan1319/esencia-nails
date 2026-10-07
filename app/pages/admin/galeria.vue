<script setup lang="ts">
import { optimizeImage, galleryFormData, type OptimizedImage } from '~/utils/optimize-image'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { data: galleryData, refresh, status } = await useFetch('/api/admin/gallery')

// Estado de subida de nueva foto
const isUploadModalOpen = ref(false)
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const optimizedResult = ref<OptimizedImage | null>(null)
const optimizing = ref(false)
const uploading = ref(false)
const uploadError = ref<string | null>(null)

const uploadForm = reactive({
  categoryId: '' as string,
  alt: '',
})

async function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
  uploadError.value = null
  optimizing.value = true

  try {
    optimizedResult.value = await optimizeImage(file)
  } catch (err: any) {
    uploadError.value = err.message || 'Error al procesar la imagen'
    optimizedResult.value = null
  } finally {
    optimizing.value = false
  }
}

function openUpload() {
  selectedFile.value = null
  previewUrl.value = null
  optimizedResult.value = null
  uploadError.value = null
  uploadForm.categoryId = ''
  uploadForm.alt = ''
  isUploadModalOpen.value = true
}

async function uploadPhoto() {
  if (!optimizedResult.value) {
    uploadError.value = 'Debes seleccionar y optimizar una imagen primero'
    return
  }

  uploading.value = true
  uploadError.value = null

  try {
    const formData = galleryFormData(optimizedResult.value, {
      alt: uploadForm.alt.trim() || undefined,
      categoryId: uploadForm.categoryId || undefined,
    })

    await $fetch('/api/admin/gallery', {
      method: 'POST',
      body: formData,
    })

    isUploadModalOpen.value = false
    await refresh()
  } catch (err: any) {
    uploadError.value = err.data?.statusMessage || err.message || 'Error al subir la imagen'
  } finally {
    uploading.value = false
  }
}

// Editar metadatos de foto existente
const isEditModalOpen = ref(false)
const currentEditItem = ref<any>(null)
const editSaving = ref(false)
const editError = ref<string | null>(null)

const editForm = reactive({
  categoryId: '' as string,
  alt: '',
  featured: false,
  sortOrder: 0,
})

function openEdit(item: any) {
  currentEditItem.value = item
  editForm.categoryId = item.categoryId || ''
  editForm.alt = item.alt || ''
  editForm.featured = item.featured
  editForm.sortOrder = item.sortOrder
  editError.value = null
  isEditModalOpen.value = true
}

async function savePhotoEdit() {
  if (!currentEditItem.value) return

  editSaving.value = true
  editError.value = null

  try {
    await $fetch(`/api/admin/gallery/${currentEditItem.value.id}`, {
      method: 'PATCH',
      body: {
        categoryId: editForm.categoryId || null,
        alt: editForm.alt.trim() || null,
        featured: editForm.featured,
        sortOrder: editForm.sortOrder,
      },
    })

    isEditModalOpen.value = false
    await refresh()
  } catch (err: any) {
    editError.value = err.data?.statusMessage || err.message || 'Error al actualizar'
  } finally {
    editSaving.value = false
  }
}

// Eliminación de foto
const isDeleteModalOpen = ref(false)
const photoToDelete = ref<any>(null)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

function confirmDelete(item: any) {
  photoToDelete.value = item
  deleteError.value = null
  isDeleteModalOpen.value = true
}

async function executeDelete() {
  if (!photoToDelete.value) return
  deleting.value = true
  deleteError.value = null

  try {
    await $fetch(`/api/admin/gallery/${photoToDelete.value.id}`, {
      method: 'DELETE',
    })
    isDeleteModalOpen.value = false
    await refresh()
  } catch (err: any) {
    deleteError.value = err.data?.statusMessage || err.message || 'Error al eliminar'
  } finally {
    deleting.value = false
  }
}

function getCategoryName(id: string | null) {
  if (!id || !galleryData.value?.categories) return null
  return galleryData.value.categories.find((c: any) => c.id === id)?.name
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-(--ui-text-highlighted)">Galería de fotos</h1>
        <p class="text-sm text-muted mt-1">
          Sube tus fotos con optimización automática a WebP (600 px y 1600 px).
        </p>
      </div>

      <UButton color="primary" variant="solid" @click="openUpload">
        <UIcon name="i-material-symbols-upload-rounded" class="w-4 h-4 mr-1" />
        Subir nueva foto
      </UButton>
    </div>

    <!-- Cuadrícula de fotos existentes -->
    <div v-if="galleryData?.items?.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      <div
        v-for="item in galleryData.items"
        :key="item.id"
        class="group relative rounded-2xl overflow-hidden border border-(--ui-border-muted) bg-(--ui-bg-muted) flex flex-col"
      >
        <div class="relative aspect-square overflow-hidden bg-black/5">
          <img
            :src="item.thumbUrl"
            :alt="item.alt || 'Foto de galería'"
            class="w-full h-full object-cover"
          />

          <!-- Badges sobre la foto -->
          <div class="absolute top-2 left-2 flex flex-col gap-1 items-start">
            <UBadge v-if="item.featured" color="primary" variant="solid" size="xs">
              Destacada
            </UBadge>
            <UBadge v-if="getCategoryName(item.categoryId)" color="neutral" variant="solid" size="xs">
              {{ getCategoryName(item.categoryId) }}
            </UBadge>
          </div>

          <!-- Botones de acción flotantes -->
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <UButton
              size="sm"
              color="neutral"
              variant="solid"
              aria-label="Editar foto"
              @click="openEdit(item)"
            >
              <UIcon name="i-material-symbols-edit-outline-rounded" class="w-4 h-4" />
            </UButton>
            <UButton
              size="sm"
              color="error"
              variant="solid"
              aria-label="Eliminar foto"
              @click="confirmDelete(item)"
            >
              <UIcon name="i-material-symbols-delete-outline-rounded" class="w-4 h-4" />
            </UButton>
          </div>
        </div>

        <div class="p-2.5 text-xs text-muted flex justify-between items-center bg-(--ui-bg)">
          <span class="truncate">{{ item.alt || 'Sin descripción' }}</span>
          <span class="shrink-0 font-medium">#{{ item.sortOrder }}</span>
        </div>
      </div>
    </div>
    <div v-else-if="status === 'pending'" class="text-center py-12 text-muted">
      Cargando galería...
    </div>
    <div v-else class="text-center py-16 text-muted p-8 border border-dashed border-(--ui-border-muted) rounded-2xl">
      <UIcon name="i-material-symbols-photo-library-outline-rounded" class="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p class="font-medium text-base text-(--ui-text-highlighted)">Aún no has subido fotos</p>
      <p class="text-xs text-muted mt-1 max-w-sm mx-auto">
        Sube fotos de tus mejores trabajos para que tus clientas las vean en la página de inicio.
      </p>
      <UButton color="primary" variant="solid" size="sm" class="mt-4" @click="openUpload">
        Subir primera foto
      </UButton>
    </div>

    <!-- Modal Subir Foto -->
    <UModal v-model:open="isUploadModalOpen" title="Subir foto a la galería">
      <template #body>
        <div class="space-y-4">
          <div v-if="uploadError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            {{ uploadError }}
          </div>

          <!-- Selector de archivo -->
          <div>
            <label class="block text-sm font-medium mb-1.5">Seleccionar imagen</label>
            <input
              type="file"
              accept="image/*"
              class="block w-full text-xs text-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-violet-500/10 file:text-violet-600 dark:file:text-violet-400 hover:file:bg-violet-500/20 cursor-pointer"
              @change="onFileSelected"
            />
            <p class="text-[11px] text-muted mt-1">Formatos: JPG, PNG, WEBP (hasta 15 MB). Se optimizará en tu navegador.</p>
          </div>

          <!-- Estado de optimización -->
          <div v-if="optimizing" class="flex items-center gap-2 p-3 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs">
            <UIcon name="i-material-symbols-progress-activity" class="w-4 h-4 animate-spin" />
            <span>Optimizando y redimensionando a 600 px y 1600 px en tu navegador...</span>
          </div>

          <!-- Vista previa de la foto seleccionada -->
          <div v-if="previewUrl && optimizedResult" class="flex items-center gap-3 p-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg)">
            <img :src="previewUrl" alt="Vista previa" class="w-16 h-16 rounded-lg object-cover" />
            <div class="text-xs text-muted">
              <span class="text-emerald-600 dark:text-emerald-400 font-semibold block flex items-center gap-1">
                <UIcon name="i-material-symbols-check-circle-outline-rounded" class="w-4 h-4" />
                Lista para subir
              </span>
              <span>Miniatura: {{ Math.round(optimizedResult.thumb.size / 1024) }} KB</span> ·
              <span>Completa: {{ Math.round(optimizedResult.full.size / 1024) }} KB</span>
            </div>
          </div>

          <!-- Categoría -->
          <UFormField label="Categoría de diseño">
            <select
              v-model="uploadForm.categoryId"
              class="w-full h-9 px-3 rounded-lg border border-(--ui-border-muted) bg-(--ui-bg) text-(--ui-text) text-sm focus:outline-none"
            >
              <option value="">Sin categoría</option>
              <option v-for="cat in galleryData?.categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </UFormField>

          <!-- Texto descriptivo (alt) -->
          <UFormField label="Descripción o estilo (alt)">
            <UInput
              v-model="uploadForm.alt"
              placeholder="Ej. Uñas aurora con detalles en dorado"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="isUploadModalOpen = false">
            Cancelar
          </UButton>
          <UButton
            color="primary"
            variant="solid"
            :loading="uploading"
            :disabled="!optimizedResult || optimizing"
            @click="uploadPhoto"
          >
            Subir foto
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal Editar Metadatos -->
    <UModal v-model:open="isEditModalOpen" title="Editar foto">
      <template #body>
        <form @submit.prevent="savePhotoEdit" class="space-y-4">
          <div v-if="editError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            {{ editError }}
          </div>

          <div v-if="currentEditItem" class="flex justify-center mb-2">
            <img :src="currentEditItem.thumbUrl" alt="Miniatura" class="w-24 h-24 rounded-xl object-cover" />
          </div>

          <UFormField label="Categoría de diseño">
            <select
              v-model="editForm.categoryId"
              class="w-full h-9 px-3 rounded-lg border border-(--ui-border-muted) bg-(--ui-bg) text-(--ui-text) text-sm focus:outline-none"
            >
              <option value="">Sin categoría</option>
              <option v-for="cat in galleryData?.categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </UFormField>

          <UFormField label="Descripción / Alt">
            <UInput v-model="editForm.alt" placeholder="Ej. Uñas aurora" class="w-full" />
          </UFormField>

          <UFormField label="Orden de aparición">
            <UInput v-model.number="editForm.sortOrder" type="number" class="w-full" />
          </UFormField>

          <div class="flex items-center gap-2 pt-2">
            <input
              id="featuredCheckbox"
              v-model="editForm.featured"
              type="checkbox"
              class="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
            />
            <label for="featuredCheckbox" class="text-sm font-medium">Foto destacada</label>
          </div>
        </form>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="isEditModalOpen = false">
            Cancelar
          </UButton>
          <UButton color="primary" variant="solid" :loading="editSaving" @click="savePhotoEdit">
            Guardar cambios
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal Confirmar Eliminación -->
    <UModal v-model:open="isDeleteModalOpen" title="Confirmar eliminación">
      <template #body>
        <div class="space-y-3">
          <p class="text-sm text-muted">
            ¿Estás segura de que deseas eliminar esta foto? Se borrará de la base de datos y del almacenamiento permanente (S3).
          </p>
          <div v-if="deleteError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            {{ deleteError }}
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="isDeleteModalOpen = false">
            Cancelar
          </UButton>
          <UButton color="error" variant="solid" :loading="deleting" @click="executeDelete">
            Eliminar foto
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
