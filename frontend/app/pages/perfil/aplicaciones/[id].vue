<template>
  <div class="max-w-3xl mx-auto">
    <!-- Loading -->
    <div v-if="loading" class="animate-pulse space-y-4">
      <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      <div class="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>

    <!-- Error -->
    <UCard v-else-if="error" class="text-center py-8">
      <UIcon name="i-lucide-alert-circle" class="w-12 h-12 text-error mx-auto mb-3" />
      <p class="text-gray-500 mb-4">{{ $t('applications.errors.loadFailed') }}</p>
      <UButton :label="$t('common.retry')" @click="loadApplication" />
    </UCard>

    <!-- Application Detail -->
    <div v-else-if="application">
      <!-- Back link -->
      <NuxtLink
        to="/perfil/aplicaciones"
        class="text-sm text-gray-500 hover:text-primary inline-flex items-center gap-1 mb-6"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        {{ $t('applications.history.title') }}
      </NuxtLink>

      <!-- Status header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">
          {{ application.animal?.name || $t('detail.notFound') }}
        </h1>
        <ApplicationStatusBadge :status="application.status" />
      </div>

      <!-- Personal Info -->
      <UCard class="mb-4">
        <h2 class="text-base font-bold mb-3">{{ $t('applications.detail.personalInfo') }}</h2>
        <div class="space-y-2 text-sm">
          <div class="flex gap-2">
            <span class="text-gray-500 w-40">{{ $t('applications.steps.personal.phone') }}:</span>
            <span>{{ application.personalInfo?.phone || '—' }}</span>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-500 w-40">{{ $t('applications.steps.personal.occupation') }}:</span>
            <span>{{ application.personalInfo?.occupation || '—' }}</span>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-500 w-40">{{ $t('applications.steps.personal.birthDate') }}:</span>
            <span>{{ application.personalInfo?.birthDate || '—' }}</span>
          </div>
        </div>
      </UCard>

      <!-- Housing -->
      <UCard class="mb-4">
        <h2 class="text-base font-bold mb-3">{{ $t('applications.detail.housing') }}</h2>
        <div class="space-y-2 text-sm">
          <div class="flex gap-2">
            <span class="text-gray-500 w-40">{{ $t('applications.steps.housing.housingType') }}:</span>
            <span>{{ application.housing?.housingType || '—' }}</span>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-500 w-40">{{ $t('applications.steps.housing.ownership') }}:</span>
            <span>{{ application.housing?.ownership || '—' }}</span>
          </div>
          <div v-if="application.housing?.petPermission" class="flex gap-2">
            <span class="text-gray-500 w-40">{{ $t('applications.steps.housing.petPermission') }}:</span>
            <span>{{ application.housing.petPermission }}</span>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-500 w-40">{{ $t('applications.steps.housing.exteriorSpace') }}:</span>
            <span>{{ application.housing?.exteriorSpace || '—' }}</span>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-500 w-40">{{ $t('applications.steps.housing.adults') }}:</span>
            <span>{{ application.housing?.adults ?? '—' }}</span>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-500 w-40">{{ $t('applications.steps.housing.children') }}:</span>
            <span>{{ application.housing?.children ?? '—' }}</span>
          </div>
        </div>
      </UCard>

      <!-- Lifestyle -->
      <UCard class="mb-4">
        <h2 class="text-base font-bold mb-3">{{ $t('applications.detail.lifestyle') }}</h2>
        <div class="space-y-2 text-sm">
          <div class="flex gap-2">
            <span class="text-gray-500 w-40">{{ $t('applications.steps.lifestyle.speciesExperience') }}:</span>
            <span>{{ application.lifestyle?.speciesExperience || '—' }}</span>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-500 w-40">{{ $t('applications.steps.lifestyle.hoursAlone') }}:</span>
            <span>{{ application.lifestyle?.hoursAlone || '—' }}</span>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-500 w-40">{{ $t('applications.steps.lifestyle.activityLevel') }}:</span>
            <span>{{ application.lifestyle?.activityLevel || '—' }}</span>
          </div>
          <div class="flex gap-2">
            <span class="text-gray-500 w-40">{{ $t('applications.steps.lifestyle.adoptionReason') }}:</span>
            <span class="flex-1">{{ application.lifestyle?.adoptionReason || '—' }}</span>
          </div>
        </div>
      </UCard>

      <!-- Photos -->
      <UCard class="mb-4">
        <h2 class="text-base font-bold mb-3">{{ $t('applications.detail.photos') }}</h2>
        <div v-if="application.photos?.length" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div
            v-for="(photo, index) in application.photos"
            :key="photo.id"
            class="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer"
            @click="openLightbox(index)"
          >
            <img
              :src="photo.url"
              :alt="`Foto ${index + 1}`"
              class="w-full h-full object-cover hover:opacity-90 transition-opacity"
            />
          </div>
        </div>
        <p v-else class="text-sm text-gray-500">{{ $t('applications.review.noPhotos') }}</p>
      </UCard>

      <!-- Additional Info -->
      <UCard
        v-if="application.socialMedia || application.additionalContext"
        class="mb-6"
      >
        <h2 class="text-base font-bold mb-3">{{ $t('applications.detail.additionalInfo') }}</h2>
        <div class="space-y-2 text-sm">
          <div v-if="application.socialMedia" class="flex gap-2">
            <span class="text-gray-500 w-40">{{ $t('applications.review.socialMedia') }}:</span>
            <a :href="application.socialMedia" target="_blank" class="text-primary hover:underline">
              {{ application.socialMedia }}
            </a>
          </div>
          <div v-if="application.additionalContext" class="flex gap-2">
            <span class="text-gray-500 w-40">{{ $t('applications.review.additionalContext') }}:</span>
            <span class="flex-1">{{ application.additionalContext }}</span>
          </div>
        </div>
      </UCard>

      <!-- Withdraw Button -->
      <div
        v-if="application.status !== 'ADOPTADA' && application.status !== 'RETIRADA'"
        class="flex justify-end"
      >
        <UButton
          color="error"
          variant="soft"
          icon="i-lucide-x-circle"
          :label="$t('applications.detail.withdraw')"
          @click="showWithdrawModal = true"
        />
      </div>
    </div>

    <!-- Withdraw Confirmation Modal -->
    <UModal v-model:open="showWithdrawModal">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-bold mb-2">{{ $t('applications.detail.withdrawConfirmTitle') }}</h2>
          <p class="text-sm text-gray-500 mb-6">{{ $t('applications.detail.withdrawConfirmBody') }}</p>
          <div class="flex gap-3 justify-end">
            <UButton
              variant="outline"
              :label="$t('applications.detail.withdrawCancel')"
              @click="showWithdrawModal = false"
            />
            <UButton
              color="error"
              :label="$t('applications.detail.withdrawConfirmCta')"
              :loading="withdrawing"
              @click="withdrawApplication"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Lightbox -->
    <Teleport to="body">
      <div
        v-if="lightboxIndex !== null"
        class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
        @click.self="lightboxIndex = null"
      >
        <button
          class="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          @click="lightboxIndex = null"
        >
          <UIcon name="i-lucide-x" class="w-8 h-8" />
        </button>
        <img
          v-if="lightboxIndex !== null && application?.photos?.[lightboxIndex]"
          :src="application.photos[lightboxIndex]!.url"
          :alt="`Foto ${lightboxIndex + 1}`"
          class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
        />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const { t } = useI18n()
const route = useRoute()
const { get, patch } = useApi()
const toast = useToast()

interface ApplicationPhoto {
  id: string
  url: string
  key: string
  position: number
}

interface ApplicationDetail {
  id: string
  status: string
  createdAt: string
  animal: { id: string; name: string } | null
  personalInfo: { phone: string; occupation: string; birthDate: string } | null
  housing: {
    housingType: string
    ownership: string
    petPermission?: string
    exteriorSpace: string
    adults: number
    children: number
  } | null
  lifestyle: {
    speciesExperience: string
    hoursAlone: string
    activityLevel: string
    adoptionReason: string
    previousPets?: string
  } | null
  photos: ApplicationPhoto[]
  socialMedia?: string | null
  additionalContext?: string | null
}

const application = ref<ApplicationDetail | null>(null)
const loading = ref(true)
const error = ref(false)
const showWithdrawModal = ref(false)
const withdrawing = ref(false)
const lightboxIndex = ref<number | null>(null)

async function loadApplication() {
  loading.value = true
  error.value = false
  try {
    application.value = await get<ApplicationDetail>(`/applications/my/${route.params.id}`)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

async function withdrawApplication() {
  withdrawing.value = true
  try {
    const updated = await patch<ApplicationDetail>(`/applications/${route.params.id}/retirar`)
    if (application.value) {
      application.value.status = updated.status
    }
    showWithdrawModal.value = false
    toast.add({ title: t('common.success'), color: 'success' })
  } catch (err: any) {
    toast.add({
      title: t('common.error'),
      description: err?.data?.message || '',
      color: 'error',
    })
  } finally {
    withdrawing.value = false
  }
}

function openLightbox(index: number) {
  lightboxIndex.value = index
}

onMounted(() => {
  loadApplication()
})
</script>
