<template>
  <div>
    <!-- Header row: result count + view toggle -->
    <div class="flex items-center justify-between mb-4">
      <p class="text-sm text-gray-600 dark:text-gray-400">
        <span v-if="total !== undefined">
          {{ total }} {{ total === 1 ? $t('listings.resultSingle') : $t('listings.results') }}
        </span>
        <span v-else>{{ animals.length }} {{ animals.length === 1 ? $t('listings.resultSingle') : $t('listings.results') }}</span>
      </p>
      <div class="flex items-center gap-1">
        <UButton
          :variant="localViewMode === 'grid' ? 'solid' : 'ghost'"
          color="neutral"
          size="sm"
          icon="i-lucide-layout-grid"
          :title="$t('listings.viewGrid')"
          @click="setMode('grid')"
        />
        <UButton
          :variant="localViewMode === 'list' ? 'solid' : 'ghost'"
          color="neutral"
          size="sm"
          icon="i-lucide-list"
          :title="$t('listings.viewList')"
          @click="setMode('list')"
        />
      </div>
    </div>

    <!-- Grid mode -->
    <div
      v-if="localViewMode === 'grid'"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      <AnimalCard
        v-for="animal in animals"
        :key="animal.id"
        :animal="animal"
        mode="grid"
      />
    </div>

    <!-- List mode -->
    <div v-else class="flex flex-col gap-2">
      <AnimalCard
        v-for="animal in animals"
        :key="animal.id"
        :animal="animal"
        mode="list"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface AnimalPhoto {
  id: string
  url: string
  caption: string | null
  position: number
}

interface AnimalPublic {
  id: string
  name: string
  description: string | null
  breed: string | null
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN'
  ageMonths: number | null
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE' | null
  energyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null
  goodWithKids: boolean
  goodWithDogs: boolean
  goodWithCats: boolean
  goodWithOtherPets: boolean
  specialNeeds: string | null
  vaccinated: boolean
  sterilized: boolean
  trained: boolean
  status: string
  coverPhotoId: string | null
  createdAt: string
  species: { id: string; name: string; slug: string }
  organization: { name: string; slug: string; logoUrl: string | null }
  photos: AnimalPhoto[]
}

const props = defineProps<{
  animals: AnimalPublic[]
  viewMode?: 'grid' | 'list'
  total?: number
}>()

const emit = defineEmits<{
  'update:viewMode': [value: 'grid' | 'list']
}>()

const localViewMode = ref<'grid' | 'list'>(props.viewMode || 'grid')

watch(() => props.viewMode, (val) => {
  if (val) localViewMode.value = val
})

function setMode(mode: 'grid' | 'list') {
  localViewMode.value = mode
  emit('update:viewMode', mode)
}
</script>
