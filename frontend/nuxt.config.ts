// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  modules: ['@nuxt/ui', 'motion-v/nuxt', '@pinia/nuxt', '@nuxtjs/i18n'],

  // Phase 14-03 / DESIGN-02 — Inter font preload (D-05).
  // The actual WOFF2 path served by @fontsource-variable/inter resolves under
  // Nuxt's _fonts/ output directory; the verifier should confirm the network
  // tab shows the preload hit and adjust href if the package version changes.
  app: {
    head: {
      link: [
        {
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          href: '/_fonts/inter-latin-wght-normal.woff2',
          crossorigin: 'anonymous',
        },
      ],
    },
  },

  // Phase 14-02 / DESIGN-01 — color-mode (auto-registered by @nuxt/ui v4).
  // D-04: localStorage key 'kovia-theme'; first-visit honors prefers-color-scheme.
  // classSuffix: '' so the class is `.dark` (not `.dark-mode`).
  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: '',
    storageKey: 'kovia-theme',
  },

  // Phase 14-02 — pre-wires Plan 06 (route view-transitions). Lands here as the
  // only nuxt.config touch in the design-system foundation.
  experimental: {
    viewTransition: true,
  },

  icon: {
    serverBundle: 'local',
  },

  i18n: {
    locales: [
      { code: 'es-SV', name: 'Espanol (El Salvador)', file: 'es-SV.json' },
    ],
    defaultLocale: 'es-SV',
    lazy: true,
    langDir: '../i18n/locales',
    strategy: 'no_prefix',
  },

  runtimeConfig: {
    // Server-side only: internal API URL for SSR requests
    apiInternal: process.env.NUXT_API_INTERNAL || 'http://api:3000',
    public: {
      // Client-side: proxy through Nuxt to avoid CORS and third-party cookie issues
      apiUrl: '/api/v1',
      // Direct backend URL for browser navigation to non-proxied backend routes (e.g., Bull Board)
      backendUrl: process.env.NUXT_PUBLIC_BACKEND_URL || 'http://localhost:3000',
      // Shadow mode: when false, ScorePanel renders nothing (scores computed but hidden until calibration)
      scoringDisplayEnabled: process.env.NUXT_PUBLIC_SCORING_DISPLAY_ENABLED === 'true',
    },
  },

  components: [
    { path: '~/components', pathPrefix: false },
  ],

  nitro: {},

  devtools: { enabled: true },

  css: [
    '~/assets/css/main.css',
    '@fontsource-variable/inter',
  ],
});
