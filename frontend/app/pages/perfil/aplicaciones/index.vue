<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('applications.history.title') }}</h1>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <UCard v-for="i in 3" :key="i" class="animate-pulse">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Error -->
    <UCard v-else-if="error" class="text-center py-8">
      <UIcon name="i-lucide-alert-circle" class="w-12 h-12 text-error mx-auto mb-3" />
      <p class="text-gray-500 mb-4">{{ $t('applications.errors.loadFailed') }}</p>
      <UButton :label="$t('common.retry')" @click="loadApplications" />
    </UCard>

    <!-- Empty State -->
    <UCard v-else-if="applications.length === 0" class="text-center py-16">
      <UIcon name="i-lucide-clipboard-list" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h2 class="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
        {{ $t('applications.history.emptyTitle') }}
      </h2>
      <p class="text-gray-500 mb-6">{{ $t('applications.history.emptyBody') }}</p>
      <UButton to="/animales" :label="$t('applications.history.emptyCta')" />
    </UCard>

    <!-- Application List -->
    <div v-else class="space-y-4">
      <UCard
        v-for="app in applications"
        :key="app.id"
        class="hover:shadow-md transition-shadow"
      >
        <div class="flex items-center gap-4">
          <!-- Animal thumbnail -->
          <div class="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
            <img
              v-if="app.animal?.coverPhoto?.url"
              :src="app.animal.coverPhoto.url"
              :alt="app.animal.name"
              class="w-full h-full object-cover"
            />
            <UIcon v-else name="i-lucide-paw-print" class="w-6 h-6 text-gray-400 m-auto mt-3" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 dark:text-white truncate">
              {{ app.animal?.name || '—' }}
            </p>
            <p class="text-xs text-gray-500">
              {{ $t('applications.history.submittedAt') }}
              {{ formatDate(app.submittedAt) }}
            </p>
          </div>

          <!-- Status badge -->
          <ApplicationStatusBadge :status="app.status" />

          <!-- View link -->
          <NuxtLink
            :to="`/perfil/aplicaciones/${app.id}`"
            class="text-sm text-primary hover:underline whitespace-nowrap"
          >
            {{ $t('applications.history.viewApplication') }}
          </NuxtLink>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const { t } = useI18n()
const { get } = useApi()

interface ApplicationListItem {
  id: string
  status: string
  submittedAt: string
  animal: {
    name: string
    coverPhoto?: { url: string } | null
  } | null
}

const applications = ref<ApplicationListItem[]>([])
const loading = ref(true)
const error = ref(false)

async function loadApplications() {
  loading.value = true
  error.value = false
  try {
    const result = await get<{ data: ApplicationListItem[]; total: number }>('/applications/my')
    applications.value = result.data || (result as any) || []
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-SV', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

onMounted(() => {
  loadApplications()
})
</script>
