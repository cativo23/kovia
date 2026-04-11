<template>
  <UCard>
    <template #header>
      <h3 class="font-semibold text-base">{{ $t('adoptantes.historyHeading') }}</h3>
    </template>
    <div v-if="loading" class="flex justify-center py-4">
      <UIcon name="i-lucide-loader-2" class="w-5 h-5 animate-spin text-primary" />
    </div>
    <template v-else>
      <div class="space-y-2">
        <!-- Totals line: "3 solicitudes · 1 adoptados · 1 devueltos" -->
        <p class="text-sm">
          {{ summary.totalApplications }} {{ $t('adoptantes.solicitudes') }}
          · {{ summary.adopted }} {{ $t('adoptantes.adoptados') }}
          · <span :class="summary.returned > 0 ? 'text-red-500 font-medium' : ''">
              {{ summary.returned }} {{ $t('adoptantes.devueltos') }}
            </span>
        </p>
        <!-- Red badge when returns > 0 -->
        <UBadge v-if="summary.returned > 0" color="error" variant="subtle" size="xs">
          {{ summary.returned }} {{ $t('adoptantes.devueltos') }}
        </UBadge>
      </div>
      <!-- Link to full history -->
      <NuxtLink
        :to="`/org/dashboard/adoptantes/${userId}`"
        class="text-sm text-primary hover:underline mt-3 inline-flex items-center gap-1"
      >
        {{ $t('adoptantes.viewFullHistory') }}
        <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
      </NuxtLink>
    </template>
  </UCard>
</template>

<script setup lang="ts">
interface AdopterSummary {
  totalApplications: number
  adopted: number
  returned: number
}

const props = defineProps<{
  userId: string
}>()

const { get } = useApi()
const loading = ref(true)
const summary = ref<AdopterSummary>({
  totalApplications: 0,
  adopted: 0,
  returned: 0,
})

async function loadSummary() {
  loading.value = true
  try {
    summary.value = await get<AdopterSummary>(`/adopters/${props.userId}/summary`)
  } catch {
    // Non-critical: summary card fails silently if adopter has no history
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadSummary()
})
</script>
