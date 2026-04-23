<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('applications.history.title') }}</h1>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
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

    <!-- Error -->
    <UCard v-else-if="error" class="text-center py-8">
      <UIcon name="i-lucide-alert-circle" class="w-12 h-12 text-error mx-auto mb-3" />
      <p class="text-gray-500 mb-4">{{ $t('applications.errors.loadFailed') }}</p>
      <UButton :label="$t('common.retry')" @click="loadApplications" />
    </UCard>

    <!-- Empty State (zero applications total across all buckets) -->
    <UCard v-else-if="applications.length === 0" class="text-center py-16">
      <UIcon name="i-lucide-clipboard-list" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h2 class="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
        {{ $t('applications.history.emptyTitle') }}
      </h2>
      <p class="text-gray-500 mb-6">{{ $t('applications.history.emptyBody') }}</p>
      <UButton to="/animales" :label="$t('applications.history.emptyCta')" />
    </UCard>

    <!-- Tabs (Activas / Histórico) -->
    <UTabs
      v-else
      v-model="activeTab"
      :items="tabItems"
      :default-value="activeTab"
    >
      <template #activas>
        <div v-if="activeApps.length === 0" class="text-sm text-gray-500 py-6 text-center">
          {{ $t('applications.emptyByTab.active') }}
        </div>
        <div v-else class="space-y-4">
          <PanelApplicationRow
            v-for="app in activeApps"
            :key="app.id"
            :app="app"
          />
        </div>
      </template>
      <template #historico>
        <div v-if="historicApps.length === 0" class="text-sm text-gray-500 py-6 text-center">
          {{ $t('applications.emptyByTab.historic') }}
        </div>
        <div v-else class="space-y-4">
          <PanelApplicationRow
            v-for="app in historicApps"
            :key="app.id"
            :app="app"
          />
        </div>
      </template>
    </UTabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const { t } = useI18n()
const { get } = useApi()
const route = useRoute()
const router = useRouter()

type ApplicationStatus =
  | 'ENVIADA' | 'REVISANDO' | 'APROBADA' | 'RECHAZADA'
  | 'SEGUIMIENTO' | 'ADOPTADA' | 'RETIRADA' | 'DEVUELTA'

interface ApplicationListItem {
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

const ACTIVE_STATUSES = ['ENVIADA', 'REVISANDO', 'APROBADA', 'SEGUIMIENTO'] as const
const HISTORIC_STATUSES = ['ADOPTADA', 'RECHAZADA', 'RETIRADA', 'DEVUELTA'] as const

const applications = ref<ApplicationListItem[]>([])
const loading = ref(true)
const error = ref(false)

const validTabs = ['activas', 'historico'] as const
type TabValue = typeof validTabs[number]

const activeTab = ref<TabValue>(
  (validTabs as readonly string[]).includes(route.query.tab as string)
    ? (route.query.tab as TabValue)
    : 'activas',
)

watch(activeTab, (v) => {
  router.replace({ query: { ...route.query, tab: v } })
})

const tabItems = computed(() => [
  { label: t('applications.tabs.active'), value: 'activas', slot: 'activas' },
  { label: t('applications.tabs.historic'), value: 'historico', slot: 'historico' },
])

const activeApps = computed(() =>
  applications.value
    .filter(a => (ACTIVE_STATUSES as readonly string[]).includes(a.status))
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
)

const historicApps = computed(() =>
  applications.value
    .filter(a => (HISTORIC_STATUSES as readonly string[]).includes(a.status))
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
)

async function loadApplications() {
  loading.value = true
  error.value = false
  try {
    const result = await get<ApplicationListItem[] | { data: ApplicationListItem[]; total: number }>('/applications/my')
    applications.value = Array.isArray(result)
      ? result
      : ((result as { data?: ApplicationListItem[] })?.data ?? [])
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadApplications()
})
</script>
