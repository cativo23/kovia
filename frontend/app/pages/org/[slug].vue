<template>
  <div class="max-w-5xl mx-auto py-8">
    <!-- Loading -->
    <div v-if="!org && pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <!-- Not Found -->
    <UCard v-else-if="!org" class="text-center py-8">
      <UIcon name="i-lucide-building-2" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h2 class="text-xl font-bold mb-2">{{ $t('org.profile.notFound') }}</h2>
      <p class="text-gray-500">{{ $t('org.profile.notFoundDescription') }}</p>
    </UCard>

    <!-- Org Profile -->
    <div v-else>
      <!-- Header -->
      <div class="flex items-start gap-6 mb-8">
        <div v-if="org.logoUrl" class="flex-shrink-0">
          <img
            :src="org.logoUrl"
            :alt="org.name"
            class="w-24 h-24 rounded-xl object-cover"
          />
        </div>
        <div v-else class="flex-shrink-0 w-24 h-24 rounded-xl bg-primary/10 flex items-center justify-center">
          <UIcon name="i-lucide-building-2" class="w-10 h-10 text-primary" />
        </div>
        <div>
          <h1 class="text-3xl font-bold">{{ org.name }}</h1>
          <p v-if="org.description" class="text-gray-600 dark:text-gray-300 mt-2">
            {{ org.description }}
          </p>
        </div>
      </div>

      <!-- Contact Info -->
      <UCard class="mb-6">
        <template #header>
          <h3 class="font-semibold">{{ $t('org.profile.contactInfo') }}</h3>
        </template>
        <div class="space-y-3">
          <div v-if="org.contactEmail" class="flex items-center gap-3">
            <UIcon name="i-lucide-mail" class="w-5 h-5 text-gray-400" />
            <a :href="`mailto:${org.contactEmail}`" class="text-primary hover:underline">
              {{ org.contactEmail }}
            </a>
          </div>
          <div v-if="org.phone" class="flex items-center gap-3">
            <UIcon name="i-lucide-phone" class="w-5 h-5 text-gray-400" />
            <a :href="`tel:${org.phone}`" class="text-primary hover:underline">
              {{ org.phone }}
            </a>
          </div>
        </div>
      </UCard>

      <!-- Social Links -->
      <div v-if="org.instagram || org.facebook || org.whatsapp" class="flex gap-3 mb-8">
        <UButton
          v-if="org.instagram"
          variant="outline"
          color="neutral"
          icon="i-lucide-instagram"
          :label="$t('org.instagram')"
          :to="`https://instagram.com/${org.instagram.replace('@', '')}`"
          target="_blank"
        />
        <UButton
          v-if="org.facebook"
          variant="outline"
          color="neutral"
          icon="i-lucide-facebook"
          :label="$t('org.facebook')"
          :to="`https://facebook.com/${org.facebook}`"
          target="_blank"
        />
        <UButton
          v-if="org.whatsapp"
          variant="outline"
          color="neutral"
          icon="i-lucide-message-circle"
          :label="$t('org.whatsapp')"
          :to="`https://wa.me/${org.whatsapp.replace(/[^0-9+]/g, '')}`"
          target="_blank"
        />
      </div>

      <!-- Animals section -->
      <div>
        <h2 class="text-2xl font-bold mb-4">{{ $t('org.profile.animals') }}</h2>

        <!-- Org-scoped filters (no org filter since already scoped) -->
        <AnimalFilters
          v-model="filters"
          @update:model-value="onFiltersChange"
        />

        <!-- Animals grid or empty state -->
        <template v-if="animalsData?.data?.length">
          <AnimalGrid
            v-model:view-mode="viewMode"
            :animals="animalsData.data"
            :total="animalsData.total"
          />

          <!-- Pagination -->
          <div v-if="animalsData.totalPages > 1" class="mt-8 flex justify-center">
            <UPagination
              :model-value="currentPage"
              :total="animalsData.total"
              :page-count="12"
              @update:model-value="onPageChange"
            />
          </div>
        </template>

        <EmptyAnimals
          v-else
          variant="empty"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const route = useRoute()
const config = useRuntimeConfig()

const slug = computed(() => route.params.slug as string)
const currentPage = computed(() => parseInt(route.query.page as string || '1'))
const viewMode = ref<'grid' | 'list'>('grid')

interface FilterState {
  species?: string
  size?: string
  ageMin?: number
  ageMax?: number
  energyLevel?: string
  search?: string
}

const filters = ref<FilterState>({
  species: route.query.species as string || undefined,
  size: route.query.size as string || undefined,
  energyLevel: route.query.energyLevel as string || undefined,
  search: route.query.search as string || undefined,
})

// SSR fetch for org info
const { data: org, pending } = await useFetch<any>(`/organizations/${slug.value}`, {
  baseURL: config.public.apiUrl as string,
}).catch(() => ({ data: ref(null), pending: ref(false) }))

// SSR fetch for animals
const animalsQuery = computed(() => ({
  limit: 12,
  page: currentPage.value,
  species: filters.value.species || undefined,
  size: filters.value.size || undefined,
  energyLevel: filters.value.energyLevel || undefined,
  search: filters.value.search || undefined,
}))

const { data: animalsData } = await useFetch<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(
  `/animals/by-org/${slug.value}`,
  {
    baseURL: config.public.apiUrl as string,
    query: animalsQuery,
  },
).catch(() => ({ data: ref(null) }))

// SEO meta for org page
useSeoMeta({
  title: () => org.value ? `${org.value.name} - Kovia` : 'Organizacion | Kovia',
  ogTitle: () => org.value?.name || 'Organizacion en Kovia',
  description: () => org.value?.description || `Conoce los animales en adopcion de ${org.value?.name}`,
  ogDescription: () => org.value?.description || `Conoce los animales en adopcion de ${org.value?.name}`,
  ogImage: () => org.value?.logoUrl || '/og-default.png',
  ogType: 'profile',
})

function buildQuery(overrides: Record<string, any> = {}) {
  const q: Record<string, string> = {}
  if (filters.value.species) q.species = filters.value.species
  if (filters.value.size) q.size = filters.value.size
  if (filters.value.energyLevel) q.energyLevel = filters.value.energyLevel
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
</script>
