<template>
  <div>
    <!-- Desktop: horizontal bar -->
    <div class="hidden sm:block">
      <UCard class="mb-4">
        <div class="flex flex-wrap gap-3 items-end">
          <!-- Search -->
          <div class="flex-1 min-w-48">
            <UInput
              v-model="localFilters.search"
              :placeholder="$t('listings.search')"
              icon="i-lucide-search"
              @update:model-value="onSearchInput"
            />
          </div>

          <!-- Species -->
          <div class="min-w-36">
            <USelectMenu
              v-model="localFilters.species"
              :items="speciesOptions"
              :placeholder="$t('listings.filter.species')"
              value-key="value"
              label-key="label"
              @update:model-value="onFilterChange"
            />
          </div>

          <!-- Size -->
          <div class="min-w-36">
            <USelectMenu
              v-model="localFilters.size"
              :items="sizeOptions"
              :placeholder="$t('listings.filter.size')"
              value-key="value"
              label-key="label"
              @update:model-value="onFilterChange"
            />
          </div>

          <!-- Age range -->
          <div class="min-w-36">
            <USelectMenu
              v-model="selectedAgeRange"
              :items="ageOptions"
              :placeholder="$t('listings.filter.age')"
              value-key="value"
              label-key="label"
              @update:model-value="onAgeChange"
            />
          </div>

          <!-- Energy level -->
          <div class="min-w-36">
            <USelectMenu
              v-model="localFilters.energyLevel"
              :items="energyOptions"
              :placeholder="$t('listings.filter.energy')"
              value-key="value"
              label-key="label"
              @update:model-value="onFilterChange"
            />
          </div>

          <!-- Clear button -->
          <UButton
            v-if="hasActiveFilters"
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            :label="$t('listings.clearFilters')"
            @click="clearAll"
          />
        </div>
      </UCard>
    </div>

    <!-- Mobile: collapsible -->
    <div class="sm:hidden mb-4">
      <UButton
        block
        color="neutral"
        variant="outline"
        :icon="mobileOpen ? 'i-lucide-chevron-up' : 'i-lucide-sliders-horizontal'"
        :label="$t('listings.filters')"
        @click="mobileOpen = !mobileOpen"
      />
      <div v-if="mobileOpen" class="mt-2 space-y-2">
        <UInput
          v-model="localFilters.search"
          :placeholder="$t('listings.search')"
          icon="i-lucide-search"
          @update:model-value="onSearchInput"
        />
        <USelectMenu
          v-model="localFilters.species"
          :items="speciesOptions"
          :placeholder="$t('listings.filter.species')"
          value-key="value"
          label-key="label"
          @update:model-value="onFilterChange"
        />
        <USelectMenu
          v-model="localFilters.size"
          :items="sizeOptions"
          :placeholder="$t('listings.filter.size')"
          value-key="value"
          label-key="label"
          @update:model-value="onFilterChange"
        />
        <USelectMenu
          v-model="selectedAgeRange"
          :items="ageOptions"
          :placeholder="$t('listings.filter.age')"
          value-key="value"
          label-key="label"
          @update:model-value="onAgeChange"
        />
        <USelectMenu
          v-model="localFilters.energyLevel"
          :items="energyOptions"
          :placeholder="$t('listings.filter.energy')"
          value-key="value"
          label-key="label"
          @update:model-value="onFilterChange"
        />
        <UButton
          v-if="hasActiveFilters"
          block
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          :label="$t('listings.clearFilters')"
          @click="clearAll"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface FilterState {
  species?: string
  size?: string
  ageMin?: number
  ageMax?: number
  energyLevel?: string
  organization?: string
  search?: string
}

interface Species {
  id: string
  name: string
  slug: string
}

const props = defineProps<{
  modelValue: FilterState
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FilterState]
}>()

const config = useRuntimeConfig()
const mobileOpen = ref(false)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// Local copy to avoid mutation
const localFilters = reactive<FilterState>({ ...props.modelValue })

watch(() => props.modelValue, (val) => {
  Object.assign(localFilters, val)
})

// Species options (fetched once)
const { data: speciesList } = await useFetch<Species[]>('/species', {
  baseURL: config.public.apiUrl as string,
  default: () => [],
})

const speciesOptions = computed(() => [
  { label: 'Todas las especies', value: '' },
  ...(speciesList.value || []).map(s => ({ label: s.name, value: s.slug })),
])

const sizeOptions = [
  { label: 'Todos los tamanos', value: '' },
  { label: 'Pequeno', value: 'SMALL' },
  { label: 'Mediano', value: 'MEDIUM' },
  { label: 'Grande', value: 'LARGE' },
  { label: 'Extra grande', value: 'EXTRA_LARGE' },
]

const ageOptions = [
  { label: 'Todas las edades', value: '' },
  { label: 'Cachorro (0-12 meses)', value: '0-12' },
  { label: 'Joven (12-36 meses)', value: '12-36' },
  { label: 'Adulto (36-96 meses)', value: '36-96' },
  { label: 'Senior (96+ meses)', value: '96-' },
]

const energyOptions = [
  { label: 'Todos los niveles', value: '' },
  { label: 'Bajo', value: 'LOW' },
  { label: 'Medio', value: 'MEDIUM' },
  { label: 'Alto', value: 'HIGH' },
]

const selectedAgeRange = ref('')

const hasActiveFilters = computed(() =>
  !!(localFilters.species || localFilters.size || localFilters.energyLevel ||
    localFilters.search || localFilters.ageMin !== undefined || localFilters.ageMax !== undefined)
)

function onFilterChange() {
  emit('update:modelValue', { ...localFilters })
}

function onSearchInput(val: string) {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    if (!val || val.length >= 2 || val.length === 0) {
      localFilters.search = val || undefined
      emit('update:modelValue', { ...localFilters })
    }
  }, 300)
}

function onAgeChange(val: string) {
  if (!val) {
    localFilters.ageMin = undefined
    localFilters.ageMax = undefined
  } else {
    const parts = val.split('-')
    localFilters.ageMin = parts[0] ? parseInt(parts[0]) : undefined
    localFilters.ageMax = parts[1] ? parseInt(parts[1]) : undefined
  }
  emit('update:modelValue', { ...localFilters })
}

function clearAll() {
  localFilters.species = undefined
  localFilters.size = undefined
  localFilters.ageMin = undefined
  localFilters.ageMax = undefined
  localFilters.energyLevel = undefined
  localFilters.search = undefined
  selectedAgeRange.value = ''
  emit('update:modelValue', { ...localFilters })
}
</script>
