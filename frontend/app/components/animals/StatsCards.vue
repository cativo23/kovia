<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <UCard v-for="card in cards" :key="card.label">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg" :class="card.bgClass">
          <UIcon :name="card.icon" class="w-6 h-6" :class="card.iconClass" />
        </div>
        <div>
          <template v-if="stats">
            <p class="text-2xl font-bold">{{ card.value }}</p>
            <p class="text-sm text-gray-500">{{ card.label }}</p>
          </template>
          <template v-else>
            <div class="h-7 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
            <div class="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </template>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
interface AnimalStats {
  total: number
  available: number
  inProcess: number
  adopted: number
}

const props = defineProps<{
  stats: AnimalStats | null
}>()

const { t } = useI18n()

const cards = computed(() => [
  {
    label: t('animals.stats.total'),
    value: props.stats?.total ?? 0,
    icon: 'i-lucide-paw-print',
    bgClass: 'bg-gray-100 dark:bg-gray-800',
    iconClass: 'text-gray-600 dark:text-gray-300',
  },
  {
    label: t('animals.stats.available'),
    value: props.stats?.available ?? 0,
    icon: 'i-lucide-check-circle',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    iconClass: 'text-green-600 dark:text-green-400',
  },
  {
    label: t('animals.stats.inProcess'),
    value: props.stats?.inProcess ?? 0,
    icon: 'i-lucide-clock',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    label: t('animals.stats.adopted'),
    value: props.stats?.adopted ?? 0,
    icon: 'i-lucide-heart',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
])
</script>
