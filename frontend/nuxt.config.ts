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
      // Phase 14-07 / D-15 — gates the /design-system/* demo route tree.
      // Default false (env var unset) → middleware redirects to /. Set
      // NUXT_PUBLIC_DESIGN_SYSTEM_ENABLED=true in dev to access the demo.
      // CI deployment configs MUST NOT set this true (RESEARCH Security Domain, T-14-09).
      designSystemEnabled: process.env.NUXT_PUBLIC_DESIGN_SYSTEM_ENABLED === 'true',
    },
  },

  components: [
    { path: '~/components', pathPrefix: false },
  ],

  nitro: {},

  // Phase 15-09 / D-16 — bundle budget split.
  // Splits auth store + plugin, Nuxt UI overlays/floating, and motion-v runtime
  // into separate async chunks that are NOT in the initial preload graph for `/`.
  // This brings the initial JS for public routes from 249 KB gzip → ≤ 180 KB gzip.
  // Note: Nuxt 4 overrides chunkFileNames to hash-only in production builds by default;
  // we set chunkFileNames explicitly so the chunk names are preserved in the output
  // filenames, making them identifiable for audit and verification.
  vite: {
    build: {
      rollupOptions: {
        output: {
          // Include chunk name in filename so chunk-auth, chunk-motion, chunk-ui-overlays
          // are identifiable in .output/public/_nuxt/ for verification and debugging.
          chunkFileNames: '_nuxt/[name]-[hash].js',
          manualChunks: (id: string): string | undefined => {
            // Rule A — auth chunk: Pinia auth store + auth plugin
            if (id.includes('stores/auth') || id.includes('plugins/auth')) {
              return 'chunk-auth'
            }
            // Rule B — ui-overlays chunk: Nuxt UI overlay primitives + Floating UI + Reka UI
            if (
              id.includes('@nuxt/ui') ||
              id.includes('node_modules/@floating-ui') ||
              id.includes('node_modules/reka-ui')
            ) {
              return 'chunk-ui-overlays'
            }
            // Rule C — motion chunk: motion-v runtime (spring physics, transforms, scroll)
            if (id.includes('node_modules/motion-v') || id.includes('node_modules/motion')) {
              return 'chunk-motion'
            }
            // All other modules: let Vite's default chunking decide
            return undefined
          },
        },
      },
    },
  },

  devtools: { enabled: true },

  css: [
    '~/assets/css/main.css',
    '@fontsource-variable/inter',
  ],
});
