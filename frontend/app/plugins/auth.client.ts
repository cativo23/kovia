import { useAuthStore } from '~/stores/auth'

// Phase 15-09 / D-16 — deferred, client-only auth initialization.
//
// Why .client.ts (not auth.ts):
//   The `.client.ts` Nuxt file convention restricts this plugin to browser-only
//   execution. Previously, auth.ts ran on every SSR render (even for public routes
//   like `/` and `/animales`), forcing an async refreshToken → fetchProfile round-trip
//   before the first byte could be streamed. Public routes have no auth dependency,
//   so this was a pure overhead tax.
//
// Why app:mounted (not immediate):
//   The `app:mounted` hook fires AFTER the initial HTML paint and Vue hydration
//   complete. Deferring to this hook means:
//   1. LCP is unblocked — the browser displays content before any auth network call.
//   2. Auth state is undefined (not false) at SSR time — public routes render correctly
//      in an unauthenticated state (correct behavior, not a regression).
//   3. Protected route middleware (auth.ts, admin.ts, adopter.ts, etc.) independently
//      calls authStore.initialize() when !authStore.isInitialized, so navigation to
//      authenticated routes still triggers auth on first visit.
//
// Threat model (T-15-09-02 / T-15-09-04):
//   - org-setup.global middleware reads isAuthenticated which is false when
//     isInitialized=false; it returns early without redirect — no EoP on public routes.
//   - Auth state is not "disclosed" — it is undefined; route middleware is the
//     authoritative check for protected resources.

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', async () => {
    const authStore = useAuthStore()
    if (!authStore.isInitialized) {
      await authStore.initialize()
    }
  })
})
