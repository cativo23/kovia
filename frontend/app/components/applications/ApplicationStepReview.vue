<template>
  <div class="space-y-6">
    <!-- Step 1 Review: Personal Info -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-base font-bold">{{ $t('applications.review.personalInfo') }}</h3>
        <UButton
          variant="link"
          size="sm"
          :label="$t('applications.review.edit')"
          @click="emit('go-to-step', 0)"
        />
      </div>
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
        <div class="flex gap-2">
          <span class="text-gray-500 w-32">{{ $t('applications.steps.personal.phone') }}:</span>
          <span>{{ personalData?.phone || '—' }}</span>
        </div>
        <div class="flex gap-2">
          <span class="text-gray-500 w-32">{{ $t('applications.steps.personal.occupation') }}:</span>
          <span>{{ personalData?.occupation || '—' }}</span>
        </div>
        <div class="flex gap-2">
          <span class="text-gray-500 w-32">{{ $t('applications.steps.personal.birthDate') }}:</span>
          <span>{{ personalData?.birthDate || '—' }}</span>
        </div>
      </div>
    </div>

    <!-- Step 2 Review: Housing -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-base font-bold">{{ $t('applications.review.housing') }}</h3>
        <UButton
          variant="link"
          size="sm"
          :label="$t('applications.review.edit')"
          @click="emit('go-to-step', 1)"
        />
      </div>
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
        <div class="flex gap-2">
          <span class="text-gray-500 w-32">{{ $t('applications.steps.housing.housingType') }}:</span>
          <span>{{ housingData?.housingType || '—' }}</span>
        </div>
        <div class="flex gap-2">
          <span class="text-gray-500 w-32">{{ $t('applications.steps.housing.ownership') }}:</span>
          <span>{{ housingData?.ownership || '—' }}</span>
        </div>
        <div v-if="housingData?.petPermission" class="flex gap-2">
          <span class="text-gray-500 w-32">{{ $t('applications.steps.housing.petPermission') }}:</span>
          <span>{{ housingData.petPermission }}</span>
        </div>
        <div class="flex gap-2">
          <span class="text-gray-500 w-32">{{ $t('applications.steps.housing.exteriorSpace') }}:</span>
          <span>{{ housingData?.exteriorSpace || '—' }}</span>
        </div>
        <div class="flex gap-2">
          <span class="text-gray-500 w-32">{{ $t('applications.steps.housing.adults') }}:</span>
          <span>{{ housingData?.adults ?? '—' }}</span>
        </div>
        <div class="flex gap-2">
          <span class="text-gray-500 w-32">{{ $t('applications.steps.housing.children') }}:</span>
          <span>{{ housingData?.children ?? '—' }}</span>
        </div>
        <div v-if="housingData?.currentPets?.length" class="flex gap-2">
          <span class="text-gray-500 w-32">{{ $t('applications.steps.housing.currentPetsLabel') }}:</span>
          <span>{{ housingData.currentPets.map((p: any) => p.species).join(', ') }}</span>
        </div>
      </div>
    </div>

    <!-- Step 3 Review: Lifestyle -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-base font-bold">{{ $t('applications.review.lifestyle') }}</h3>
        <UButton
          variant="link"
          size="sm"
          :label="$t('applications.review.edit')"
          @click="emit('go-to-step', 2)"
        />
      </div>
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
        <div class="flex gap-2">
          <span class="text-gray-500 w-40">{{ $t('applications.steps.lifestyle.speciesExperience') }}:</span>
          <span>{{ lifestyleData?.speciesExperience || '—' }}</span>
        </div>
        <div class="flex gap-2">
          <span class="text-gray-500 w-40">{{ $t('applications.steps.lifestyle.hoursAlone') }}:</span>
          <span>{{ lifestyleData?.hoursAlone || '—' }}</span>
        </div>
        <div class="flex gap-2">
          <span class="text-gray-500 w-40">{{ $t('applications.steps.lifestyle.activityLevel') }}:</span>
          <span>{{ lifestyleData?.activityLevel || '—' }}</span>
        </div>
        <div class="flex gap-2">
          <span class="text-gray-500 w-40">{{ $t('applications.steps.lifestyle.adoptionReason') }}:</span>
          <span class="flex-1">{{ lifestyleData?.adoptionReason || '—' }}</span>
        </div>
      </div>
    </div>

    <!-- Step 4 Review: Photos -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-base font-bold">{{ $t('applications.review.photos') }}</h3>
        <UButton
          variant="link"
          size="sm"
          :label="$t('applications.review.edit')"
          @click="emit('go-to-step', 3)"
        />
      </div>
      <div v-if="photos && photos.length > 0" class="grid grid-cols-3 sm:grid-cols-4 gap-2">
        <div
          v-for="(photo, index) in photos"
          :key="index"
          class="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800"
        >
          <img
            :src="photo.url"
            :alt="`Foto ${index + 1}`"
            class="w-full h-full object-cover"
          />
        </div>
      </div>
      <p v-else class="text-sm text-gray-500">{{ $t('applications.review.noPhotos') }}</p>
    </div>

    <!-- Optional fields -->
    <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
      <h3 class="text-base font-bold">{{ $t('applications.review.additionalInfo') }}</h3>

      <!-- Social Media -->
      <div>
        <label class="block text-sm font-medium mb-1">
          {{ $t('applications.review.socialMedia') }}
        </label>
        <UInput
          v-model="form.socialMedia"
          :placeholder="$t('applications.review.socialMediaPlaceholder')"
          type="url"
        />
      </div>

      <!-- Additional Context -->
      <div>
        <label class="block text-sm font-medium mb-1">
          {{ $t('applications.review.additionalContext') }}
        </label>
        <UTextarea
          v-model="form.additionalContext"
          :rows="3"
          :placeholder="$t('applications.review.additionalContextPlaceholder')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  personalData?: Record<string, any>
  housingData?: Record<string, any>
  lifestyleData?: Record<string, any>
  photos?: { url: string; key: string }[]
}>()

const emit = defineEmits<{
  'go-to-step': [step: number]
}>()

const form = reactive({
  socialMedia: '',
  additionalContext: '',
})

function validate(): boolean {
  return true
}

defineExpose({ validate, form })
</script>
