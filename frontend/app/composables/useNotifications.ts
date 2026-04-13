import { ref, computed } from 'vue'
import type { Ref } from 'vue'

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
  const notifications: Ref<Notification[]> = ref([])
  const unreadCount: Ref<number> = ref(0)
  const loading = ref(false)
  const error: Ref<string | null> = ref(null)

  const config = useRuntimeConfig()

  async function fetchNotifications(limit = 20) {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<{ notifications: Notification[]; unreadCount: number }>('/notifications', {
        baseURL: config.public.apiUrl as string,
        credentials: 'include',
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
      const response = await $fetch<{ unreadCount: number }>('/notifications', {
        baseURL: config.public.apiUrl as string,
        credentials: 'include',
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
        credentials: 'include',
      })
      // Update local state
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
        credentials: 'include',
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
