<template>
  <div class="min-h-screen flex bg-[var(--color-bg)] text-[var(--color-text)]">
    <aside class="w-64 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col">
      <div class="p-4 border-b border-[var(--color-border)]">
        <NuxtLink to="/admin" class="text-xl font-bold text-primary">
          Kovia
        </NuxtLink>
        <p class="text-xs text-[var(--color-text-muted)] mt-1">
          {{ $t('admin.dashboard') }}
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
              : 'text-[var(--color-text)]/70 hover:bg-[var(--color-border)]/40'
          ]"
        >
          <KIcon :name="item.icon" :size="20" />
          {{ item.label }}
        </NuxtLink>

        <!-- Bull Board: uses relay endpoint to exchange Bearer token for an HttpOnly
             cookie, avoiding the token-in-URL pattern that gets logged by proxies. -->
        <button
          type="button"
          :disabled="queuesBoardLoading"
          class="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-[var(--color-text)]/70 hover:bg-[var(--color-border)]/40 disabled:opacity-50 disabled:cursor-wait w-full text-left"
          @click="openQueuesBoard"
        >
          <KIcon name="activity" :size="20" />
          {{ t('admin.queues.title') }}
          <span v-if="queuesBoardLoading" class="ml-auto text-xs opacity-60">...</span>
        </button>
      </nav>

      <div class="p-4 border-t border-[var(--color-border)]">
        <UButton
          block
          variant="ghost"
          color="neutral"
          :label="$t('common.back')"
          to="/"
        >
          <template #leading>
            <KIcon name="arrow-left" :size="16" />
          </template>
        </UButton>
      </div>
    </aside>

    <div class="flex-1 flex flex-col">
      <header class="h-16 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex items-center px-6">
        <h1 class="text-lg font-semibold">
          {{ $t('admin.dashboard') }}
        </h1>
        <div class="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <UDropdownMenu :items="userMenuItems">
            <UButton
              color="neutral"
              variant="ghost"
              :label="user?.firstName || ''"
            >
              <template #leading>
                <KIcon name="user" :size="16" />
              </template>
            </UButton>
            <template #item-leading="{ item }">
              <KIcon v-if="item.kicon" :name="item.kicon" :size="16" />
            </template>
          </UDropdownMenu>
        </div>
      </header>

      <main class="flex-1 p-6 bg-[var(--color-bg)]">
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
const config = useRuntimeConfig()

const queuesBoardLoading = ref(false)

async function openQueuesBoard() {
  if (queuesBoardLoading.value) return
  queuesBoardLoading.value = true
  try {
    // Exchange the Bearer token for a short-lived HttpOnly cookie via the relay
    // endpoint. The cookie is scoped to /admin/queues so it never travels to
    // other routes. The token is never sent as a URL query parameter.
    await $fetch('/admin/queues-access', {
      baseURL: config.public.backendUrl,
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${authStore.accessToken ?? ''}`,
      },
    })
    window.open(`${config.public.backendUrl}/admin/queues`, '_blank', 'noopener,noreferrer')
  } catch (err) {
    console.error('[admin] Failed to open Bull Board:', err)
  } finally {
    queuesBoardLoading.value = false
  }
}

const user = computed(() => authStore.user)

const navItems = computed(() => [
  { to: '/admin', label: t('admin.dashboard'), icon: 'layout-dashboard' },
  { to: '/admin/orgs', label: t('admin.orgs.title'), icon: 'building-2' },
  { to: '/admin/users', label: t('admin.users.title'), icon: 'users' },
  { to: '/admin/invites', label: t('admin.invites.title'), icon: 'mail' },
  { to: '/admin/species', label: t('admin.species.title'), icon: 'paw-print' },
])

const userMenuItems = computed(() => [
  [{
    label: t('nav.profile'),
    kicon: 'user',
    to: '/',
  }],
  [{
    label: t('nav.logout'),
    kicon: 'log-out',
    onSelect: () => authStore.logout(),
  }],
])

function isActive(path: string): boolean {
  if (path === '/admin') return route.path === '/admin'
  return route.path.startsWith(path)
}
</script>
