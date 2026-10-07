<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { data: settings, refresh, status } = await useFetch('/api/settings')

const saving = ref(false)
const successMessage = ref(false)
const errorMessage = ref<string | null>(null)

const form = reactive({
  businessName: '',
  tagline: '',
  heroText: '',
  whatsapp: '',
  instagramUrl: '',
  paymentMethodsText: '',
})

// Llenar formulario al cargar datos
watch(
  settings,
  (val) => {
    if (val) {
      form.businessName = val.businessName || ''
      form.tagline = val.tagline || ''
      form.heroText = val.heroText || ''
      form.whatsapp = val.whatsapp || ''
      form.instagramUrl = val.instagramUrl || ''
      form.paymentMethodsText = val.paymentMethodsText || ''
    }
  },
  { immediate: true }
)

async function saveSettings() {
  if (!form.businessName.trim()) {
    errorMessage.value = 'El nombre del negocio es obligatorio'
    return
  }

  saving.value = true
  errorMessage.value = null
  successMessage.value = false

  try {
    await $fetch('/api/admin/settings', {
      method: 'PATCH',
      body: {
        businessName: form.businessName.trim(),
        tagline: form.tagline.trim() || null,
        heroText: form.heroText.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        instagramUrl: form.instagramUrl.trim() || null,
        paymentMethodsText: form.paymentMethodsText.trim() || null,
      },
    })

    successMessage.value = true
    await refresh()
    setTimeout(() => {
      successMessage.value = false
    }, 4000)
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message || 'Error al guardar configuración'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6 w-full">
    <div>
      <h1 class="text-2xl font-bold text-(--ui-text-highlighted)">Textos del inicio y contacto</h1>
      <p class="text-sm text-muted mt-1">
        Personaliza los títulos, descripciones y números de contacto visibles en la página web pública.
      </p>
    </div>

    <div v-if="successMessage" class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
      <UIcon name="i-material-symbols-check-circle-outline-rounded" class="w-4 h-4 shrink-0" />
      <span>Los cambios fueron guardados exitosamente.</span>
    </div>

    <div v-if="errorMessage" class="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
      <UIcon name="i-material-symbols-error-outline-rounded" class="w-4 h-4 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <div v-if="status === 'pending'" class="text-center py-12 text-muted">
      Cargando configuración...
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <!-- Formulario principal -->
      <form @submit.prevent="saveSettings" class="lg:col-span-2 p-6 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Nombre comercial del negocio">
            <UInput
              v-model="form.businessName"
              placeholder="Esencia Nails by Mel"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Lema / Tagline (bajo el logo)">
            <UInput
              v-model="form.tagline"
              placeholder="Santa Tecla · Servicio a domicilio"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="Texto principal del Hero (Inicio)">
          <UTextarea
            v-model="form.heroText"
            placeholder="Uñas con diseño, a domicilio en Santa Tecla..."
            rows="4"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="WhatsApp (8 dígitos)">
            <UInput
              v-model="form.whatsapp"
              placeholder="79581732"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Enlace de Instagram">
            <UInput
              v-model="form.instagramUrl"
              placeholder="https://www.instagram.com/esencianailssv/"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="Formas de pago aceptadas">
          <UInput
            v-model="form.paymentMethodsText"
            placeholder="Efectivo o transferencia"
            class="w-full"
          />
        </UFormField>

        <div class="pt-2 flex justify-end">
          <UButton
            type="submit"
            color="primary"
            variant="solid"
            :loading="saving"
            class="px-6 font-semibold"
          >
            Guardar cambios
          </UButton>
        </div>
      </form>

      <!-- Panel lateral con vista previa en desktop -->
      <div class="space-y-4">
        <div class="p-5 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) space-y-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-sm">
              E
            </div>
            <div>
              <h3 class="text-xs font-semibold text-(--ui-text-highlighted) uppercase tracking-wider">Vista previa</h3>
              <p class="text-[11px] text-muted">Así se verá en la página pública</p>
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-(--ui-bg) border border-(--ui-border-muted) space-y-2">
            <div>
              <span class="font-bold text-sm text-(--ui-text-highlighted) block">{{ form.businessName || 'Esencia Nails by Mel' }}</span>
              <span class="text-xs text-muted block">{{ form.tagline || 'Santa Tecla · Servicio a domicilio' }}</span>
            </div>

            <p class="text-xs text-(--ui-text-highlighted) pt-2 border-t border-(--ui-border-muted) italic line-clamp-3">
              "{{ form.heroText || 'Uñas con diseño y servicio a domicilio en Santa Tecla.' }}"
            </p>
          </div>

          <div class="space-y-2 text-xs">
            <div class="flex justify-between py-1 text-muted">
              <span>WhatsApp:</span>
              <span class="font-mono text-(--ui-text-highlighted)">{{ form.whatsapp ? '+503 ' + form.whatsapp : 'Sin configurar' }}</span>
            </div>
            <div class="flex justify-between py-1 text-muted">
              <span>Instagram:</span>
              <span class="text-violet-600 dark:text-violet-400 truncate max-w-[150px]">
                {{ form.instagramUrl ? form.instagramUrl.replace('https://www.instagram.com/', '@') : 'Sin enlace' }}
              </span>
            </div>
            <div class="flex justify-between py-1 text-muted">
              <span>Pagos:</span>
              <span class="text-(--ui-text-highlighted) text-right truncate max-w-[150px]">{{ form.paymentMethodsText || 'Efectivo o transferencia' }}</span>
            </div>
          </div>
        </div>

        <div class="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 text-xs text-muted space-y-1.5">
          <div class="flex items-center gap-2 font-medium text-violet-600 dark:text-violet-400">
            <UIcon name="i-material-symbols-info-outline-rounded" class="w-4 h-4" />
            <span>¿Dónde se muestran estos textos?</span>
          </div>
          <p class="text-[11px] leading-relaxed">
            Actualizan la cabecera, el banner principal de bienvenida, los enlaces directos a WhatsApp y las tarjetas de presentación para compartir en redes.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
