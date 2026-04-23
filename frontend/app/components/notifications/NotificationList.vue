<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="p-3 space-y-3">
      <USkeleton v-for="i in 3" :key="i" class="h-12 w-full" />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="p-3 text-center text-sm text-red-500">
      <p>{{ t('notifications.error') }}</p>
      <UButton variant="ghost" size="xs" class="mt-1" @click="$emit('retry')">
        {{ t('notifications.retry') }}
      </UButton>
    </div>

    <!-- Empty state -->
    <div v-else-if="notifications.length === 0" class="p-4 text-center text-sm text-gray-500">
      {{ t('notifications.empty') }}
    </div>

    <!-- Notifications list -->
    <ul v-else class="divide-y">
      <li
        v-for="n in notifications"
        :key="n.id"
        class="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
        :class="{ 'font-medium': !n.isRead }"
        @click="handleClick(n)"
      >
        <div class="flex items-start gap-2">
          <div v-if="!n.isRead" class="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
          <div v-else class="mt-1.5 w-2 h-2 shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-sm truncate">{{ n.title }}</p>
            <p v-if="n.body" class="text-xs text-gray-500 dark:text-gray-400 truncate">
              {{ n.body }}
            </p>
            <p class="text-xs text-gray-400 mt-0.5">{{ formatRelativeTime(n.createdAt) }}</p>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { Notification } from '~/composables/useNotifications'

const { t } = useI18n()

defineProps<{
  notifications: Notification[]
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  select: [notificationId: string]
  retry: []
}>()

async function handleClick(n: Notification) {
  // D-10 parity with PanelNotificationItem: deep-link when applicationId present.
  // LANDMINE (PATTERNS.md): applicationId is a top-level field on Notification.
  if (n.applicationId) {
    await navigateTo(`/perfil/aplicaciones/${n.applicationId}`)
  }
  // Parent still owns markAsRead (existing onNotificationSelect contract).
  emit('select', n.id)
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
