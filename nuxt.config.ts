// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  telemetry: false,
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  nitro: {
    preset: 'netlify',
  },
  app: {
    head: {
      htmlAttrs: {
        lang: 'es-SV',
      },
      title: 'Esencia Nails by Mel | Uñas a domicilio en Santa Tecla',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#7c3aed' },
        {
          name: 'description',
          content:
            'Uñas con diseño y servicio a domicilio en Santa Tecla, El Salvador. Esmaltado en gel, uñas acrílicas y diseños personalizados. Agenda tu cita en línea.',
        },
        // Open Graph / WhatsApp / Instagram
        { property: 'og:site_name', content: 'Esencia Nails by Mel' },
        { property: 'og:type', content: 'website' },
        { property: 'og:locale', content: 'es_SV' },
        { property: 'og:title', content: 'Esencia Nails by Mel | Uñas a domicilio en Santa Tecla' },
        {
          property: 'og:description',
          content:
            'Servicio profesional de uñas a domicilio en Santa Tecla, El Salvador. Esmaltado en gel, uñas acrílicas y diseños personalizados. Agenda tu cita en línea.',
        },
        { property: 'og:image', content: '/og-image.png' },
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Esencia Nails by Mel | Uñas a domicilio en Santa Tecla' },
        {
          name: 'twitter:description',
          content:
            'Servicio profesional de uñas a domicilio en Santa Tecla, El Salvador. Esmaltado en gel, uñas acrílicas y diseños personalizados.',
        },
        { name: 'twitter:image', content: '/og-image.png' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'apple-touch-icon', href: '/icon.svg' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    },
  },
})
