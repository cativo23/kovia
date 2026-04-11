<template>
  <div class="min-h-screen flex">
    <aside class="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
      <div class="p-4 border-b border-gray-200 dark:border-gray-800">
        <NuxtLink to="/org/dashboard" class="text-xl font-bold text-primary">
          Kovia
        </NuxtLink>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {{ $t('org.dashboard') }}
        </p>
      </div>

      <nav class="flex-1 p-4 space-y-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors"
          :class="[
            isActive(item.to)
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          ]"
        >
          <UIcon :name="item.icon" class="w-5 h-5" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="p-4 border-t border-gray-200 dark:border-gray-800">
        <UButton
          block
          variant="ghost"
          color="neutral"
          icon="i-lucide-arrow-left"
          :label="$t('org.nav.backToSite')"
          to="/"
        />
      </div>
    </aside>

    <div class="flex-1 flex flex-col">
      <header class="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center px-6">
        <h1 class="text-lg font-semibold">
          {{ $t('org.dashboard') }}
        </h1>
        <div class="ml-auto flex items-center gap-3">
          <UDropdownMenu :items="userMenuItems">
            <UButton
              color="neutral"
              variant="ghost"
              :label="user?.firstName || ''"
              icon="i-lucide-user"
            />
          </UDropdownMenu>
        </div>
      </header>

      <main class="flex-1 p-6 bg-gray-50 dark:bg-gray-950">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()

const user = computed(() => authStore.user)

const navItems = computed(() => [
  { to: '/org/dashboard', label: t('org.nav.dashboard'), icon: 'i-lucide-layout-dashboard' },
  { to: '/org/dashboard/animales', label: t('org.nav.animals'), icon: 'i-lucide-paw-print' },
  { to: '/org/dashboard/aplicaciones', label: t('org.nav.applications'), icon: 'i-lucide-clipboard-list' },
  { to: '/org/dashboard/adoptantes', label: t('org.nav.adopters'), icon: 'i-lucide-users' },
  { to: '/org/dashboard/perfil', label: t('org.nav.profile'), icon: 'i-lucide-building-2' },
])

const userMenuItems = computed(() => [
  [{
    label: t('nav.profile'),
    icon: 'i-lucide-user',
    to: '/',
  }],
  [{
    label: t('nav.logout'),
    icon: 'i-lucide-log-out',
    onSelect: () => authStore.logout(),
  }],
])

function isActive(path: string): boolean {
  if (path === '/org/dashboard') return route.path === '/org/dashboard'
  return route.path.startsWith(path)
}
</script>
