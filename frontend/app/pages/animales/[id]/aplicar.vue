<template>
  <div class="max-w-3xl mx-auto">
    <!-- Success State -->
    <div v-if="submitted" class="text-center py-16">
      <UIcon name="i-lucide-circle-check-big" class="w-16 h-16 text-success mx-auto mb-4" />
      <h1 class="text-2xl font-bold mb-2">{{ $t('applications.success.heading') }}</h1>
      <p class="text-base text-gray-500 mb-6">{{ $t('applications.success.body') }}</p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <UButton :label="$t('applications.success.viewApplications')" to="/perfil/aplicaciones" />
        <UButton variant="outline" :label="$t('applications.success.backToAnimal')" :to="`/animales/${animalId}`" />
      </div>
    </div>

    <!-- Wizard -->
    <template v-else>
      <!-- Header -->
      <div class="mb-6">
        <NuxtLink
          :to="`/animales/${animalId}`"
          class="text-sm text-gray-500 hover:text-primary inline-flex items-center gap-1 mb-2"
        >
          <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
          {{ $t('detail.breadcrumb') }}
        </NuxtLink>
        <h2 class="text-2xl font-bold">{{ $t('detail.apply') }}</h2>
        <p v-if="animal" class="text-base text-gray-500">{{ animal.name }}</p>
      </div>

      <!-- Draft Alert -->
      <UAlert
        v-if="showDraftAlert"
        class="mb-6"
        variant="soft"
        color="info"
        :title="$t('applications.draft.alert')"
      >
        <template #actions>
          <div class="flex gap-2 mt-2">
            <UButton
              size="sm"
              :label="$t('applications.draft.continue')"
              @click="restoreDraft"
            />
            <UButton
              size="sm"
              variant="ghost"
              :label="$t('applications.draft.dismiss')"
              @click="showDraftAlert = false"
            />
          </div>
        </template>
      </UAlert>

      <!-- Step Indicator -->
      <div class="flex items-center gap-2 mb-8">
        <div
          v-for="(step, index) in steps"
          :key="index"
          class="flex items-center gap-2"
          :class="{ 'flex-1': index < steps.length - 1 }"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
            :class="[
              currentStep > index
                ? 'bg-primary text-white'
                : currentStep === index
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
            ]"
          >
            <UIcon v-if="currentStep > index" name="i-lucide-check" class="w-4 h-4" />
            <span v-else>{{ index + 1 }}</span>
          </div>
          <span
            class="text-sm hidden sm:inline"
            :class="currentStep >= index ? 'text-primary font-medium' : 'text-gray-500'"
          >
            {{ step.label }}
          </span>
          <div
            v-if="index < steps.length - 1"
            class="flex-1 h-0.5 mx-2"
            :class="currentStep > index ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'"
          />
        </div>
      </div>

      <!-- Draft Saved Indicator -->
      <div v-if="lastSavedAt" class="text-xs text-gray-400 flex items-center gap-1 mb-2">
        <UIcon name="i-lucide-save" class="w-3 h-3" />
        {{ $t('applications.draft.saved') }} {{ formattedSaveTime }}
      </div>

      <!-- Step Content -->
      <UCard>
        <div v-show="currentStep === 0">
          <ApplicationStepPersonal ref="stepPersonalRef" />
        </div>
        <div v-show="currentStep === 1">
          <ApplicationStepHousing ref="stepHousingRef" />
        </div>
        <div v-show="currentStep === 2">
          <ApplicationStepLifestyle ref="stepLifestyleRef" />
        </div>
        <div v-show="currentStep === 3">
          <ApplicationStepPhotos ref="stepPhotosRef" />
        </div>
        <div v-show="currentStep === 4">
          <ApplicationStepReview
            ref="stepReviewRef"
            :personal-data="savedStepData[0]"
            :housing-data="savedStepData[1]"
            :lifestyle-data="savedStepData[2]"
            :photos="savedStepData[3]?.photos"
            @go-to-step="goToStep"
          />
        </div>

        <!-- Navigation -->
        <div class="flex justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
          <UButton
            v-if="currentStep > 0"
            variant="outline"
            icon="i-lucide-arrow-left"
            :label="$t('applications.wizard.prev')"
            @click="prevStep"
          />
          <div v-else />

          <UButton
            v-if="currentStep < steps.length - 1"
            trailing-icon="i-lucide-arrow-right"
            :label="$t('applications.wizard.next')"
            @click="nextStep"
          />
          <UButton
            v-else
            icon="i-lucide-send"
            :label="$t('applications.wizard.submit')"
            :loading="submitting"
            @click="submitApplication"
          />
        </div>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const { t } = useI18n()
const route = useRoute()
const { get, post } = useApi()
const toast = useToast()
const authStore = useAuthStore()
const config = useRuntimeConfig()

const animalId = computed(() => route.params.id as string)

// Step refs
const stepPersonalRef = ref<any>(null)
const stepHousingRef = ref<any>(null)
const stepLifestyleRef = ref<any>(null)
const stepPhotosRef = ref<any>(null)
const stepReviewRef = ref<any>(null)

const currentStep = ref(0)
const submitting = ref(false)
const submitted = ref(false)
const showDraftAlert = ref(false)
const lastSavedAt = ref<number | null>(null)

// Saved data per step
const savedStepData = ref<Record<number, any>>({})

const steps = computed(() => [
  { label: t('applications.wizard.stepLabels.personal') },
  { label: t('applications.wizard.stepLabels.housing') },
  { label: t('applications.wizard.stepLabels.lifestyle') },
  { label: t('applications.wizard.stepLabels.photos') },
  { label: t('applications.wizard.stepLabels.review') },
])

// Animal data
const animal = ref<{ id: string; name: string; status: string } | null>(null)

// Draft composable — animalId and userId are stable for the lifetime of the page
const { saveDraft, loadDraft, clearDraft } = useApplicationDraft(
  route.params.id as string,
  authStore.user?.id ?? 'guest',
)

const formattedSaveTime = computed(() => {
  if (!lastSavedAt.value) return ''
  return new Date(lastSavedAt.value).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })
})

function goToStep(step: number) {
  currentStep.value = step
}

async function nextStep() {
  let valid = true

  if (currentStep.value === 0 && stepPersonalRef.value) {
    valid = stepPersonalRef.value.validate()
    if (!valid) return
    savedStepData.value[0] = { ...stepPersonalRef.value.form }
  } else if (currentStep.value === 1 && stepHousingRef.value) {
    valid = stepHousingRef.value.validate()
    if (!valid) return
    savedStepData.value[1] = { ...stepHousingRef.value.form }
  } else if (currentStep.value === 2 && stepLifestyleRef.value) {
    valid = stepLifestyleRef.value.validate()
    if (!valid) return
    savedStepData.value[2] = { ...stepLifestyleRef.value.form }
  } else if (currentStep.value === 3 && stepPhotosRef.value) {
    valid = stepPhotosRef.value.validate()
    if (!valid) return
    const photos = stepPhotosRef.value.getPhotos()
    savedStepData.value[3] = { photos }
  }

  // Auto-save draft
  saveDraft(currentStep.value, savedStepData.value[currentStep.value] || {})
  lastSavedAt.value = Date.now()

  if (currentStep.value < steps.value.length - 1) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

async function submitApplication() {
  submitting.value = true
  try {
    const reviewForm = stepReviewRef.value?.form || {}
    const personalData = savedStepData.value[0] || {}
    const housingData = savedStepData.value[1] || {}
    const lifestyleData = savedStepData.value[2] || {}
    const photoData = savedStepData.value[3] || {}

    const payload: Record<string, any> = {
      animalId: animalId.value,
      personalInfo: {
        phone: personalData.phone,
        occupation: personalData.occupation,
        birthDate: personalData.birthDate,
      },
      housing: {
        housingType: housingData.housingType,
        ownership: housingData.ownership,
        exteriorSpace: housingData.exteriorSpace,
        adults: housingData.adults,
        children: housingData.children,
      },
      lifestyle: {
        speciesExperience: lifestyleData.speciesExperience,
        hoursAlone: lifestyleData.hoursAlone,
        activityLevel: lifestyleData.activityLevel,
        adoptionReason: lifestyleData.adoptionReason,
      },
    }

    // Optional housing fields
    if (housingData.petPermission) payload.housing.petPermission = housingData.petPermission
    if (housingData.currentPets?.length) payload.housing.currentPets = housingData.currentPets

    // Optional lifestyle fields
    if (lifestyleData.previousPets) payload.lifestyle.previousPets = lifestyleData.previousPets

    // Optional review fields
    if (reviewForm.socialMedia) payload.socialMedia = reviewForm.socialMedia
    if (reviewForm.additionalContext) payload.additionalContext = reviewForm.additionalContext

    // Photos
    if (photoData.photos?.length) {
      payload.photos = photoData.photos.map((p: any, i: number) => ({
        url: p.url,
        key: p.key,
        position: i,
      }))
    }

    await post('/applications', payload)

    clearDraft()
    submitted.value = true
  } catch (error: any) {
    toast.add({
      title: t('common.error'),
      description: error?.data?.message || t('applications.errors.submitFailed'),
      color: 'error',
    })
  } finally {
    submitting.value = false
  }
}

function restoreDraft() {
  const draftData = loadDraft()
  if (!draftData) return
  showDraftAlert.value = false

  if (draftData.steps.step0) savedStepData.value[0] = draftData.steps.step0
  if (draftData.steps.step1) savedStepData.value[1] = draftData.steps.step1
  if (draftData.steps.step2) savedStepData.value[2] = draftData.steps.step2
  if (draftData.steps.step3) savedStepData.value[3] = draftData.steps.step3
  currentStep.value = draftData.currentStep || 0
  lastSavedAt.value = draftData.savedAt
}

onMounted(async () => {
  // Check for existing application
  try {
    const check = await get<{ exists: boolean; applicationId?: string }>(
      `/applications/check?animalId=${animalId.value}`
    )
    if (check.exists && check.applicationId) {
      await navigateTo(`/perfil/aplicaciones/${check.applicationId}`)
      return
    }
  } catch {
    // If check fails (unauthenticated), middleware will handle redirect
  }

  // Load animal data
  try {
    const animalData = await get<{ id: string; name: string; status: string }>(`/animals/${animalId.value}`)
    if (animalData.status !== 'AVAILABLE') {
      await navigateTo(`/animales/${animalId.value}`)
      return
    }
    animal.value = animalData
  } catch {
    await navigateTo(`/animales/${animalId.value}`)
    return
  }

  // Check for draft
  const draftData = loadDraft()
  if (draftData) {
    showDraftAlert.value = true
  }
})
</script>
