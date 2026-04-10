<template>
  <div>
    <!-- Page title -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        {{ $t('listings.title') }}
      </h1>
      <p class="mt-1 text-gray-500 dark:text-gray-400">
        {{ $t('listings.subtitle') }}
      </p>
    </div>

    <!-- Filters -->
    <AnimalFilters
      v-model="filters"
      @update:model-value="onFiltersChange"
    />

    <!-- Loading state -->
    <div v-if="pending" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <!-- Empty state -->
    <EmptyAnimals
      v-else-if="!animals.length"
      :variant="hasActiveFilters ? 'filtered' : 'empty'"
      @clear-filters="clearFilters"
    />

    <!-- Animal grid -->
    <template v-else>
      <AnimalGrid
        v-model:view-mode="viewMode"
        :animals="animals"
        :total="total"
      />

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="mt-8 flex justify-center">
        <UPagination
          :model-value="currentPage"
          :total="total"
          :page-count="limit"
          @update:model-value="onPageChange"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

useHead({ title: 'Animales en adopcion | Kovia' })

const config = useRuntimeConfig()
const route = useRoute()

interface FilterState {
  species?: string
  size?: string
  ageMin?: number
  ageMax?: number
  energyLevel?: string
  organization?: string
  search?: string
}

const limit = 12
const viewMode = ref<'grid' | 'list'>('grid')

// Reactive filters — sync from URL query params
const filters = ref<FilterState>({
  species: route.query.species as string || undefined,
  size: route.query.size as string || undefined,
  ageMin: route.query.ageMin ? parseInt(route.query.ageMin as string) : undefined,
  ageMax: route.query.ageMax ? parseInt(route.query.ageMax as string) : undefined,
  energyLevel: route.query.energyLevel as string || undefined,
  organization: route.query.organization as string || undefined,
  search: route.query.search as string || undefined,
})

const currentPage = computed(() => parseInt(route.query.page as string || '1'))

const queryParams = computed(() => ({
  page: currentPage.value,
  limit,
  species: filters.value.species || undefined,
  size: filters.value.size || undefined,
  ageMin: filters.value.ageMin ?? undefined,
  ageMax: filters.value.ageMax ?? undefined,
  energyLevel: filters.value.energyLevel || undefined,
  organization: filters.value.organization || undefined,
  search: filters.value.search || undefined,
}))

const { data, pending, refresh } = await useFetch<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>('/animals', {
  baseURL: config.public.apiUrl as string,
  query: queryParams,
})

const animals = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || 0)
const totalPages = computed(() => data.value?.totalPages || 1)

const hasActiveFilters = computed(() =>
  !!(filters.value.species || filters.value.size || filters.value.energyLevel ||
    filters.value.search || filters.value.ageMin !== undefined || filters.value.ageMax !== undefined)
)

function buildQuery(overrides: Record<string, any> = {}) {
  const q: Record<string, string> = {}
  if (filters.value.species) q.species = filters.value.species
  if (filters.value.size) q.size = filters.value.size
  if (filters.value.ageMin !== undefined) q.ageMin = String(filters.value.ageMin)
  if (filters.value.ageMax !== undefined) q.ageMax = String(filters.value.ageMax)
  if (filters.value.energyLevel) q.energyLevel = filters.value.energyLevel
  if (filters.value.organization) q.organization = filters.value.organization
  if (filters.value.search) q.search = filters.value.search
  return { ...q, ...overrides }
}

async function onFiltersChange(newFilters: FilterState) {
  filters.value = newFilters
  await navigateTo({ query: buildQuery({ page: '1' }) })
}

async function onPageChange(page: number) {
  await navigateTo({ query: buildQuery({ page: String(page) }) })
}

async function clearFilters() {
  filters.value = {}
  await navigateTo({ query: {} })
}
</script>
