<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold">{{ $t('applications.queue.heading') }}</h2>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <!-- Filter by animal -->
      <USelectMenu
        v-model="filters.animalId"
        :options="animalOptions"
        value-attribute="value"
        option-attribute="label"
        :placeholder="$t('applications.queue.allAnimals')"
        searchable
        class="min-w-[200px]"
        @update:model-value="onFiltersChange"
      />

      <!-- Filter by status -->
      <USelectMenu
        v-model="filters.status"
        :options="statusOptions"
        value-attribute="value"
        option-attribute="label"
        :placeholder="$t('applications.queue.allStatuses')"
        class="min-w-[180px]"
        @update:model-value="onFiltersChange"
      />

      <!-- Date range -->
      <UInput
        v-model="filters.dateFrom"
        type="date"
        :placeholder="$t('applications.queue.dateFrom')"
        @update:model-value="onFiltersChange"
      />
      <UInput
        v-model="filters.dateTo"
        type="date"
        :placeholder="$t('applications.queue.dateTo')"
        @update:model-value="onFiltersChange"
      />
    </div>

    <!-- Table -->
    <UCard>
      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin" />
      </div>

      <div v-else-if="applications.length === 0" class="text-center py-12">
        <UIcon name="i-lucide-clipboard-list" class="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {{ $t('applications.queue.empty.heading') }}
        </p>
        <p class="text-sm text-gray-500">
          {{ $t('applications.queue.empty.body') }}
        </p>
      </div>

      <UTable
        v-else
        :data="applications"
        :columns="columns"
        class="cursor-pointer"
      >
        <template #adopter-cell="{ row }">
          <span class="font-medium">
            {{ row.original.adopterFirstName }} {{ row.original.adopterLastName }}
          </span>
        </template>

        <template #animal-cell="{ row }">
          <div class="flex items-center gap-2">
            <img
              v-if="row.original.animal?.coverPhotoUrl"
              :src="row.original.animal.coverPhotoUrl"
              :alt="row.original.animal?.name"
              class="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            />
            <div
              v-else
              class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0"
            >
              <UIcon name="i-lucide-paw-print" class="w-5 h-5 text-gray-400" />
            </div>
            <span>{{ row.original.animal?.name ?? '-' }}</span>
          </div>
        </template>

        <template #submittedAt-cell="{ row }">
          {{ formatDate(row.original.submittedAt) }}
        </template>

        <template #score-cell="{ row }">
          <div v-if="row.original.score !== null && row.original.score !== undefined" class="flex items-center gap-2">
            <span class="text-sm font-medium">{{ row.original.score }}</span>
            <RiskBadge
              v-if="row.original.scoreDetails?.riskLevel"
              :risk-level="row.original.scoreDetails.riskLevel"
            />
          </div>
          <span v-else class="text-gray-400 italic">—</span>
        </template>

        <template #status-cell="{ row }">
          <ApplicationStatusBadge :status="row.original.status" />
        </template>

        <template #actions-cell="{ row }">
          <UButton
            variant="link"
            size="sm"
            :to="`/org/dashboard/aplicaciones/${row.original.id}`"
            @click.stop
          >
            {{ $t('applications.queue.viewDetail') }}
          </UButton>
        </template>
      </UTable>

      <!-- Pagination -->
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-800"
      >
        <p class="text-sm text-gray-500">
          {{ total }} {{ $t('applications.queue.heading').toLowerCase() }}
        </p>
        <UPagination
          v-model:page="page"
          :total="total"
          :items-per-page="limit"
          @update:page="loadApplications"
        />
      </div>
    </UCard>
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

interface Animal {
  id: string
  name: string
  coverPhotoUrl: string | null
}

interface Application {
  id: string
  adopterFirstName: string
  adopterLastName: string
  adopterEmail: string
  animal: Animal | null
  submittedAt: string
  status: ApplicationStatus
  score: number | null
  scoreDetails: { riskLevel: string } | null
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface AnimalOption {
  label: string
  value: string
}

const { t } = useI18n()
const { get } = useApi()
const toast = useToast()

const applications = ref<Application[]>([])
const loading = ref(true)
const page = ref(1)
const total = ref(0)
const totalPages = ref(0)
const limit = 10

const animalOptions = ref<AnimalOption[]>([])

const filters = reactive({
  animalId: '' as string,
  status: '' as string,
  dateFrom: '' as string,
  dateTo: '' as string,
})

const statusOptions = computed(() => [
  { label: t('applications.status.enviada'), value: 'ENVIADA' },
  { label: t('applications.status.revisando'), value: 'REVISANDO' },
  { label: t('applications.status.aprobada'), value: 'APROBADA' },
  { label: t('applications.status.rechazada'), value: 'RECHAZADA' },
  { label: t('applications.status.seguimiento'), value: 'SEGUIMIENTO' },
  { label: t('applications.status.adoptada'), value: 'ADOPTADA' },
  { label: t('applications.status.retirada'), value: 'RETIRADA' },
])

const columns = [
  { accessorKey: 'adopter', header: t('applications.queue.columns.adopter') },
  { accessorKey: 'animal', header: t('applications.queue.columns.animal') },
  { accessorKey: 'submittedAt', header: t('applications.queue.columns.date') },
  { accessorKey: 'score', header: t('scoring.queueColumn') },
  { accessorKey: 'status', header: t('applications.queue.columns.status') },
  { accessorKey: 'actions', header: t('applications.queue.columns.actions') },
]

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-SV', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

let debounceTimeout: ReturnType<typeof setTimeout> | null = null
function onFiltersChange() {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    page.value = 1
    loadApplications()
  }, 300)
}

async function loadAnimals() {
  try {
    const result = await get<PaginatedResponse<Animal>>('/animals/org?limit=100')
    animalOptions.value = result.data.map((a) => ({ label: a.name, value: a.id }))
  } catch {
    // non-critical — filters will still work without animal list
  }
}

async function loadApplications() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', String(page.value))
    params.set('limit', String(limit))
    if (filters.animalId) params.set('animalId', filters.animalId)
    if (filters.status) params.set('status', filters.status)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)

    const result = await get<PaginatedResponse<Application>>(
      `/applications/org?${params.toString()}`,
    )
    applications.value = result.data
    total.value = result.total
    totalPages.value = result.totalPages
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAnimals()
  loadApplications()
})
</script>
