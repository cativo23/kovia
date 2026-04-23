import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async () => {
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated && !authStore.isInitialized) {
    await authStore.initialize()
  }

  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }

  if (!authStore.isOrgAdmin) {
    return navigateTo({ path: '/org/dashboard', query: { denied: '1' } })
  }
})
