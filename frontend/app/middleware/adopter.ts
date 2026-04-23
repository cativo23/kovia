import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async () => {
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated && !authStore.isInitialized) {
    await authStore.initialize()
  }

  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }

  if (authStore.userRole !== 'ADOPTER') {
    // Route platform admins to admin, everyone else (org staff/admin) to org dashboard
    if (authStore.isAdmin) return navigateTo('/admin')
    return navigateTo({ path: '/org/dashboard', query: { denied: '1' } })
  }
})
