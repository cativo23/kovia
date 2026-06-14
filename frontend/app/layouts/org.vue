<template>
  <div class="min-h-screen flex bg-[var(--color-bg)] text-[var(--color-text)]">
    <aside class="w-64 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col">
      <div class="p-4 border-b border-[var(--color-border)]">
        <NuxtLink to="/org/dashboard" class="text-xl font-bold text-primary">
          Kovia
        </NuxtLink>
        <p class="text-xs text-[var(--color-text-muted)] mt-1">
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
              : 'text-[var(--color-text)]/70 hover:bg-[var(--color-border)]/40'
          ]"
        >
          <KIcon :name="item.icon" :size="20" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="p-4 border-t border-[var(--color-border)]">
        <UButton
          block
          variant="ghost"
          color="neutral"
          :label="$t('org.nav.backToSite')"
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
          {{ $t('org.dashboard') }}
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

const user = computed(() => authStore.user)

const navItems = computed(() => [
  { to: '/org/dashboard', label: t('org.nav.dashboard'), icon: 'layout-dashboard' },
  { to: '/org/dashboard/animales', label: t('org.nav.animals'), icon: 'paw-print' },
  { to: '/org/dashboard/aplicaciones', label: t('org.nav.applications'), icon: 'clipboard-list' },
  { to: '/org/dashboard/adoptantes', label: t('org.nav.adopters'), icon: 'users' },
  ...(authStore.isOrgAdmin ? [{ to: '/org/dashboard/equipo', label: t('org.nav.team'), icon: 'users-round' }] : []),
  { to: '/org/dashboard/perfil', label: t('org.nav.profile'), icon: 'building-2' },
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
  if (path === '/org/dashboard') return route.path === '/org/dashboard'
  return route.path.startsWith(path)
}
</script>
