<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <template v-else>
      <!-- Back link -->
      <NuxtLink
        to="/org/dashboard/aplicaciones"
        class="text-sm text-gray-500 hover:text-primary inline-flex items-center gap-1 mb-6"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        {{ $t('adoptantes.backToApplications') }}
      </NuxtLink>

      <h2 class="text-2xl font-bold mb-6">{{ $t('adoptantes.historyHeading') }}</h2>

      <!-- Summary stats -->
      <div class="flex gap-4 mb-6">
        <UCard class="flex-1 text-center">
          <p class="text-2xl font-bold">{{ history.summary.totalApplications }}</p>
          <p class="text-sm text-gray-500">{{ $t('adoptantes.solicitudes') }}</p>
        </UCard>
        <UCard class="flex-1 text-center">
          <p class="text-2xl font-bold text-green-600">{{ history.summary.adopted }}</p>
          <p class="text-sm text-gray-500">{{ $t('adoptantes.adoptados') }}</p>
        </UCard>
        <UCard class="flex-1 text-center">
          <p class="text-2xl font-bold" :class="history.summary.returned > 0 ? 'text-red-500' : ''">
            {{ history.summary.returned }}
          </p>
          <p class="text-sm text-gray-500">{{ $t('adoptantes.devueltos') }}</p>
        </UCard>
      </div>

      <!-- Applications list -->
      <UCard>
        <template #header>
          <h3 class="font-semibold text-base">{{ $t('adoptantes.applicationsList') }}</h3>
        </template>
        <div v-if="history.applications.length === 0" class="text-center py-6">
          <p class="text-sm text-gray-400 italic">{{ $t('adoptantes.empty') }}</p>
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="app in history.applications"
            :key="app.id"
            class="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0"
          >
            <div>
              <p class="text-sm font-medium">
                <template v-if="app.isOwnOrg && app.animalName">
                  {{ app.animalName }}
                </template>
                <template v-else>
                  {{ app.animalSpecies ?? $t('adoptantes.unknownSpecies') }}
                </template>
              </p>
              <p class="text-xs text-gray-400">
                {{ formatDate(app.submittedAt) }}
                <span v-if="!app.isOwnOrg" class="ml-1 text-gray-300">({{ $t('adoptantes.otherOrg') }})</span>
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="app.isOwnOrg && app.score !== null" class="text-sm text-gray-500">
                {{ app.score }} pts
              </span>
              <ApplicationStatusBadge :status="app.status as ApplicationStatus" size="xs" />
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'org',
  middleware: ['auth', 'org'],
})

type ApplicationStatus =
  | 'ENVIADA'
  | 'REVISANDO'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'SEGUIMIENTO'
  | 'ADOPTADA'
  | 'RETIRADA'
  | 'DEVUELTA'

interface HistoryApplication {
  id: string
  status: string
  animalName: string | null
  animalSpecies: string | null
  submittedAt: string
  updatedAt: string
  score: number | null
  isOwnOrg: boolean
}

interface AdopterHistory {
  summary: {
    totalApplications: number
    adopted: number
    returned: number
  }
  applications: HistoryApplication[]
}

const { get } = useApi()
const toast = useToast()
const { t } = useI18n()
const route = useRoute()

const loading = ref(true)
const history = ref<AdopterHistory>({
  summary: { totalApplications: 0, adopted: 0, returned: 0 },
  applications: [],
})

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-SV', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function loadHistory() {
  loading.value = true
  try {
    const userId = route.params.userId as string
    history.value = await get<AdopterHistory>(`/adopters/${userId}/history`)
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
    await navigateTo('/org/dashboard/aplicaciones')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadHistory()
})
</script>
