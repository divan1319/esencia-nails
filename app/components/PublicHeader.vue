<script setup lang="ts">
const colorMode = useColorMode()
const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (val: boolean) => {
    colorMode.preference = val ? 'dark' : 'light'
  },
})

const mobileMenuOpen = ref(false)

const navLinks = [
  { label: 'Servicios', href: '#servicios' },
  { label: 'Galería', href: '#galeria' },
  { label: 'Horario y Cobertura', href: '#horarios' },
  { label: 'Cuidados y FAQ', href: '#faq' },
]

const lookupModalOpen = ref(false)
const lookupCode = ref('')

function executeLookup() {
  if (lookupCode.value.trim()) {
    const c = lookupCode.value.trim().toUpperCase()
    lookupModalOpen.value = false
    lookupCode.value = ''
    mobileMenuOpen.value = false
    navigateTo(`/reserva/${c}`)
  }
}
</script>

<template>
  <header class="sticky top-0 z-40 w-full backdrop-blur border-b border-(--ui-border-muted) bg-(--ui-bg)/80">
    <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
      <!-- Logo / Marca -->
      <NuxtLink to="/" class="flex items-center gap-2 text-decoration-none">
        <div class="w-9 h-9 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-lg">
          E
        </div>
        <div>
          <span class="font-semibold text-base leading-tight block text-(--ui-text-highlighted)">Esencia Nails</span>
          <span class="text-xs text-muted block">Santa Tecla · A domicilio</span>
        </div>
      </NuxtLink>

      <!-- Navegación desktop -->
      <nav class="hidden md:flex items-center gap-6">
        <a
          v-for="item in navLinks"
          :key="item.href"
          :href="item.href"
          class="text-sm text-muted hover:text-(--ui-text-highlighted) transition-colors"
        >
          {{ item.label }}
        </a>
      </nav>

      <!-- Acciones desktop -->
      <div class="flex items-center gap-2">
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          class="hidden sm:inline-flex text-xs"
          @click="lookupModalOpen = true"
        >
          <UIcon name="i-material-symbols-search-rounded" class="w-4 h-4 mr-1" />
          Consultar cita
        </UButton>

        <UButton
          :icon="isDark ? 'i-material-symbols-light-mode-outline-rounded' : 'i-material-symbols-dark-mode-outline-rounded'"
          color="neutral"
          variant="ghost"
          aria-label="Alternar tema claro/oscuro"
          @click="isDark = !isDark"
        />

        <UButton
          to="/reservar"
          color="primary"
          variant="solid"
          class="hidden sm:inline-flex"
        >
          Reservar cita
        </UButton>

        <!-- Botón menú móvil -->
        <UButton
          class="md:hidden"
          :icon="mobileMenuOpen ? 'i-material-symbols-close-rounded' : 'i-material-symbols-menu-rounded'"
          color="neutral"
          variant="ghost"
          aria-label="Abrir menú"
          @click="mobileMenuOpen = !mobileMenuOpen"
        />
      </div>
    </div>

    <!-- Menú móvil desplegable -->
    <div v-if="mobileMenuOpen" class="md:hidden border-t border-(--ui-border-muted) px-4 py-4 space-y-3 bg-(--ui-bg)">
      <a
        v-for="item in navLinks"
        :key="item.href"
        :href="item.href"
        class="block text-sm font-medium py-1.5 text-muted hover:text-(--ui-text-highlighted)"
        @click="mobileMenuOpen = false"
      >
        {{ item.label }}
      </a>
      <button
        type="button"
        class="w-full text-left text-sm font-medium py-1.5 text-muted hover:text-(--ui-text-highlighted) flex items-center gap-2"
        @click="mobileMenuOpen = false; lookupModalOpen = true"
      >
        <UIcon name="i-material-symbols-search-rounded" class="w-4 h-4" />
        Consultar mi cita
      </button>
      <div class="pt-2">
        <UButton
          to="/reservar"
          color="primary"
          variant="solid"
          block
          @click="mobileMenuOpen = false"
        >
          Reservar cita
        </UButton>
      </div>
    </div>

    <!-- Modal de consulta de cita -->
    <UModal v-model:open="lookupModalOpen" title="Consultar estado de tu cita">
      <template #body>
        <div class="space-y-4">
          <p class="text-xs text-muted leading-relaxed">
            Ingresa el código alfanumérico de tu reserva (ej. <span class="font-mono text-violet-600 dark:text-violet-400">MEL123</span>) para consultar su estado en tiempo real.
          </p>
          <UFormField label="Código de reserva">
            <UInput
              v-model="lookupCode"
              placeholder="Ej. MEL123"
              class="font-mono uppercase text-base"
              autofocus
              @keydown.enter="executeLookup"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="lookupModalOpen = false">
            Cancelar
          </UButton>
          <UButton
            color="primary"
            variant="solid"
            :disabled="!lookupCode.trim()"
            @click="executeLookup"
          >
            Buscar cita
          </UButton>
        </div>
      </template>
    </UModal>
  </header>
</template>
