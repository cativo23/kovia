<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <div class="flex items-center gap-6">
            <NuxtLink to="/" class="text-xl font-bold text-primary">
              Kovia
            </NuxtLink>
            <nav class="hidden sm:flex items-center gap-4">
              <NuxtLink to="/" class="text-sm text-gray-600 dark:text-gray-300 hover:text-primary">
                {{ $t('nav.home') }}
              </NuxtLink>
            </nav>
          </div>

          <div class="flex items-center gap-3">
            <template v-if="isAuthenticated">
              <UDropdownMenu :items="userMenuItems">
                <UButton
                  color="neutral"
                  variant="ghost"
                  :label="user?.firstName || ''"
                  icon="i-lucide-user"
                />
              </UDropdownMenu>
            </template>
            <template v-else>
              <UButton
                variant="ghost"
                color="neutral"
                :label="$t('nav.login')"
                to="/login"
              />
              <UButton
                :label="$t('nav.register')"
                to="/register"
              />
            </template>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <slot />
      </div>
    </main>

    <footer class="border-t border-gray-200 dark:border-gray-800 py-6">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
        &copy; {{ new Date().getFullYear() }} Kovia
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const user = computed(() => authStore.user)

const userMenuItems = computed(() => [
  [{
    label: t('nav.profile'),
    icon: 'i-lucide-user',
    to: '/',
  }],
  [{
    label: t('nav.admin'),
    icon: 'i-lucide-shield',
    to: '/admin',
    hidden: !authStore.isAdmin,
  }].filter(item => !item.hidden),
  [{
    label: t('nav.logout'),
    icon: 'i-lucide-log-out',
    onSelect: () => authStore.logout(),
  }],
])
</script>
