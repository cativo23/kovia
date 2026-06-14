/**
 * Phase 14-07 / D-15 — Demo-route gate.
 *
 * Reads `runtimeConfig.public.designSystemEnabled` (sourced from
 * NUXT_PUBLIC_DESIGN_SYSTEM_ENABLED). When the flag is false (default),
 * any visit to `/design-system/*` is redirected to `/`. This keeps the
 * Storybook-style demo surface out of production by default — only dev
 * environments that opt in can reach it (T-14-09 mitigation).
 */
export default defineNuxtRouteMiddleware(() => {
  const {
    public: { designSystemEnabled },
  } = useRuntimeConfig()
  if (!designSystemEnabled) return navigateTo('/')
})
