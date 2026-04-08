import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()

  // Initialize auth state on every page load (restores session from refresh token cookie)
  if (!authStore.isInitialized) {
    await authStore.initialize()
  }
})
