<template>
  <UPopover v-model:open="isOpen" :content="{ side: 'bottom', align: 'end' }">
    <UButton
      variant="ghost"
      color="neutral"
      icon="i-lucide-bell"
      :aria-label="t('notifications.bell.tooltip')"
    >
      <template v-if="unreadCount > 0" #trailing>
        <UBadge color="error" size="xs" :label="String(unreadCount)" />
      </template>
    </UButton>

    <template #content>
      <div class="w-80 max-h-80 overflow-y-auto">
        <NotificationList
          :notifications="notifications"
          :loading="loading"
          :error="error"
          @select="onNotificationSelect"
        />

        <div class="flex items-center justify-between px-3 py-2 border-t">
          <UButton
            v-if="unreadCount > 0"
            variant="ghost"
            size="xs"
            @click="onMarkAllRead"
          >
            {{ t('notifications.bell.markAllRead') }}
          </UButton>
          <NuxtLink
            to="/notificaciones"
            class="text-xs text-primary hover:underline ml-auto"
            @click="isOpen = false"
          >
            {{ t('notifications.viewAll') }}
          </NuxtLink>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { notifications, unreadCount, loading, error, fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } = useNotifications()

const isOpen = ref(false)

onMounted(() => fetchUnreadCount())

watch(isOpen, (open) => {
  if (open) fetchNotifications()
})

async function onNotificationSelect(notificationId: string) {
  await markAsRead(notificationId)
}

async function onMarkAllRead() {
  await markAllAsRead()
}
</script>
