<template>
  <div class="flex flex-col items-center justify-center py-16">
    <template v-if="isAuthenticated">
      <UIcon name="i-lucide-paw-print" class="w-16 h-16 text-primary mb-4" />
      <h1 class="text-3xl font-bold">
        {{ $t('landing.welcomeAuth', { name: user?.firstName }) }}
      </h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        {{ $t('landing.role', { role: userRole }) }}
      </p>
    </template>

    <template v-else>
      <UIcon name="i-lucide-paw-print" class="w-16 h-16 text-primary mb-4" />
      <h1 class="text-4xl font-bold">{{ $t('landing.title') }}</h1>
      <p class="mt-4 text-lg text-gray-600 dark:text-gray-400">
        {{ $t('landing.welcomeGuestDescription') }}
      </p>
      <div class="mt-8 flex gap-4">
        <UButton size="lg" to="/register" :label="$t('nav.register')" />
        <UButton size="lg" variant="outline" to="/login" :label="$t('nav.login')" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
const user = computed(() => authStore.user)
const userRole = computed(() => authStore.userRole)

useHead({
  title: 'Kovia - Plataforma inteligente de adopcion de mascotas',
})
</script>
