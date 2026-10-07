<script setup lang="ts">
import { authClient } from '~/utils/auth-client'

definePageMeta({
  layout: false,
})

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)

async function handleLogin() {
  if (!email.value || !password.value) {
    errorMessage.value = 'Por favor completa correo y contraseña'
    return
  }

  loading.value = true
  errorMessage.value = null

  try {
    const res = await authClient.signIn.email({
      email: email.value.trim(),
      password: password.value,
    })

    if (res.error) {
      errorMessage.value = res.error.message || 'Credenciales incorrectas'
      return
    }

    await navigateTo('/admin')
  } catch (err: any) {
    errorMessage.value = err.message || 'Error al iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-(--ui-bg)">
    <div class="w-full max-w-sm p-6 sm:p-8 rounded-2xl border border-(--ui-border-muted) bg-(--ui-bg-muted) shadow-sm">
      <div class="text-center mb-6">
        <div class="w-12 h-12 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xl mx-auto mb-3">
          E
        </div>
        <h1 class="text-xl font-bold text-(--ui-text-highlighted)">Esencia Nails</h1>
        <p class="text-xs text-muted mt-1">Ingresa para administrar tu sitio y contenido</p>
      </div>

      <div v-if="errorMessage" class="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
        <UIcon name="i-material-symbols-error-outline-rounded" class="w-4 h-4 shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <UFormField label="Correo electrónico">
          <UInput
            v-model="email"
            type="email"
            placeholder="mel@ejemplo.com"
            required
            autocomplete="email"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Contraseña">
          <UInput
            v-model="password"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="current-password"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          color="primary"
          variant="solid"
          block
          class="mt-6 font-semibold"
          :loading="loading"
        >
          Iniciar sesión
        </UButton>
      </form>

      <div class="mt-6 text-center">
        <NuxtLink to="/" class="text-xs text-muted hover:text-(--ui-text-highlighted) transition-colors">
          ← Volver al sitio público
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
