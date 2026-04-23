<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <template v-else-if="application">
      <!-- Back link -->
      <NuxtLink
        to="/org/dashboard/aplicaciones"
        class="text-sm text-gray-500 hover:text-primary inline-flex items-center gap-1 mb-6"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        {{ $t('applications.detail.backToQueue') }}
      </NuxtLink>

      <!-- Two-column layout -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Left column: application data (2/3 width) -->
        <div class="md:col-span-2 space-y-6">

          <!-- 1. Personal info -->
          <UCard>
            <template #header>
              <h3 class="font-semibold text-base">{{ $t('applications.detail.personalInfo') }}</h3>
            </template>
            <dl class="space-y-3">
              <div class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('auth.firstName') }} {{ $t('auth.lastName') }}</dt>
                <dd class="text-sm font-medium">{{ application.adopterFirstName }} {{ application.adopterLastName }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('auth.email') }}</dt>
                <dd class="text-sm">{{ application.adopterEmail }}</dd>
              </div>
              <div v-if="application.personalInfo?.phone" class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('applications.detail.phone') }}</dt>
                <dd class="text-sm">{{ application.personalInfo.phone }}</dd>
              </div>
              <div v-if="application.personalInfo?.occupation" class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('applications.detail.occupation') }}</dt>
                <dd class="text-sm">{{ application.personalInfo.occupation }}</dd>
              </div>
              <div v-if="application.personalInfo?.birthDate" class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('applications.detail.birthDate') }}</dt>
                <dd class="text-sm">{{ formatDate(application.personalInfo.birthDate) }}</dd>
              </div>
            </dl>
          </UCard>

          <!-- 2. Housing & cohabitation -->
          <UCard>
            <template #header>
              <h3 class="font-semibold text-base">{{ $t('applications.detail.housing') }}</h3>
            </template>
            <dl class="space-y-3">
              <div v-if="application.housing?.housingType" class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('applications.detail.housingType') }}</dt>
                <dd class="text-sm">{{ application.housing.housingType }}</dd>
              </div>
              <div v-if="application.housing?.ownership" class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('applications.detail.ownership') }}</dt>
                <dd class="text-sm">{{ application.housing.ownership }}</dd>
              </div>
              <div v-if="application.housing?.petPermission !== undefined" class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('applications.detail.petPermission') }}</dt>
                <dd class="text-sm">{{ application.housing.petPermission }}</dd>
              </div>
              <div v-if="application.housing?.exteriorSpace !== undefined" class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('applications.detail.exteriorSpace') }}</dt>
                <dd class="text-sm">{{ application.housing.exteriorSpace }}</dd>
              </div>
              <div v-if="application.housing?.adults !== undefined" class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('applications.detail.adults') }}</dt>
                <dd class="text-sm">{{ application.housing.adults }}</dd>
              </div>
              <div v-if="application.housing?.children !== undefined" class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('applications.detail.children') }}</dt>
                <dd class="text-sm">{{ application.housing.children }}</dd>
              </div>
              <div v-if="application.housing?.currentPets" class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('applications.detail.currentPets') }}</dt>
                <dd class="text-sm">
                  <span v-if="Array.isArray(application.housing.currentPets) && application.housing.currentPets.length">
                    {{ application.housing.currentPets.join(', ') }}
                  </span>
                  <span v-else class="text-gray-400 italic">{{ $t('applications.detail.noPets') }}</span>
                </dd>
              </div>
            </dl>
          </UCard>

          <!-- 3. Experience & lifestyle -->
          <UCard>
            <template #header>
              <h3 class="font-semibold text-base">{{ $t('applications.detail.lifestyle') }}</h3>
            </template>
            <dl class="space-y-3">
              <div v-if="application.lifestyle?.speciesExperience" class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('applications.detail.speciesExperience') }}</dt>
                <dd class="text-sm">{{ application.lifestyle.speciesExperience }}</dd>
              </div>
              <div v-if="application.lifestyle?.previousPets" class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('applications.detail.previousPets') }}</dt>
                <dd class="text-sm">{{ application.lifestyle.previousPets }}</dd>
              </div>
              <div v-if="application.lifestyle?.hoursAlone !== undefined" class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('applications.detail.hoursAlone') }}</dt>
                <dd class="text-sm">{{ application.lifestyle.hoursAlone }}h</dd>
              </div>
              <div v-if="application.lifestyle?.activityLevel" class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('applications.detail.activityLevel') }}</dt>
                <dd class="text-sm">{{ application.lifestyle.activityLevel }}</dd>
              </div>
              <div v-if="application.lifestyle?.adoptionReason" class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('applications.detail.adoptionReason') }}</dt>
                <dd class="text-sm">{{ application.lifestyle.adoptionReason }}</dd>
              </div>
            </dl>
          </UCard>

          <!-- 4. Home photos -->
          <UCard>
            <template #header>
              <h3 class="font-semibold text-base">{{ $t('applications.detail.photos') }}</h3>
            </template>
            <div v-if="application.photos && application.photos.length" class="grid grid-cols-2 gap-3">
              <button
                v-for="(photo, idx) in application.photos"
                :key="photo.id"
                class="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 cursor-pointer"
                @click="openLightbox(idx)"
              >
                <img
                  :src="photo.url"
                  :alt="`Foto del hogar ${idx + 1}`"
                  class="w-full h-full object-cover hover:opacity-90 transition-opacity"
                />
              </button>
            </div>
            <div v-else class="text-center py-8 text-gray-400 text-sm">
              <UIcon name="i-lucide-image-off" class="w-8 h-8 mx-auto mb-2" />
              Sin fotos
            </div>
          </UCard>

          <!-- 5. Additional info (only if present) -->
          <UCard
            v-if="application.socialMedia || application.additionalContext"
          >
            <template #header>
              <h3 class="font-semibold text-base">{{ $t('applications.detail.additionalInfo') }}</h3>
            </template>
            <dl class="space-y-3">
              <div v-if="application.socialMedia" class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('applications.detail.socialMedia') }}</dt>
                <dd class="text-sm">
                  <a :href="application.socialMedia" target="_blank" rel="noopener" class="text-primary hover:underline">
                    {{ application.socialMedia }}
                  </a>
                </dd>
              </div>
              <div v-if="application.additionalContext" class="flex gap-2">
                <dt class="text-sm text-gray-500 w-40 shrink-0">{{ $t('applications.detail.additionalContext') }}</dt>
                <dd class="text-sm">{{ application.additionalContext }}</dd>
              </div>
            </dl>
          </UCard>
        </div>

        <!-- Right column: score + flags + status + notes + animal (1/3 width) -->
        <div class="space-y-6">

          <!-- 1. Red flags (always visible above score when present) -->
          <RedFlagsAlert
            v-if="application.scoreDetails?.redFlags?.length"
            :red-flags="application.scoreDetails.redFlags"
          />

          <!-- 2. Score panel -->
          <ScorePanel
            :score="application.score"
            :score-details="application.scoreDetails"
            :application-id="application.id"
            @rescored="onRescored"
          />

          <!-- 3. Status panel -->
          <UCard>
            <template #header>
              <h3 class="font-semibold text-base">{{ $t('applications.detail.statusPanel') }}</h3>
            </template>
            <div class="space-y-4">
              <!-- Current status badge -->
              <div class="flex items-center gap-2">
                <ApplicationStatusBadge :status="application.status" />
              </div>

              <USeparator />

              <!-- Transition buttons -->
              <div v-if="allowedTransitions.length" class="space-y-2">
                <UButton
                  v-for="transition in allowedTransitions"
                  :key="transition.status"
                  :color="transition.color as any"
                  block
                  @click="openConfirmModal(transition)"
                >
                  {{ transition.label }}
                </UButton>
              </div>
              <p v-else class="text-sm text-gray-400 italic text-center py-2">
                Sin acciones disponibles
              </p>
            </div>
          </UCard>

          <!-- 4. Applicant history summary -->
          <ApplicantHistorySummary
            v-if="application.userId"
            :user-id="application.userId"
          />

          <!-- 5. Internal notes -->
          <InternalNotes :application-id="application.id" />

          <!-- 6. Animal summary -->
          <UCard v-if="application.animal">
            <template #header>
              <h3 class="font-semibold text-base">{{ $t('applications.detail.animalSummary') }}</h3>
            </template>
            <div class="space-y-3">
              <img
                v-if="application.animal.coverPhotoUrl"
                :src="application.animal.coverPhotoUrl"
                :alt="application.animal.name"
                class="w-full aspect-[4/3] object-cover rounded-lg"
              />
              <div>
                <NuxtLink
                  :to="`/animales/${application.animalId}`"
                  class="font-medium hover:text-primary transition-colors"
                >
                  {{ application.animal.name }}
                </NuxtLink>
                <p v-if="application.animal.species?.name" class="text-sm text-gray-500">
                  {{ application.animal.species.name }}
                </p>
              </div>
              <StatusBadge v-if="application.animal.status" :status="application.animal.status" />
            </div>
          </UCard>
        </div>
      </div>
    </template>

    <!-- Lightbox -->
    <Teleport to="body">
      <div
        v-if="lightboxOpen"
        class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
        @click.self="lightboxOpen = false"
      >
        <button
          class="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          @click="lightboxOpen = false"
        >
          <UIcon name="i-lucide-x" class="w-8 h-8" />
        </button>

        <button
          v-if="(application?.photos?.length ?? 0) > 1"
          class="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
          @click="lightboxIndex = (lightboxIndex - 1 + (application?.photos?.length ?? 1)) % (application?.photos?.length ?? 1)"
        >
          <UIcon name="i-lucide-chevron-left" class="w-10 h-10" />
        </button>

        <img
          v-if="application?.photos?.[lightboxIndex]"
          :src="application?.photos?.[lightboxIndex]?.url"
          alt="Foto del hogar"
          class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
        />

        <button
          v-if="(application?.photos?.length ?? 0) > 1"
          class="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
          @click="lightboxIndex = (lightboxIndex + 1) % (application?.photos?.length ?? 1)"
        >
          <UIcon name="i-lucide-chevron-right" class="w-10 h-10" />
        </button>
      </div>
    </Teleport>

    <!-- Status transition confirmation modal -->
    <UModal v-model:open="showConfirmModal">
      <template #header>
        <h3 class="font-semibold">{{ $t('applications.transitions.confirmTitle') }}</h3>
      </template>
      <template #body>
        <p>
          {{ $t('applications.transitions.confirmBody', { status: pendingTransition?.label ?? '' }) }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton variant="ghost" :label="$t('common.cancel')" @click="showConfirmModal = false" />
          <UButton
            :color="(pendingTransition?.color as any) ?? 'primary'"
            :label="$t('common.confirm')"
            :loading="transitionLoading"
            @click="executeTransition"
          />
        </div>
      </template>
    </UModal>
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

type AnimalStatus = 'AVAILABLE' | 'IN_PROCESS' | 'ADOPTED' | 'ARCHIVED'

interface ApplicationPhoto {
  id: string
  url: string
}

interface ApplicationAnimal {
  id: string
  name: string
  coverPhotoUrl: string | null
  status: AnimalStatus
  species: { name: string } | null
}

interface ScoringResult {
  total: number
  riskLevel: string
  categories: Array<{
    name: string
    label: string
    points: number
    maxPoints: number
    notes?: string[]
  }>
  redFlags: Array<{
    severity: string
    code: string
    message: string
  }>
  overridden: boolean
}

interface Application {
  id: string
  animalId: string
  adopterFirstName: string
  adopterLastName: string
  adopterEmail: string
  status: ApplicationStatus
  submittedAt: string
  personalInfo: Record<string, any> | null
  housing: Record<string, any> | null
  lifestyle: Record<string, any> | null
  socialMedia: string | null
  additionalContext: string | null
  score: number | null
  scoreDetails: ScoringResult | null
  userId: string
  photos: ApplicationPhoto[]
  animal: ApplicationAnimal | null
}

interface Transition {
  status: ApplicationStatus
  label: string
  color: string
}

const { t } = useI18n()
const { get, patch } = useApi()
const toast = useToast()
const route = useRoute()

const application = ref<Application | null>(null)
const loading = ref(true)
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)
const showConfirmModal = ref(false)
const pendingTransition = ref<Transition | null>(null)
const transitionLoading = ref(false)

const staffTransitions: Record<string, Transition[]> = {
  ENVIADA: [
    { status: 'REVISANDO', label: t('applications.transitions.reviewing'), color: 'info' },
  ],
  REVISANDO: [
    { status: 'APROBADA', label: t('applications.transitions.approve'), color: 'success' },
    { status: 'RECHAZADA', label: t('applications.transitions.reject'), color: 'error' },
    { status: 'SEGUIMIENTO', label: t('applications.transitions.followUp'), color: 'warning' },
  ],
  SEGUIMIENTO: [
    { status: 'APROBADA', label: t('applications.transitions.approve'), color: 'success' },
    { status: 'RECHAZADA', label: t('applications.transitions.reject'), color: 'error' },
  ],
  APROBADA: [
    { status: 'ADOPTADA', label: t('applications.transitions.confirmAdoption'), color: 'success' },
  ],
  ADOPTADA: [
    { status: 'DEVUELTA', label: t('applications.transitions.devuelta'), color: 'error' },
  ],
}

const allowedTransitions = computed<Transition[]>(() => {
  if (!application.value) return []
  return staffTransitions[application.value.status] ?? []
})

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-SV', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function openLightbox(idx: number) {
  lightboxIndex.value = idx
  lightboxOpen.value = true
}

function openConfirmModal(transition: Transition) {
  pendingTransition.value = transition
  showConfirmModal.value = true
}

function onRescored(score: number, scoreDetails: ScoringResult) {
  if (!application.value) return
  application.value.score = score
  application.value.scoreDetails = scoreDetails
}

async function executeTransition() {
  if (!application.value || !pendingTransition.value) return
  transitionLoading.value = true
  try {
    const updated = await patch<Application>(
      `/applications/${application.value.id}/status`,
      { status: pendingTransition.value.status },
    )
    application.value.status = updated.status
    showConfirmModal.value = false
    toast.add({ title: t('common.success'), color: 'success' })
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  } finally {
    transitionLoading.value = false
  }
}

async function loadApplication() {
  loading.value = true
  try {
    const id = route.params.id as string
    application.value = await get<Application>(`/applications/org/${id}`)
  } catch {
    toast.add({ title: t('applications.detail.notFound'), color: 'error' })
    await navigateTo('/org/dashboard/aplicaciones')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadApplication()
})
</script>
