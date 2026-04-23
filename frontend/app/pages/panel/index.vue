<template>
  <div class="max-w-6xl mx-auto space-y-8">
    <!-- Hero greeting -->
    <div>
      <h1 class="text-[28px] font-semibold leading-tight">
        {{ $t('dashboard.panel.greeting', { nombre: authStore.user?.firstName || '' }) }}
      </h1>
      <p class="text-base text-gray-500 dark:text-gray-400 mt-1">
        {{ $t('dashboard.panel.title') }}
      </p>
    </div>

    <!-- Error state -->
    <UAlert
      v-if="error"
      color="error"
      :title="$t('dashboard.panel.error.heading')"
      :description="$t('dashboard.panel.error.body')"
    >
      <template #actions>
        <UButton
          size="sm"
          :label="$t('dashboard.panel.error.retry')"
          @click="refresh"
        />
      </template>
    </UAlert>

    <!-- Stat cards (D-18 — three buckets) -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <PanelStatCard
        :label="$t('dashboard.panel.stats.active')"
        :count="statsLoading ? null : counts.active"
        to="/perfil/aplicaciones?tab=activas"
        accent
      />
      <PanelStatCard
        :label="$t('dashboard.panel.stats.adopted')"
        :count="statsLoading ? null : counts.adopted"
        to="/perfil/aplicaciones?tab=historico"
      />
      <PanelStatCard
        :label="$t('dashboard.panel.stats.historic')"
        :count="statsLoading ? null : counts.historic"
        to="/perfil/aplicaciones?tab=historico"
      />
    </div>

    <!-- Empty state (zero applications) -->
    <PanelEmptyState v-if="!loading && !error && applications.length === 0" />

    <template v-else-if="!error">
      <!-- Recent applications -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold leading-snug">
            {{ $t('dashboard.panel.recentApplications') }}
          </h2>
          <NuxtLink
            to="/perfil/aplicaciones"
            class="text-sm text-primary hover:underline"
          >
            {{ $t('dashboard.panel.seeAllApplications') }}
          </NuxtLink>
        </div>
        <div v-if="loading" class="space-y-3">
          <UCard v-for="i in 3" :key="i" class="animate-pulse">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
              <div class="flex-1 space-y-2">
                <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              </div>
            </div>
          </UCard>
        </div>
        <div v-else class="space-y-3">
          <PanelApplicationRow
            v-for="app in recentApplications"
            :key="app.id"
            :app="app"
          />
        </div>
      </section>
    </template>

    <!-- Recent activity (D-08, D-09 — all notification types) -->
    <section v-if="!error">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold leading-snug">
          {{ $t('dashboard.panel.recentActivity') }}
        </h2>
        <NuxtLink
          to="/notificaciones"
          class="text-sm text-primary hover:underline"
        >
          {{ $t('dashboard.panel.seeAllNotifications') }}
        </NuxtLink>
      </div>
      <div v-if="loading" class="space-y-3">
        <USkeleton v-for="i in 3" :key="i" class="h-12 w-full" />
      </div>
      <UCard v-else-if="recentNotifications.length > 0">
        <ul class="divide-y divide-gray-100 dark:divide-gray-800">
          <PanelNotificationItem
            v-for="n in recentNotifications"
            :key="n.id"
            :notification="n"
          />
        </ul>
      </UCard>
      <p v-else class="text-sm text-gray-500">—</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useNotifications } from '~/composables/useNotifications'

type ApplicationStatus =
  | 'ENVIADA' | 'REVISANDO' | 'APROBADA' | 'RECHAZADA'
  | 'SEGUIMIENTO' | 'ADOPTADA' | 'RETIRADA' | 'DEVUELTA'

interface ApplicationRow {
  id: string
  status: ApplicationStatus
  submittedAt: string
  animal: {
    id: string
    name: string
    coverPhoto?: { url: string } | null
    organization?: {
      id: string
      name: string
      slug: string
      logoUrl: string | null
    } | null
  } | null
}

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'adopter'],
})

const authStore = useAuthStore()
const { get } = useApi()
const { notifications, fetchNotifications } = useNotifications()

const applications = ref<ApplicationRow[]>([])
const loading = ref(true)
const statsLoading = ref(true)
const error = ref(false)

const ACTIVE_STATUSES = ['ENVIADA', 'REVISANDO', 'APROBADA', 'SEGUIMIENTO'] as const
const ADOPTED_STATUSES = ['ADOPTADA'] as const
const HISTORIC_STATUSES = ['RECHAZADA', 'RETIRADA', 'DEVUELTA'] as const

const counts = computed(() => ({
  active: applications.value.filter(a => (ACTIVE_STATUSES as readonly string[]).includes(a.status)).length,
  adopted: applications.value.filter(a => (ADOPTED_STATUSES as readonly string[]).includes(a.status)).length,
  historic: applications.value.filter(a => (HISTORIC_STATUSES as readonly string[]).includes(a.status)).length,
}))

const recentApplications = computed(() =>
  [...applications.value]
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 5),
)

const recentNotifications = computed(() => notifications.value.slice(0, 5))

async function loadAll() {
  loading.value = true
  statsLoading.value = true
  error.value = false
  try {
    const result = await get<ApplicationRow[] | { data: ApplicationRow[] }>('/applications/my')
    // Backend may return bare array or { data, total } shape — mirror existing list page tolerance.
    applications.value = Array.isArray(result)
      ? result
      : ((result as { data?: ApplicationRow[] })?.data ?? [])
    await fetchNotifications(5)
  } catch {
    error.value = true
  } finally {
    loading.value = false
    statsLoading.value = false
  }
}

async function refresh() {
  await loadAll()
}

onMounted(loadAll)
</script>
