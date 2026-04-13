<template>
  <div>
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        {{ $t('notifications.page.title') }}
      </h1>
    </div>

    <div class="flex justify-end mb-4">
      <UButton
        v-if="unreadCount > 0"
        variant="outline"
        size="sm"
        @click="onMarkAllRead"
      >
        {{ $t('notifications.bell.markAllRead') }}
      </UButton>
    </div>

    <NotificationList
      :notifications="notifications"
      :loading="loading"
      :error="error"
      @select="onNotificationSelect"
      @retry="fetchNotifications"
    />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { notifications, unreadCount, loading, error, fetchNotifications, markAsRead, markAllAsRead } = useNotifications()

onMounted(async () => {
  await fetchNotifications(50)
})

async function onNotificationSelect(notificationId: string) {
  await markAsRead(notificationId)
}

async function onMarkAllRead() {
  await markAllAsRead()
}
</script>
