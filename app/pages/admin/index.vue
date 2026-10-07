<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { data: bookings } = await useFetch('/api/admin/bookings')
const { data: services } = await useFetch('/api/admin/services')
const { data: gallery } = await useFetch('/api/admin/gallery')
const { data: zones } = await useFetch('/api/admin/zones')
const { data: settings } = await useFetch('/api/settings')

const pendingCount = computed(() => {
  return bookings.value?.filter((b: any) => b.status === 'pending').length || 0
})
const todayDate = computed(() => new Date().toISOString().split('T')[0])
const todayCount = computed(() => {
  return bookings.value?.filter((b: any) => b.date === todayDate.value && b.status === 'confirmed').length || 0
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-(--ui-text-highlighted)">¡Hola, Mel!</h1>
      <p class="text-sm text-muted mt-1">
        Bienvenida al panel de administración de Esencia Nails. Aquí puedes gestionar tus solicitudes y contenido.
      </p>
    </div>

    <!-- Tarjetas de resumen rápido -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="p-5 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) flex flex-col justify-between">
        <div>
          <span class="text-xs text-muted block mb-1">Solicitudes pendientes</span>
          <span class="text-3xl font-extrabold text-amber-500">
            {{ pendingCount }}
          </span>
        </div>
        <NuxtLink to="/admin/solicitudes" class="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-4 hover:underline">
          Ver solicitudes →
        </NuxtLink>
      </div>

      <div class="p-5 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) flex flex-col justify-between">
        <div>
          <span class="text-xs text-muted block mb-1">Citas confirmadas hoy</span>
          <span class="text-3xl font-extrabold text-violet-600 dark:text-violet-400">
            {{ todayCount }}
          </span>
        </div>
        <NuxtLink to="/admin/solicitudes" class="text-xs font-semibold text-violet-600 dark:text-violet-400 mt-4 hover:underline">
          Agenda de hoy →
        </NuxtLink>
      </div>
      <div class="p-5 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) flex flex-col justify-between">
        <div>
          <span class="text-xs text-muted block mb-1">Servicios</span>
          <span class="text-2xl font-bold text-violet-600 dark:text-violet-400">
            {{ services?.length || 0 }}
          </span>
        </div>
        <NuxtLink to="/admin/servicios" class="text-xs font-medium text-violet-600 dark:text-violet-400 mt-4 hover:underline">
          Administrar servicios →
        </NuxtLink>
      </div>

      <div class="p-5 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) flex flex-col justify-between">
        <div>
          <span class="text-xs text-muted block mb-1">Fotos en Galería</span>
          <span class="text-2xl font-bold text-violet-600 dark:text-violet-400">
            {{ gallery?.items?.length || 0 }}
          </span>
        </div>
        <NuxtLink to="/admin/galeria" class="text-xs font-medium text-violet-600 dark:text-violet-400 mt-4 hover:underline">
          Gestionar fotos →
        </NuxtLink>
      </div>

      <div class="p-5 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) flex flex-col justify-between">
        <div>
          <span class="text-xs text-muted block mb-1">Zonas de cobertura</span>
          <span class="text-2xl font-bold text-violet-600 dark:text-violet-400">
            {{ zones?.length || 0 }}
          </span>
        </div>
        <NuxtLink to="/admin/zonas" class="text-xs font-medium text-violet-600 dark:text-violet-400 mt-4 hover:underline">
          Gestionar zonas →
        </NuxtLink>
      </div>

      <div class="p-5 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) flex flex-col justify-between">
        <div>
          <span class="text-xs text-muted block mb-1">WhatsApp configurado</span>
          <span class="text-sm font-semibold text-(--ui-text-highlighted) truncate block">
            {{ settings?.whatsapp || 'No configurado' }}
          </span>
        </div>
        <NuxtLink to="/admin/textos" class="text-xs font-medium text-violet-600 dark:text-violet-400 mt-4 hover:underline">
          Editar textos y contacto →
        </NuxtLink>
      </div>
    </div>

    <!-- Accesos rápidos -->
    <div class="p-6 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted)">
      <h2 class="text-base font-semibold text-(--ui-text-highlighted) mb-4">Acciones frecuentes</h2>
      <div class="flex flex-wrap gap-3">
        <UButton to="/admin/galeria" color="primary" variant="solid" size="sm">
          <UIcon name="i-material-symbols-upload-rounded" class="w-4 h-4 mr-1" />
          Subir foto a galería
        </UButton>
        <UButton to="/admin/servicios" color="neutral" variant="subtle" size="sm">
          <UIcon name="i-material-symbols-add-rounded" class="w-4 h-4 mr-1" />
          Nuevo servicio
        </UButton>
        <UButton to="/admin/textos" color="neutral" variant="subtle" size="sm">
          <UIcon name="i-material-symbols-edit-note-rounded" class="w-4 h-4 mr-1" />
          Actualizar datos de inicio
        </UButton>
      </div>
    </div>
  </div>
</template>
