export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  // Only check for authenticated ORG_ADMIN users
  if (!authStore.isAuthenticated || !authStore.isOrgAdmin) return
  // Already on org setup page
  if (to.path === '/org/setup') return
  // Allow logout
  if (to.path === '/login' || to.path === '/register') return

  // Check if user has an organization (organizationId on user profile)
  if (!authStore.user?.organizationId) {
    return navigateTo('/org/setup')
  }
})
