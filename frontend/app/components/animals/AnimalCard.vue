<template>
  <NuxtLink
    :to="`/animales/${animal.id}`"
    class="block group"
    :class="mode === 'list' ? 'list-card' : 'grid-card'"
  >
    <!-- Grid Mode -->
    <UCard
      v-if="mode === 'grid'"
      class="overflow-hidden transition-shadow hover:shadow-lg h-full"
    >
      <!-- Cover Photo -->
      <template #header>
        <div class="aspect-[4/3] overflow-hidden bg-amber-50 relative -mx-4 -mt-4">
          <img
            v-if="coverPhoto"
            :src="coverPhoto.url"
            :alt="animal.name"
            class="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <UIcon name="i-lucide-paw-print" class="w-16 h-16 text-amber-300" />
          </div>
          <!-- Species badge -->
          <div class="absolute top-2 left-2">
            <UBadge color="primary" variant="solid" size="sm">
              {{ animal.species.name }}
            </UBadge>
          </div>
        </div>
      </template>

      <div class="space-y-2">
        <!-- Name and breed -->
        <div>
          <h3 class="font-bold text-base text-gray-900 dark:text-white group-hover:text-primary transition-colors">
            {{ animal.name }}
          </h3>
          <p v-if="animal.breed" class="text-sm text-gray-500">{{ animal.breed }}</p>
        </div>

        <!-- Age, size, energy -->
        <div class="flex flex-wrap gap-1 text-xs text-gray-600 dark:text-gray-400">
          <span v-if="animal.ageMonths !== null" class="flex items-center gap-1">
            <UIcon name="i-lucide-calendar" class="w-3 h-3" />
            {{ formatAge(animal.ageMonths) }}
          </span>
          <span v-if="animal.size" class="flex items-center gap-1">
            <UIcon name="i-lucide-ruler" class="w-3 h-3" />
            {{ $t(`animals.form.size.${sizeKey(animal.size)}`) }}
          </span>
        </div>

        <!-- Compatibility badges -->
        <div class="flex flex-wrap gap-1">
          <UBadge v-if="animal.goodWithKids" color="success" variant="soft" size="xs">
            <UIcon name="i-lucide-baby" class="w-3 h-3 mr-1" />{{ $t('listings.compat.kids') }}
          </UBadge>
          <UBadge v-if="animal.goodWithDogs" color="success" variant="soft" size="xs">
            <UIcon name="i-lucide-dog" class="w-3 h-3 mr-1" />{{ $t('listings.compat.dogs') }}
          </UBadge>
          <UBadge v-if="animal.goodWithCats" color="success" variant="soft" size="xs">
            <UIcon name="i-lucide-cat" class="w-3 h-3 mr-1" />{{ $t('listings.compat.cats') }}
          </UBadge>
        </div>

        <!-- Health badges -->
        <div class="flex flex-wrap gap-1">
          <UBadge v-if="animal.vaccinated" color="info" variant="soft" size="xs">
            <UIcon name="i-lucide-shield-check" class="w-3 h-3 mr-1" />{{ $t('listings.health.vaccinated') }}
          </UBadge>
          <UBadge v-if="animal.sterilized" color="info" variant="soft" size="xs">
            <UIcon name="i-lucide-check-circle" class="w-3 h-3 mr-1" />{{ $t('listings.health.sterilized') }}
          </UBadge>
        </div>

        <!-- Org name -->
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {{ animal.organization.name }}
        </p>
      </div>
    </UCard>

    <!-- List Mode -->
    <div
      v-else
      class="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      <!-- Thumbnail -->
      <div class="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-amber-50">
        <img
          v-if="coverPhoto"
          :src="coverPhoto.url"
          :alt="animal.name"
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full flex items-center justify-center">
          <UIcon name="i-lucide-paw-print" class="w-8 h-8 text-amber-300" />
        </div>
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-bold text-sm text-gray-900 dark:text-white group-hover:text-primary transition-colors truncate">
            {{ animal.name }}
          </h3>
          <UBadge color="primary" variant="soft" size="sm" class="flex-shrink-0">
            {{ animal.species.name }}
          </UBadge>
        </div>
        <p v-if="animal.breed" class="text-xs text-gray-500 mt-0.5">{{ animal.breed }}</p>
        <div class="flex flex-wrap gap-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
          <span v-if="animal.ageMonths !== null">{{ formatAge(animal.ageMonths) }}</span>
          <span v-if="animal.size">{{ $t(`animals.form.size.${sizeKey(animal.size)}`) }}</span>
          <span class="text-gray-400">{{ animal.organization.name }}</span>
        </div>
      </div>
    </div>
  </NuxtLink>
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
  animal: AnimalPublic
  mode: 'grid' | 'list'
}>()

const coverPhoto = computed(() => {
  if (!props.animal.photos || props.animal.photos.length === 0) return null
  if (props.animal.coverPhotoId) {
    return props.animal.photos.find(p => p.id === props.animal.coverPhotoId) || props.animal.photos[0]
  }
  return props.animal.photos[0]
})

function formatAge(months: number): string {
  if (months === 0) return 'Recien nacido'
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (rem === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`
  return `${years}a ${rem}m`
}

function sizeKey(size: string): string {
  const map: Record<string, string> = {
    SMALL: 'small',
    MEDIUM: 'medium',
    LARGE: 'large',
    EXTRA_LARGE: 'extraLarge',
  }
  return map[size] || size.toLowerCase()
}
</script>
