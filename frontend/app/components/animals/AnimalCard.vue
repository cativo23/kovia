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
            <KIcon name="paw-print" :size="64" class="text-amber-300" />
          </div>
          <!-- Species badge -->
          <div class="absolute top-2 left-2">
            <UBadge v-if="animal.species" color="primary" variant="solid" size="sm">
              {{ animal.species.name }}
            </UBadge>
          </div>
        </div>
      </template>

      <div class="space-y-2">
        <!-- Name and breed -->
        <div>
          <h3 class="font-bold text-base text-[--color-text] group-hover:text-primary transition-colors">
            {{ animal.name }}
          </h3>
          <p v-if="animal.breed" class="text-sm text-gray-500">{{ animal.breed }}</p>
        </div>

        <!-- Categorical guidance pill (D-19, server-resolved) -->
        <GuidancePill
          v-if="animal.guidance"
          :guidance="animal.guidance"
          variant="card"
          size="sm"
        />

        <!-- Age, size, energy -->
        <div class="flex flex-wrap gap-1 text-xs text-[--color-text]/70">
          <span v-if="animal.ageMonths !== null" class="flex items-center gap-1">
            <KIcon name="calendar" :size="12" />
            {{ formatAge(animal.ageMonths) }}
          </span>
          <span v-if="animal.size" class="flex items-center gap-1">
            <KIcon name="ruler" :size="12" />
            {{ $t(`animals.form.sizeOptions.${sizeKey(animal.size)}`) }}
          </span>
        </div>

        <!-- Compatibility badges -->
        <div class="flex flex-wrap gap-1">
          <UBadge v-if="animal.goodWithKids" color="success" variant="soft" size="xs">
            <KIcon name="baby" :size="12" class="mr-1" />{{ $t('listings.compat.kids') }}
          </UBadge>
          <UBadge v-if="animal.goodWithDogs" color="success" variant="soft" size="xs">
            <KIcon name="dog" :size="12" class="mr-1" />{{ $t('listings.compat.dogs') }}
          </UBadge>
          <UBadge v-if="animal.goodWithCats" color="success" variant="soft" size="xs">
            <KIcon name="cat" :size="12" class="mr-1" />{{ $t('listings.compat.cats') }}
          </UBadge>
        </div>

        <!-- Health badges -->
        <div class="flex flex-wrap gap-1">
          <UBadge v-if="animal.vaccinated" color="info" variant="soft" size="xs">
            <KIcon name="shield-check" :size="12" class="mr-1" />{{ $t('listings.health.vaccinated') }}
          </UBadge>
          <UBadge v-if="animal.sterilized" color="info" variant="soft" size="xs">
            <KIcon name="check-circle" :size="12" class="mr-1" />{{ $t('listings.health.sterilized') }}
          </UBadge>
        </div>

        <!-- Org name -->
        <p v-if="animal.organization" class="text-xs text-[--color-text-muted] mt-1">
          {{ animal.organization.name }}
        </p>
      </div>
    </UCard>

    <!-- List Mode -->
    <div
      v-else
      class="flex items-center gap-4 p-3 rounded-lg border border-[--color-border] hover:bg-[--color-border]/40 transition-colors"
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
          <KIcon name="paw-print" :size="32" class="text-amber-300" />
        </div>
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-bold text-sm text-[--color-text] group-hover:text-primary transition-colors truncate">
            {{ animal.name }}
          </h3>
          <UBadge v-if="animal.species" color="primary" variant="soft" size="sm" class="flex-shrink-0">
            {{ animal.species.name }}
          </UBadge>
        </div>
        <GuidancePill
          v-if="animal.guidance"
          :guidance="animal.guidance"
          variant="card"
          size="sm"
          class="mt-1"
        />
        <p v-if="animal.breed" class="text-xs text-gray-500 mt-0.5">{{ animal.breed }}</p>
        <div class="flex flex-wrap gap-2 mt-1 text-xs text-[--color-text]/70">
          <span v-if="animal.ageMonths !== null">{{ formatAge(animal.ageMonths) }}</span>
          <span v-if="animal.size">{{ $t(`animals.form.sizeOptions.${sizeKey(animal.size)}`) }}</span>
          <span v-if="animal.organization" class="text-gray-400">{{ animal.organization.name }}</span>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import GuidancePill from '~/components/animals/GuidancePill.vue'
import type { AnimalPublic } from '~/types/public-animal'

/**
 * Phase 15-05 — Card now consumes the public DTO shape (D-04 / D-16).
 *
 * `animal` is typed as `AnimalPublic` (shared types file), which is the
 * structurally-narrow LISTING shape returned by GET /public/animals.
 * It carries `guidance` server-resolved (D-04).
 *
 * Some legacy admin-side fields (description, goodWithKids/Dogs/Cats,
 * vaccinated, sterilized, coverPhotoId, …) are NOT on the public DTO.
 * Templates below use them defensively via `v-if`, so when the card is
 * rendered from public data the legacy badges simply hide. This keeps
 * the card reusable on both public and (future) refugio-admin surfaces
 * without forking the component.
 *
 * The intersection type below documents that contract: `AnimalPublic` is
 * the source-of-truth shape; legacy fields are typed Partial so reading
 * them is safe but they have no required source on the public surface.
 */
type LegacyAnimalFields = Partial<{
  description: string | null
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
}>

type Animal = AnimalPublic & LegacyAnimalFields

const props = defineProps<{
  animal: Animal
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
