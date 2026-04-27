<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold">{{ t('org.nav.profile') }}</h2>
        <p class="text-gray-500 mt-1">
          {{ t('profile.userInfoDescription') }}
        </p>
      </div>
    </div>

    <UCard>
      <div class="space-y-3 py-4">
        <div v-if="currentUser">
          <p class="text-sm text-gray-500">{{ t('profile.name') }}</p>
          <p class="font-medium">{{ currentUser.firstName }} {{ currentUser.lastName }}</p>
          <p class="text-sm text-gray-500 mt-3">{{ t('profile.email') }}</p>
          <p class="font-medium">{{ currentUser.email }}</p>
          <p class="text-sm text-gray-500 mt-3">{{ t('profile.role') }}</p>
          <p class="font-medium">{{ currentUser.role }}</p>
        </div>
        <div v-else class="text-center py-8">
          <UIcon name="i-lucide-user" class="w-12 h-12 text-gray-300 mx-auto" />
          <p class="text-sm text-gray-500 mt-4">
            {{ t('profile.notLoaded') }}
          </p>
        </div>

        <!-- Org profile placeholder -->
        <div class="border-t pt-4 mt-4 text-center">
          <UIcon name="i-lucide-building-2" class="w-8 h-8 text-gray-300 mx-auto" />
          <p class="text-sm text-gray-500 mt-2">
            {{ t('profile.orgProfileComingSoon') }}
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'org',
  middleware: ['auth'],
})

const { t } = useI18n()
const authStore = useAuthStore()
// This page displays the authenticated user's personal info.
// Organization-level profile editing is a future feature.
const currentUser = computed(() => authStore.user)
</script>
