<template>
  <div class="min-h-screen flex flex-col">
    <!-- Navbar -->
    <header class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-50">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <!-- Brand + Nav -->
          <div class="flex items-center gap-6">
            <NuxtLink to="/" class="flex items-center gap-2 group">
              <UIcon name="i-lucide-paw-print" class="w-7 h-7 text-primary group-hover:scale-110 transition-transform" />
              <span class="text-xl font-bold text-primary">Kovia</span>
            </NuxtLink>

            <nav class="hidden sm:flex items-center gap-4">
              <NuxtLink
                to="/"
                class="text-sm text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                :class="{ 'text-primary font-medium': route.path === '/' }"
              >
                {{ $t('nav.home') }}
              </NuxtLink>
              <NuxtLink
                to="/animales"
                class="text-sm text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                :class="{ 'text-primary font-medium': route.path.startsWith('/animales') }"
              >
                {{ $t('nav.animals') }}
              </NuxtLink>
              <NuxtLink
                v-if="isOrgAdmin"
                :to="`/org/dashboard`"
                class="text-sm text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              >
                {{ $t('nav.myOrg') }}
              </NuxtLink>
            </nav>
          </div>

          <!-- Auth section -->
          <div class="flex items-center gap-3">
            <!-- Notification bell (adopter only) -->
            <NotificationsBell v-if="isAuthenticated && userRole === 'ADOPTER'" />

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

    <!-- Main content -->
    <main class="flex-1">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-8">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-paw-print" class="w-5 h-5 text-primary" />
            <span class="font-bold text-primary">Kovia</span>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ $t('common.footer.madeWith') }}
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-600">
            &copy; {{ new Date().getFullYear() }} Kovia
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const isOrgAdmin = computed(() => authStore.isOrgAdmin)
const user = computed(() => authStore.user)
const userRole = computed(() => authStore.userRole)

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
    label: t('nav.myOrg'),
    icon: 'i-lucide-building-2',
    to: '/org/dashboard',
    hidden: !authStore.isOrgAdmin,
  }].filter(item => !item.hidden),
  [{
    label: t('nav.logout'),
    icon: 'i-lucide-log-out',
    onSelect: () => authStore.logout(),
  }],
])
</script>
