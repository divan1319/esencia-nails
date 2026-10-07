<script setup lang="ts">
// Obtener datos del servidor
const { data: settings } = await useFetch('/api/settings')
const { data: services } = await useFetch('/api/services')
const { data: zones } = await useFetch('/api/zones')
const { data: gallery } = await useFetch('/api/gallery')

// SEO y Datos Estructurados Schema.org para Santa Tecla
useHead({
  title: 'Esencia Nails by Mel | Uñas a domicilio en Santa Tecla',
  meta: [
    {
      name: 'description',
      content:
        'Uñas con diseño y servicio a domicilio en Santa Tecla, El Salvador. Esmaltado en gel, uñas acrílicas y diseños personalizados. Agenda tu cita en línea.',
    },
    { property: 'og:title', content: 'Esencia Nails by Mel | Uñas a domicilio en Santa Tecla' },
    {
      property: 'og:description',
      content:
        'Uñas con diseño y servicio a domicilio en Santa Tecla, El Salvador. Esmaltado en gel, uñas acrílicas y diseños personalizados. Agenda tu cita en línea.',
    },
    { property: 'og:image', content: '/og-image.png' },
    { property: 'og:locale', content: 'es_SV' },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BeautySalon',
          name: 'Esencia Nails by Mel',
          image: '/og-image.png',
          description:
            'Servicio profesional de uñas a domicilio en Santa Tecla, El Salvador. Esmaltado en gel, uñas acrílicas y diseños personalizados.',
          telephone: settings.value?.whatsapp
            ? `+503${settings.value.whatsapp.replace(/\D/g, '')}`
            : '+50379581732',
          priceRange: '$$',
          currenciesAccepted: 'USD',
          paymentAccepted: 'Efectivo, Transferencia bancaria',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Santa Tecla',
            addressRegion: 'La Libertad',
            addressCountry: 'SV',
          },
          areaServed: [
            { '@type': 'City', name: 'Santa Tecla' },
            { '@type': 'City', name: 'Antiguo Cuscatlán' },
            { '@type': 'City', name: 'San Salvador' },
          ],
          sameAs: settings.value?.instagramUrl ? [settings.value.instagramUrl] : [],
        })
      ),
    },
  ],
})

// Galería filtrada y modal de foto ampliada
const selectedCategoryId = ref<string | null>(null)
const selectedPhoto = ref<{ fullUrl: string; alt?: string | null; thumbUrl: string } | null>(null)
const isLightboxOpen = ref(false)

function openLightbox(item: { fullUrl: string; alt?: string | null; thumbUrl: string }) {
  selectedPhoto.value = item
  isLightboxOpen.value = true
}

const filteredPhotos = computed(() => {
  if (!gallery.value?.items) return []
  if (!selectedCategoryId.value) return gallery.value.items
  return gallery.value.items.filter((item) => item.categoryId === selectedCategoryId.value)
})

// Formateadores
function formatPrice(type: string, cents: number | null) {
  if (type === 'quote' || cents == null) return 'A cotizar'
  const dollars = (cents / 100).toFixed(2)
  if (type === 'from') return `Desde $${dollars}`
  return `$${dollars}`
}

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

const whatsappClean = computed(() => settings.value?.whatsapp?.replace(/\D/g, '') || '79581732')
const whatsappHref = computed(
  () =>
    `https://wa.me/503${whatsappClean.value}?text=${encodeURIComponent(
      '¡Hola Mel! Me gustaría consultar sobre tus servicios de uñas a domicilio.'
    )}`
)

const faqs = [
  {
    q: '¿Cómo funciona el servicio a domicilio?',
    a: 'Llego directamente a tu casa o lugar indicado en Santa Tecla y zonas de cobertura con todos los materiales esterilizados y equipo necesario para tu manicure.',
  },
  {
    q: '¿Cómo cotizo un diseño personalizado?',
    a: 'Puedes solicitar tu cita aquí seleccionando "Diseño personalizado" y luego enviarme tus fotos de referencia por WhatsApp para cotizar el precio y duración exacta.',
  },
  {
    q: '¿Cuáles son las formas de pago?',
    a: 'Puedes pagar en efectivo el día de tu cita o por transferencia bancaria.',
  },
  {
    q: '¿Qué cuidados debo tener después de mi cita?',
    a: 'Evita usar tus uñas como herramientas para abrir objetos, usa guantes para tareas con químicos fuertes e hidrata tus cutículas diariamente con aceite.',
  },
]
</script>

<template>
  <div class="min-h-screen flex flex-col bg-(--ui-bg) text-(--ui-text)">
    <PublicHeader />

    <main class="flex-1">
      <!-- 1. HERO SECTION -->
      <section class="relative py-16 sm:py-24 px-4 overflow-hidden border-b border-(--ui-border-muted)">
        <!-- Fondo decorativo suave -->
        <div class="absolute inset-0 bg-gradient-to-b from-violet-500/10 via-transparent to-transparent pointer-events-none" />

        <div class="max-w-4xl mx-auto text-center relative z-10">
          <UBadge
            color="primary"
            variant="subtle"
            class="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
          >
            <UIcon name="i-material-symbols-location-on-outline" class="w-4 h-4 text-violet-500" />
            {{ settings?.tagline || 'Santa Tecla · Servicio a domicilio' }}
          </UBadge>

          <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-(--ui-text-highlighted) mb-6">
            {{ settings?.businessName || 'Esencia Nails by Mel' }}
          </h1>

          <p class="text-base sm:text-xl text-muted max-w-2xl mx-auto mb-8 leading-relaxed">
            {{ settings?.heroText || 'Uñas con diseño, estilo y cuidado profesional directo en la comodidad de tu hogar.' }}
          </p>

          <div class="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <UButton
              to="/reservar"
              size="lg"
              color="primary"
              variant="solid"
              block
              class="shadow-sm font-semibold"
            >
              <UIcon name="i-material-symbols-calendar-month-outline" class="w-5 h-5 mr-1" />
              Reservar cita
            </UButton>

            <UButton
              :href="whatsappHref"
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              color="neutral"
              variant="subtle"
              block
              class="font-semibold"
            >
              <UIcon name="i-material-symbols-chat-outline-rounded" class="w-5 h-5 mr-1 text-emerald-600 dark:text-emerald-400" />
              WhatsApp
            </UButton>
          </div>
        </div>
      </section>

      <!-- 2. SERVICIOS -->
      <section id="servicios" class="py-16 px-4 max-w-6xl mx-auto">
        <div class="text-center max-w-2xl mx-auto mb-12">
          <h2 class="text-2xl sm:text-3xl font-bold text-(--ui-text-highlighted)">Servicios disponibles</h2>
          <p class="text-muted mt-2 text-sm sm:text-base">
            Elige el servicio ideal para ti. Todos incluyen preparación completa de uñas y cutículas.
          </p>
        </div>

        <div v-if="services?.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="service in services"
            :key="service.id"
            class="flex flex-col justify-between p-6 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) hover:border-violet-500/40 transition-colors shadow-xs"
          >
            <div>
              <div class="flex justify-between items-start gap-2 mb-2">
                <h3 class="font-semibold text-lg text-(--ui-text-highlighted)">{{ service.name }}</h3>
                <UBadge color="primary" variant="soft" class="shrink-0 text-xs">
                  {{ formatDuration(service.durationMinutes) }}
                </UBadge>
              </div>

              <p v-if="service.description" class="text-sm text-muted mb-4 leading-relaxed">
                {{ service.description }}
              </p>
            </div>

            <div class="pt-4 border-t border-(--ui-border-muted) flex items-center justify-between mt-auto">
              <div>
                <span class="text-xs text-muted block">Precio</span>
                <span class="text-lg font-bold text-violet-600 dark:text-violet-400">
                  {{ formatPrice(service.priceType, service.priceCents) }}
                </span>
              </div>

              <UButton
                to="/reservar"
                size="sm"
                color="primary"
                variant="soft"
              >
                Elegir
              </UButton>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-8 text-muted">
          No hay servicios disponibles en este momento.
        </div>
      </section>

      <!-- 3. GALERÍA -->
      <section id="galeria" class="py-16 px-4 bg-(--ui-bg-muted)/50 border-y border-(--ui-border-muted)">
        <div class="max-w-6xl mx-auto">
          <div class="text-center max-w-2xl mx-auto mb-8">
            <h2 class="text-2xl sm:text-3xl font-bold text-(--ui-text-highlighted)">Galería de trabajos</h2>
            <p class="text-muted mt-2 text-sm sm:text-base">
              Inspírate con algunos de los diseños realizados. Toca cualquier foto para ampliarla.
            </p>
          </div>

          <!-- Filtros de categoría -->
          <div v-if="gallery?.categories?.length" class="flex flex-wrap items-center justify-center gap-2 mb-8">
            <UButton
              size="sm"
              :color="selectedCategoryId === null ? 'primary' : 'neutral'"
              :variant="selectedCategoryId === null ? 'solid' : 'subtle'"
              @click="selectedCategoryId = null"
            >
              Todos
            </UButton>
            <UButton
              v-for="cat in gallery.categories"
              :key="cat.id"
              size="sm"
              :color="selectedCategoryId === cat.id ? 'primary' : 'neutral'"
              :variant="selectedCategoryId === cat.id ? 'solid' : 'subtle'"
              @click="selectedCategoryId = cat.id"
            >
              {{ cat.name }}
            </UButton>
          </div>

          <!-- Cuadrícula de fotos -->
          <div v-if="filteredPhotos.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div
              v-for="item in filteredPhotos"
              :key="item.id"
              class="group relative aspect-square rounded-xl overflow-hidden cursor-pointer bg-(--ui-bg-muted) border border-(--ui-border-muted)"
              @click="openLightbox(item)"
            >
              <img
                :src="item.thumbUrl"
                :alt="item.alt || 'Diseño de uñas por Esencia Nails'"
                loading="lazy"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <UIcon name="i-material-symbols-visibility-outline-rounded" class="w-6 h-6" />
              </div>
            </div>
          </div>
          <div v-else class="text-center py-12 text-muted">
            <UIcon name="i-material-symbols-image-outline" class="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Aún no hay fotos en esta categoría. ¡Vuelve pronto!</p>
          </div>
        </div>
      </section>

      <!-- 4. HORARIO, COBERTURA Y FORMAS DE PAGO -->
      <section id="horarios" class="py-16 px-4 max-w-6xl mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Horario -->
          <div class="p-6 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted)">
            <div class="w-10 h-10 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
              <UIcon name="i-material-symbols-schedule-outline" class="w-6 h-6" />
            </div>
            <h3 class="text-lg font-semibold text-(--ui-text-highlighted) mb-2">Horario de atención</h3>
            <p class="text-sm text-muted mb-3 leading-relaxed">
              <strong>Lunes a Viernes:</strong><br />4:30 pm a 8:30 pm (Citas automáticas)
            </p>
            <p class="text-sm text-muted leading-relaxed">
              <strong>Sábado y Domingo:</strong><br />Sujeto a disponibilidad previa solicitud.
            </p>
          </div>

          <!-- Cobertura -->
          <div class="p-6 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted)">
            <div class="w-10 h-10 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
              <UIcon name="i-material-symbols-home-pin-outline-rounded" class="w-6 h-6" />
            </div>
            <h3 class="text-lg font-semibold text-(--ui-text-highlighted) mb-2">Zonas de cobertura</h3>
            <p class="text-sm text-muted mb-3 leading-relaxed">
              Servicio a domicilio en Santa Tecla y alrededores.
            </p>
            <ul v-if="zones?.length" class="text-sm text-muted space-y-1">
              <li v-for="zone in zones" :key="zone.id" class="flex items-center gap-1.5">
                <UIcon name="i-material-symbols-check-rounded" class="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{{ zone.name }}</span>
                <span v-if="zone.travelFeeCents > 0" class="text-xs text-muted">
                  (+${{ (zone.travelFeeCents / 100).toFixed(2) }} traslado)
                </span>
              </li>
            </ul>
          </div>

          <!-- Formas de pago -->
          <div class="p-6 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted)">
            <div class="w-10 h-10 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
              <UIcon name="i-material-symbols-payments-outline-rounded" class="w-6 h-6" />
            </div>
            <h3 class="text-lg font-semibold text-(--ui-text-highlighted) mb-2">Formas de pago</h3>
            <p class="text-sm text-muted leading-relaxed mb-4">
              {{ settings?.paymentMethodsText || 'Efectivo o transferencia bancaria.' }}
            </p>
            <p class="text-xs text-muted">
              Pagas al finalizar tu cita. Si se requiere anticipo para tu diseño, te será informado antes de confirmar.
            </p>
          </div>
        </div>
      </section>

      <!-- 5. PREGUNTAS FRECUENTES -->
      <section id="faq" class="py-16 px-4 bg-(--ui-bg-muted)/30 border-t border-(--ui-border-muted)">
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-10">
            <h2 class="text-2xl sm:text-3xl font-bold text-(--ui-text-highlighted)">Preguntas frecuentes</h2>
            <p class="text-muted mt-2 text-sm">Todo lo que necesitas saber antes de agendar tu cita.</p>
          </div>

          <div class="space-y-4">
            <div
              v-for="(faq, i) in faqs"
              :key="i"
              class="p-5 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg)"
            >
              <h3 class="font-semibold text-base text-(--ui-text-highlighted) mb-2 flex items-center gap-2">
                <UIcon name="i-material-symbols-help-outline-rounded" class="w-5 h-5 text-violet-500 shrink-0" />
                {{ faq.q }}
              </h3>
              <p class="text-sm text-muted leading-relaxed pl-7">
                {{ faq.a }}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- MODAL LIGHTBOX DE FOTO -->
    <UModal v-model:open="isLightboxOpen" :close="{ onClick: () => isLightboxOpen = false }">
      <template #content>
        <div v-if="selectedPhoto" class="p-2 sm:p-4 flex flex-col items-center">
          <img
            :src="selectedPhoto.fullUrl"
            :alt="selectedPhoto.alt || 'Foto de uñas ampliada'"
            class="max-h-[80vh] w-auto rounded-lg object-contain"
          />
          <p v-if="selectedPhoto.alt" class="mt-3 text-sm text-muted text-center">
            {{ selectedPhoto.alt }}
          </p>
        </div>
      </template>
    </UModal>

    <PublicFooter :instagram-url="settings?.instagramUrl" :whatsapp="settings?.whatsapp" />
  </div>
</template>
