<script setup lang="ts">
import { authClient } from '~/utils/auth-client'

const colorMode = useColorMode()
const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (val: boolean) => {
    colorMode.preference = val ? 'dark' : 'light'
  },
})

const route = useRoute()
const mobileMenuOpen = ref(false)

const navItems = [
  { label: 'Resumen', to: '/admin', icon: 'i-material-symbols-dashboard-outline-rounded' },
  { label: 'Solicitudes', to: '/admin/solicitudes', icon: 'i-material-symbols-calendar-month-outline' },
  { label: 'Horarios', to: '/admin/horarios', icon: 'i-material-symbols-schedule-outline' },
  { label: 'Servicios', to: '/admin/servicios', icon: 'i-material-symbols-brush-outline-rounded' },
  { label: 'Zonas', to: '/admin/zonas', icon: 'i-material-symbols-home-pin-outline-rounded' },
  { label: 'Categorías', to: '/admin/categorias', icon: 'i-material-symbols-category-outline-rounded' },
  { label: 'Galería', to: '/admin/galeria', icon: 'i-material-symbols-photo-library-outline-rounded' },
  { label: 'Plantillas WA', to: '/admin/plantillas', icon: 'i-material-symbols-chat-outline-rounded' },
  { label: 'Textos de inicio', to: '/admin/textos', icon: 'i-material-symbols-edit-note-rounded' },
  { label: 'Ajustes', to: '/admin/ajustes', icon: 'i-material-symbols-settings-outline-rounded' },
]

async function logout() {
  await authClient.signOut()
  await navigateTo('/admin/login')
}
</script>

<template>
  <div class="min-h-screen flex flex-col md:flex-row bg-(--ui-bg) text-(--ui-text)">
    <!-- Barra lateral para desktop -->
    <aside class="hidden md:flex flex-col w-64 border-r border-(--ui-border-muted) bg-(--ui-bg-muted) p-4 shrink-0">
      <div class="flex items-center gap-3 px-2 py-4 mb-4">
        <div class="w-8 h-8 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
          E
        </div>
        <div>
          <span class="font-bold text-sm block text-(--ui-text-highlighted)">Esencia Nails</span>
          <span class="text-xs text-muted block">Panel de control</span>
        </div>
      </div>

      <nav class="flex-1 space-y-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
          :class="[
            route.path === item.to
              ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 font-semibold'
              : 'text-muted hover:text-(--ui-text-highlighted) hover:bg-(--ui-bg)'
          ]"
        >
          <UIcon :name="item.icon" class="w-5 h-5 shrink-0" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="pt-4 border-t border-(--ui-border-muted) space-y-2">
        <NuxtLink
          to="/"
          target="_blank"
          class="flex items-center justify-between px-3 py-2 text-xs text-muted hover:text-(--ui-text-highlighted) transition-colors"
        >
          <span>Ver sitio público</span>
          <UIcon name="i-material-symbols-arrow-outward-rounded" class="w-4 h-4" />
        </NuxtLink>

        <div class="flex items-center justify-between px-3 py-1">
          <span class="text-xs text-muted">Tema</span>
          <UButton
            :icon="isDark ? 'i-material-symbols-light-mode-outline-rounded' : 'i-material-symbols-dark-mode-outline-rounded'"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Alternar tema"
            @click="isDark = !isDark"
          />
        </div>

        <UButton
          color="error"
          variant="ghost"
          block
          size="sm"
          class="justify-start px-3"
          @click="logout"
        >
          <UIcon name="i-material-symbols-logout-rounded" class="w-4 h-4 mr-2" />
          Cerrar sesión
        </UButton>
      </div>
    </aside>

    <!-- Header superior para móvil -->
    <header class="md:hidden flex items-center justify-between p-4 border-b border-(--ui-border-muted) bg-(--ui-bg-muted)">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs">
          E
        </div>
        <span class="font-bold text-sm text-(--ui-text-highlighted)">Panel Esencia Nails</span>
      </div>

      <div class="flex items-center gap-1">
        <UButton
          :icon="isDark ? 'i-material-symbols-light-mode-outline-rounded' : 'i-material-symbols-dark-mode-outline-rounded'"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Alternar tema"
          @click="isDark = !isDark"
        />
        <UButton
          :icon="mobileMenuOpen ? 'i-material-symbols-close-rounded' : 'i-material-symbols-menu-rounded'"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Menú"
          @click="mobileMenuOpen = !mobileMenuOpen"
        />
      </div>
    </header>

    <!-- Menú desplegable para móvil -->
    <div v-if="mobileMenuOpen" class="md:hidden border-b border-(--ui-border-muted) p-4 bg-(--ui-bg-muted) space-y-2">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium"
        :class="[
          route.path === item.to
            ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 font-semibold'
            : 'text-muted hover:text-(--ui-text-highlighted)'
        ]"
        @click="mobileMenuOpen = false"
      >
        <UIcon :name="item.icon" class="w-5 h-5 shrink-0" />
        {{ item.label }}
      </NuxtLink>

      <div class="pt-3 border-t border-(--ui-border-muted) flex justify-between items-center">
        <NuxtLink to="/" target="_blank" class="text-xs text-muted">
          Ver sitio público
        </NuxtLink>
        <UButton color="error" variant="soft" size="xs" @click="logout">
          Cerrar sesión
        </UButton>
      </div>
    </div>

    <!-- Contenido principal -->
    <div class="flex-1 p-4 sm:p-8 max-w-5xl overflow-y-auto">
      <slot />
    </div>
  </div>
</template>
