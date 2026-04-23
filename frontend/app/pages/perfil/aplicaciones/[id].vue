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

      <!-- Org header (D-20) -->
      <div
        v-if="application.animal?.organization"
        class="flex items-center gap-2 text-sm text-gray-500 mb-2"
      >
        <UAvatar
          v-if="application.animal.organization.logoUrl"
          :src="application.animal.organization.logoUrl"
          size="xs"
          :alt="application.animal.organization.name"
        />
        <UIcon v-else name="i-lucide-building-2" class="w-4 h-4" aria-hidden="true" />
        <span>{{ application.animal.organization.name }}</span>
      </div>

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

      <!-- Historial de estados (D-22) -->
      <UCard class="mb-6">
        <template #header>
          <h2 class="text-xl font-semibold">{{ $t('applications.history.sectionHeading') }}</h2>
        </template>
        <ul v-if="history.length > 0" class="space-y-3">
          <li
            v-for="entry in history"
            :key="entry.id"
            class="flex items-start gap-3"
          >
            <div class="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" aria-hidden="true" />
            <div class="flex-1">
              <p class="text-sm font-medium">{{ describeEntry(entry) }}</p>
              <p class="text-xs text-gray-500">{{ formatDate(entry.createdAt) }}</p>
            </div>
          </li>
        </ul>
        <p v-else class="text-sm text-gray-500">
          {{ $t('applications.history.fallbackSubmitted', { fecha: formatDate(application.submittedAt ?? application.createdAt) }) }}
        </p>
      </UCard>

      <!-- Withdraw Button (D-21 — only ENVIADA / REVISANDO) -->
      <div
        v-if="application && ['ENVIADA', 'REVISANDO'].includes(application.status)"
        class="flex justify-end"
      >
        <UButton
          color="error"
          variant="soft"
          icon="i-lucide-x-circle"
          :label="$t('applications.withdraw.confirmTitle')"
          @click="showWithdrawModal = true"
        />
      </div>
    </div>

    <!-- Withdraw Confirmation Modal (reusable — 10-02) -->
    <WithdrawApplicationModal
      v-model="showWithdrawModal"
      :animal-name="application?.animal?.name ?? ''"
      :application-id="String(route.params.id)"
      @withdrawn="onWithdrawn"
    />

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
import { onMounted, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const { t } = useI18n()
const route = useRoute()
const { get } = useApi()
const config = useRuntimeConfig()
const authStore = useAuthStore()

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
  submittedAt?: string
  animal: {
    id: string
    name: string
    organization?: {
      id: string
      name: string
      slug: string
      logoUrl: string | null
    } | null
  } | null
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

interface StatusHistoryEntry {
  id: string
  action: 'application.create' | 'application.status_change' | 'application.withdraw' | string
  createdAt: string
  details: {
    applicationId: string
    oldStatus?: string
    newStatus?: string
    [key: string]: unknown
  }
  user: { firstName: string; lastName: string } | null
}

const application = ref<ApplicationDetail | null>(null)
const loading = ref(true)
const error = ref(false)
const showWithdrawModal = ref(false)
const lightboxIndex = ref<number | null>(null)
const history = ref<StatusHistoryEntry[]>([])

async function loadApplication() {
  loading.value = true
  error.value = false
  try {
    application.value = await get<ApplicationDetail>(`/applications/my/${route.params.id}`)
    await loadHistory()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

async function loadHistory() {
  try {
    history.value = await $fetch<StatusHistoryEntry[]>(
      `/applications/my/${route.params.id}/history`,
      {
        baseURL: config.public.apiUrl as string,
        headers: authStore.accessToken
          ? { Authorization: `Bearer ${authStore.accessToken}` }
          : {},
      },
    )
  } catch {
    history.value = []
  }
}

function describeEntry(e: StatusHistoryEntry): string {
  // AuditLog action strings match backend exactly (PATTERNS.md landmine):
  //   'application.create', 'application.status_change', 'application.withdraw'
  // (CONTEXT D-22's past-tense wording is a typo — backend emits present tense.)
  if (e.action === 'application.create') return t('applications.history.entryCreate')
  if (e.action === 'application.withdraw') return t('applications.history.entryWithdraw')
  if (e.action === 'application.status_change') {
    return t('applications.history.entryStatusChange', {
      from: e.details.oldStatus ?? '—',
      to: e.details.newStatus ?? '—',
    })
  }
  return e.action
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-SV', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

async function onWithdrawn() {
  // D-21: redirect to Histórico tab after success (modal already showed toast).
  await navigateTo('/perfil/aplicaciones?tab=historico')
}

function openLightbox(index: number) {
  lightboxIndex.value = index
}

onMounted(() => {
  loadApplication()
})
</script>
