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
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3000',
    },
  },

  devtools: { enabled: true },
});
