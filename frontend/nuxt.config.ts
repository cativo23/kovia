// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxtjs/i18n',
  ],

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
      apiUrl: '/api',
    },
  },

  nitro: {
    routeRules: {
      '/api/**': {
        proxy: {
          to: (process.env.NUXT_API_INTERNAL || 'http://api:3000') + '/**',
        },
      },
    },
  },

  devtools: { enabled: true },

  css: [
    '~/assets/css/main.css',
  ],
});
