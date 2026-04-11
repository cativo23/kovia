<template>
  <div>
    <div class="mb-8">
      <h2 class="text-2xl font-bold">{{ $t('animals.dashboard.title') }}</h2>
    </div>

    <!-- Stats Cards -->
    <StatsCards :stats="stats" class="mb-8" />

    <!-- Quick Links -->
    <UCard>
      <template #header>
        <h3 class="font-semibold">{{ $t('animals.dashboard.quickLinks') }}</h3>
      </template>
      <div class="flex gap-3">
        <UButton
          icon="i-lucide-paw-print"
          :label="$t('animals.dashboard.viewAll')"
          to="/org/dashboard/animales"
        />
        <UButton
          variant="outline"
          icon="i-lucide-plus"
          :label="$t('animals.dashboard.addNew')"
          to="/org/dashboard/animales/nuevo"
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

interface AnimalStats {
  total: number
  available: number
  inProcess: number
  adopted: number
}

const { get } = useApi()

const stats = ref<AnimalStats | null>(null)

async function loadStats() {
  try {
    stats.value = await get<AnimalStats>('/animals/org/stats')
  } catch {
    // Silently handle — skeleton placeholders shown
  }
}

onMounted(() => {
  loadStats()
})
</script>
