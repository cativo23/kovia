<template>
  <li
    class="px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded transition-colors"
    :class="[
      notification.isRead ? 'opacity-60' : 'bg-elevated font-medium',
    ]"
    tabindex="0"
    role="button"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div class="flex items-start gap-2">
      <div v-if="!notification.isRead" class="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" aria-hidden="true" />
      <div v-else class="mt-1.5 w-2 h-2 shrink-0" aria-hidden="true" />
      <div class="flex-1 min-w-0">
        <p class="text-sm truncate">{{ notification.title }}</p>
        <p v-if="notification.body" class="text-xs text-gray-500 dark:text-gray-400 truncate">
          {{ notification.body }}
        </p>
        <p class="text-xs text-gray-400 mt-0.5">{{ formatRelativeTime(notification.createdAt) }}</p>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
import type { Notification } from '~/composables/useNotifications'
import { useNotifications } from '~/composables/useNotifications'

const props = defineProps<{ notification: Notification }>()

const { markAsRead } = useNotifications()

async function handleClick() {
  const n = props.notification
  // D-10 deep-link: useNotifications already flattens applicationId to top-level.
  // Mark read FIRST so the request is in flight before navigation unmounts us;
  // otherwise awaiting navigateTo lets the route change discard the handler.
  if (!n.isRead) {
    await markAsRead(n.id)
  }
  if (n.applicationId) {
    await navigateTo(`/perfil/aplicaciones/${n.applicationId}`)
  }
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'ahora mismo'
  if (diffMins < 60) return `hace ${diffMins} min`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `hace ${diffHours}h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `hace ${diffDays}d`

  return date.toLocaleDateString('es-SV')
}
</script>
