<script setup lang="ts">
defineProps<{
  instagramUrl?: string | null
  whatsapp?: string | null
}>()
</script>

<template>
  <footer class="border-t border-(--ui-border-muted) bg-(--ui-bg-muted) py-12 px-4">
    <div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
      <div>
        <h3 class="font-semibold text-lg text-(--ui-text-highlighted)">Esencia Nails by Mel</h3>
        <p class="text-sm text-muted mt-1">Servicio a domicilio en Santa Tecla y alrededores.</p>
        <p class="text-xs text-muted mt-0.5">Uñas de gel, acrílicas y diseños personalizados.</p>
      </div>

      <div class="flex flex-col sm:flex-row items-center gap-4 text-sm">
        <a
          v-if="instagramUrl"
          :href="instagramUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1.5 text-muted hover:text-primary transition-colors"
        >
          <UIcon name="i-material-symbols-arrow-outward-rounded" class="w-4 h-4" />
          Instagram
        </a>

        <a
          v-if="whatsapp"
          :href="`https://wa.me/503${whatsapp.replace(/\D/g, '')}`"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1.5 text-muted hover:text-primary transition-colors"
        >
          <UIcon name="i-material-symbols-arrow-outward-rounded" class="w-4 h-4" />
          WhatsApp: {{ whatsapp }}
        </a>

        <NuxtLink
          to="/admin"
          class="text-xs text-muted hover:text-(--ui-text-highlighted) transition-colors border-l sm:pl-4 border-(--ui-border-muted)"
        >
          Panel de administración
        </NuxtLink>
      </div>
    </div>

    <div class="max-w-6xl mx-auto mt-8 pt-6 border-t border-(--ui-border-muted) flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-muted">
      <p>© {{ new Date().getFullYear() }} Esencia Nails. Todos los derechos reservados.</p>
      <p>Santa Tecla, El Salvador</p>
    </div>
  </footer>
</template>
