<template>
  <div class="max-w-3xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <NuxtLink
        to="/org/dashboard/animales"
        class="text-sm text-gray-500 hover:text-primary inline-flex items-center gap-1 mb-2"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        {{ $t('animals.title') }}
      </NuxtLink>
      <h2 class="text-2xl font-bold">{{ $t('animals.create') }}</h2>
    </div>

    <!-- Step Progress -->
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

    <!-- Step Content -->
    <UCard>
      <!-- Step 1: Basic Info -->
      <div v-show="currentStep === 0">
        <AnimalForm
          ref="animalFormRef"
          mode="create"
          :visible-sections="['basic']"
          :show-section-headers="false"
          :show-actions="false"
        />
      </div>

      <!-- Step 2: Characteristics -->
      <div v-show="currentStep === 1">
        <AnimalForm
          ref="characteristicsFormRef"
          mode="create"
          :visible-sections="['characteristics']"
          :show-section-headers="false"
          :show-actions="false"
          :initial-data="formData"
        />
      </div>

      <!-- Step 3: Photos -->
      <div v-show="currentStep === 2">
        <PhotoUploader ref="photoUploaderRef" />
      </div>

      <!-- Navigation -->
      <div class="flex justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
        <UButton
          v-if="currentStep > 0"
          variant="outline"
          icon="i-lucide-arrow-left"
          :label="$t('animals.wizard.prev')"
          @click="prevStep"
        />
        <div v-else />

        <UButton
          v-if="currentStep < steps.length - 1"
          trailing-icon="i-lucide-arrow-right"
          :label="$t('animals.wizard.next')"
          @click="nextStep"
        />
        <UButton
          v-else
          icon="i-lucide-check"
          :label="$t('animals.wizard.create')"
          :loading="submitting"
          @click="createAnimal"
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

const { t } = useI18n()
const { post, patch } = useApi()
const toast = useToast()
const router = useRouter()

const currentStep = ref(0)
const submitting = ref(false)

const animalFormRef = ref<any>(null)
const characteristicsFormRef = ref<any>(null)
const photoUploaderRef = ref<any>(null)

// Shared form data between steps
const formData = reactive<Record<string, any>>({})

const steps = [
  { label: t('animals.wizard.step1') },
  { label: t('animals.wizard.step2') },
  { label: t('animals.wizard.step3') },
]

function nextStep() {
  // Validate current step
  if (currentStep.value === 0 && animalFormRef.value) {
    const valid = animalFormRef.value.validate(['basic'])
    if (!valid) return
    // Save step 1 data
    Object.assign(formData, animalFormRef.value.form)
  }

  if (currentStep.value === 1 && characteristicsFormRef.value) {
    // Save step 2 data
    Object.assign(formData, characteristicsFormRef.value.form)
  }

  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

function prevStep() {
  // Save current step data before going back
  if (currentStep.value === 1 && characteristicsFormRef.value) {
    Object.assign(formData, characteristicsFormRef.value.form)
  }

  if (currentStep.value > 0) {
    currentStep.value--
  }
}

async function createAnimal() {
  submitting.value = true
  try {
    // Read each form separately — do NOT spread charData over basicData because
    // characteristicsFormRef has empty strings for basic fields (name, speciesId)
    // which would overwrite the values from step 1.
    const basicData = animalFormRef.value?.form || {}
    const charData = characteristicsFormRef.value?.form || {}

    // Clean up empty strings for optional fields
    const payload: Record<string, any> = { name: basicData.name, speciesId: basicData.speciesId }
    // Basic fields from step 1
    if (basicData.breed) payload.breed = basicData.breed
    if (basicData.gender) payload.gender = basicData.gender
    if (basicData.description) payload.description = basicData.description
    // Characteristics from step 2
    if (charData.ageMonths != null) payload.ageMonths = charData.ageMonths
    if (charData.size) payload.size = charData.size
    if (charData.energyLevel) payload.energyLevel = charData.energyLevel
    if (charData.goodWithKids) payload.goodWithKids = charData.goodWithKids
    if (charData.goodWithDogs) payload.goodWithDogs = charData.goodWithDogs
    if (charData.goodWithCats) payload.goodWithCats = charData.goodWithCats
    if (charData.goodWithOtherPets) payload.goodWithOtherPets = charData.goodWithOtherPets
    if (charData.specialNeeds) payload.specialNeeds = charData.specialNeeds
    if (charData.vaccinated) payload.vaccinated = charData.vaccinated
    if (charData.sterilized) payload.sterilized = charData.sterilized
    if (charData.trained) payload.trained = charData.trained

    // 1. Create animal
    const animal = await post<{ id: string }>('/animals', payload)

    // 2. Upload photos
    const uploadedPhotos = photoUploaderRef.value?.getUploadedPhotos() || []
    if (uploadedPhotos.length > 0) {
      const photos = uploadedPhotos.map((p: any) => ({
        url: p.url,
        key: p.key,
        caption: p.caption || undefined,
      }))
      await post(`/animals/${animal.id}/photos`, { photos })

      // 3. Set cover photo if selected
      const coverPhoto = photoUploaderRef.value?.getCoverPhoto()
      if (coverPhoto && coverPhoto.id) {
        await patch(`/animals/${animal.id}/photos/cover`, { photoId: coverPhoto.id })
      }
    }

    toast.add({ title: t('common.success'), color: 'success' })
    await router.push('/org/dashboard/animales')
  } catch (error: any) {
    toast.add({ title: t('common.error'), description: error?.data?.message || '', color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>
