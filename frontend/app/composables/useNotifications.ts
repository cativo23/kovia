import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  body: string | null
  applicationId: string | null
  isRead: boolean
  createdAt: string
}

export function useNotifications() {
  const notifications = useState<Notification[]>('notifications', () => [])
  const unreadCount = useState<number>('notifications:unreadCount', () => 0)
  const loading = useState<boolean>('notifications:loading', () => false)
  const error = useState<string | null>('notifications:error', () => null)

  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  function authHeaders() {
    return authStore.accessToken
      ? { Authorization: `Bearer ${authStore.accessToken}` }
      : {}
  }

  async function fetchNotifications(limit = 20) {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<{ notifications: Notification[]; unreadCount: number }>('/notifications', {
        baseURL: config.public.apiUrl as string,
        headers: authHeaders(),
      })
      notifications.value = response.notifications
      unreadCount.value = response.unreadCount
    } catch (e: any) {
      error.value = e.message || 'Error al cargar notificaciones'
    } finally {
      loading.value = false
    }
  }

  async function fetchUnreadCount() {
    try {
      const response = await $fetch<{ notifications: Notification[]; unreadCount: number }>('/notifications', {
        baseURL: config.public.apiUrl as string,
        headers: authHeaders(),
      })
      unreadCount.value = response.unreadCount
    } catch {
      // Silently fail — unread count is non-critical
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      await $fetch(`/notifications/${notificationId}/read`, {
        method: 'POST',
        baseURL: config.public.apiUrl as string,
        headers: authHeaders(),
      })
      const n = notifications.value.find((n) => n.id === notificationId)
      if (n) {
        n.isRead = true
      }
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch {
      // Silently fail — will refresh on next fetch
    }
  }

  async function markAllAsRead() {
    try {
      await $fetch('/notifications/read-all', {
        method: 'POST',
        baseURL: config.public.apiUrl as string,
        headers: authHeaders(),
      })
      notifications.value.forEach((n) => {
        n.isRead = true
      })
      unreadCount.value = 0
    } catch {
      // Silently fail — will refresh on next fetch
    }
  }

  return {
    notifications: computed(() => notifications.value),
    unreadCount: computed(() => unreadCount.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  }
}
