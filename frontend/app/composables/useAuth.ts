import { useAuthStore } from '~/stores/auth'

export function useAuth() {
  const authStore = useAuthStore()

  return {
    user: computed(() => authStore.user),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    isAdmin: computed(() => authStore.isAdmin),
    isOrgAdmin: computed(() => authStore.isOrgAdmin),
    userRole: computed(() => authStore.userRole),
    login: authStore.login.bind(authStore),
    logout: authStore.logout.bind(authStore),
    register: authStore.register.bind(authStore),
    initialize: authStore.initialize.bind(authStore),
  }
}
