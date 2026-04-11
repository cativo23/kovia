<template>
  <div>
    <!-- Not found -->
    <UCard v-if="!animal" class="text-center py-12">
      <UIcon name="i-lucide-paw-print" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h2 class="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
        {{ $t('detail.notFound') }}
      </h2>
      <p class="text-gray-500 mb-6">{{ $t('detail.notFoundMessage') }}</p>
      <UButton to="/animales" variant="outline" icon="i-lucide-arrow-left" :label="$t('detail.breadcrumb')" />
    </UCard>

    <!-- Animal detail -->
    <div v-else>
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <NuxtLink to="/animales" class="hover:text-primary transition-colors">
          {{ $t('detail.breadcrumb') }}
        </NuxtLink>
        <UIcon name="i-lucide-chevron-right" class="w-4 h-4" />
        <span class="text-gray-900 dark:text-white font-medium">{{ animal.name }}</span>
      </nav>

      <!-- Two-column layout -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <!-- Photo gallery (left ~60%) -->
        <div class="lg:col-span-3">
          <PhotoGallery
            :photos="animal.photos"
            :animal-name="animal.name"
          />
        </div>

        <!-- Info sidebar (right ~40%) -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Name and species -->
          <div>
            <div class="flex items-start justify-between gap-3">
              <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                {{ animal.name }}
              </h1>
              <UBadge color="success" variant="solid" size="md" class="mt-1 flex-shrink-0">
                {{ $t('animals.status.available') }}
              </UBadge>
            </div>
            <div class="flex flex-wrap gap-2 mt-2">
              <UBadge color="primary" variant="soft">{{ animal.species.name }}</UBadge>
              <UBadge v-if="animal.breed" color="neutral" variant="soft">{{ animal.breed }}</UBadge>
            </div>
          </div>

          <!-- Basic info -->
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div v-if="animal.ageMonths !== null" class="flex items-center gap-2">
              <UIcon name="i-lucide-calendar" class="w-4 h-4 text-gray-400" />
              <span>{{ formatAge(animal.ageMonths) }}</span>
            </div>
            <div v-if="animal.size" class="flex items-center gap-2">
              <UIcon name="i-lucide-ruler" class="w-4 h-4 text-gray-400" />
              <span>{{ $t(`animals.form.size.${sizeKey(animal.size)}`) }}</span>
            </div>
            <div v-if="animal.gender" class="flex items-center gap-2">
              <UIcon name="i-lucide-user" class="w-4 h-4 text-gray-400" />
              <span>{{ $t(`animals.form.gender.${animal.gender.toLowerCase()}`) }}</span>
            </div>
            <div v-if="animal.energyLevel" class="flex items-center gap-2">
              <UIcon name="i-lucide-zap" class="w-4 h-4 text-gray-400" />
              <span>{{ $t(`animals.form.energy.${animal.energyLevel.toLowerCase()}`) }}</span>
            </div>
          </div>

          <!-- Description -->
          <div v-if="animal.description">
            <p class="text-gray-600 dark:text-gray-300 leading-relaxed">{{ animal.description }}</p>
          </div>

          <UDivider />

          <!-- Compatibility -->
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-3">
              {{ $t('detail.compatibility') }}
            </h3>
            <div class="flex flex-wrap gap-2">
              <UBadge v-if="animal.goodWithKids" color="success" variant="soft">
                <UIcon name="i-lucide-baby" class="w-3 h-3 mr-1" />
                {{ $t('listings.compat.kids') }}
              </UBadge>
              <UBadge v-if="animal.goodWithDogs" color="success" variant="soft">
                <UIcon name="i-lucide-dog" class="w-3 h-3 mr-1" />
                {{ $t('listings.compat.dogs') }}
              </UBadge>
              <UBadge v-if="animal.goodWithCats" color="success" variant="soft">
                <UIcon name="i-lucide-cat" class="w-3 h-3 mr-1" />
                {{ $t('listings.compat.cats') }}
              </UBadge>
              <UBadge v-if="animal.goodWithOtherPets" color="success" variant="soft">
                <UIcon name="i-lucide-paw-print" class="w-3 h-3 mr-1" />
                {{ $t('listings.compat.pets') }}
              </UBadge>
              <span
                v-if="!animal.goodWithKids && !animal.goodWithDogs && !animal.goodWithCats && !animal.goodWithOtherPets"
                class="text-sm text-gray-400"
              >
                Sin informacion de compatibilidad
              </span>
            </div>
          </div>

          <!-- Health -->
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-3">
              {{ $t('detail.health') }}
            </h3>
            <div class="flex flex-wrap gap-2">
              <UBadge v-if="animal.vaccinated" color="info" variant="soft">
                <UIcon name="i-lucide-shield-check" class="w-3 h-3 mr-1" />
                {{ $t('listings.health.vaccinated') }}
              </UBadge>
              <UBadge v-if="animal.sterilized" color="info" variant="soft">
                <UIcon name="i-lucide-check-circle" class="w-3 h-3 mr-1" />
                {{ $t('listings.health.sterilized') }}
              </UBadge>
              <UBadge v-if="animal.trained" color="info" variant="soft">
                <UIcon name="i-lucide-graduation-cap" class="w-3 h-3 mr-1" />
                {{ $t('listings.health.trained') }}
              </UBadge>
            </div>
          </div>

          <!-- Special needs -->
          <div v-if="animal.specialNeeds">
            <h3 class="font-semibold text-gray-900 dark:text-white mb-2">
              {{ $t('detail.specialNeeds') }}
            </h3>
            <UAlert color="warning" variant="soft" :description="animal.specialNeeds" />
          </div>

          <UDivider />

          <!-- Organization -->
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-3">
              {{ $t('detail.organization') }}
            </h3>
            <NuxtLink
              :to="`/org/${animal.organization.slug}`"
              class="flex items-center gap-3 group"
            >
              <div class="w-12 h-12 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
                <img
                  v-if="animal.organization.logoUrl"
                  :src="animal.organization.logoUrl"
                  :alt="animal.organization.name"
                  class="w-full h-full object-cover"
                />
                <UIcon v-else name="i-lucide-building-2" class="w-6 h-6 text-primary" />
              </div>
              <span class="font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                {{ animal.organization.name }}
              </span>
              <UIcon name="i-lucide-arrow-right" class="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors ml-auto" />
            </NuxtLink>
          </div>

          <!-- CTA button — 4 states per D-12/D-13 -->
          <!-- State 1: Animal not AVAILABLE -->
          <UTooltip v-if="animal.status !== 'AVAILABLE'" :text="$t('applications.notAvailableTooltip')">
            <UButton
              block
              size="xl"
              disabled
              icon="i-lucide-heart"
              :label="$t('applications.applyButton')"
            />
          </UTooltip>

          <!-- State 2: Unauthenticated -->
          <UButton
            v-else-if="!authStore.isAuthenticated"
            block
            size="xl"
            icon="i-lucide-heart"
            :label="$t('applications.applyButton')"
            @click="showAuthModal = true"
          />

          <!-- State 3: Authenticated, application exists -->
          <UButton
            v-else-if="existingApplication"
            block
            size="xl"
            variant="outline"
            icon="i-lucide-clipboard-list"
            :label="$t('applications.viewApplication')"
            :to="`/perfil/aplicaciones/${existingApplication.applicationId}`"
          />

          <!-- State 4: Authenticated, no existing application -->
          <UButton
            v-else
            block
            size="xl"
            icon="i-lucide-heart"
            :label="$t('applications.applyButton')"
            :to="`/animales/${animal.id}/aplicar`"
          />
        </div>
      </div>
    </div>

    <!-- Auth Gate Modal -->
    <ApplicationsApplicationAuthModal
      v-if="animal"
      v-model="showAuthModal"
      :animal-id="String(route.params.id)"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const { get } = useApi()

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

const { data: animal } = await useFetch<AnimalPublic>(`/animals/${route.params.id}`, {
  baseURL: config.public.apiUrl as string,
}).catch(() => ({ data: ref(null) }))

// Auth gate modal state
const showAuthModal = ref(false)
const existingApplication = ref<{ exists: boolean; applicationId?: string } | null>(null)

// OG meta tags — critical for social sharing
useSeoMeta({
  title: () => animal.value ? `${animal.value.name} - Adopcion | Kovia` : 'Animal | Kovia',
  ogTitle: () => animal.value?.name || 'Animal en adopcion',
  description: () => animal.value?.description || `Conoce a ${animal.value?.name}, disponible para adopcion en Kovia`,
  ogDescription: () => animal.value?.description || `Conoce a ${animal.value?.name}, disponible para adopcion en Kovia`,
  ogImage: () => animal.value?.photos?.[0]?.url || '/og-default.png',
  ogType: 'article',
  twitterCard: 'summary_large_image',
})

// Client-side: check for existing application if authenticated
onMounted(async () => {
  if (authStore.isAuthenticated && animal.value) {
    try {
      const check = await get<{ exists: boolean; applicationId?: string }>(
        `/applications/check?animalId=${route.params.id}`
      )
      existingApplication.value = check
    } catch {
      // Silent: no existing application or auth issue
    }
  }
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
