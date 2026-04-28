<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <UCard v-for="card in cards" :key="card.label">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg" :class="card.bgClass">
          <KIcon :name="card.icon" :size="24" :class="card.iconClass" />
        </div>
        <div>
          <template v-if="stats">
            <p class="text-2xl font-bold">{{ card.value }}</p>
            <p class="text-sm text-gray-500">{{ card.label }}</p>
          </template>
          <template v-else>
            <div class="h-7 w-12 bg-[--color-border]/40 rounded animate-pulse mb-1" />
            <div class="h-4 w-20 bg-[--color-border]/40 rounded animate-pulse" />
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
    icon: 'paw-print',
    bgClass: 'bg-[--color-border]/40',
    iconClass: 'text-[--color-text]/70',
  },
  {
    label: t('animals.stats.available'),
    value: props.stats?.available ?? 0,
    icon: 'check-circle',
    bgClass: 'bg-green-100 bg-success/20',
    iconClass: 'text-green-600 text-success',
  },
  {
    label: t('animals.stats.inProcess'),
    value: props.stats?.inProcess ?? 0,
    icon: 'clock',
    bgClass: 'bg-amber-100 bg-warning/20',
    iconClass: 'text-amber-600 text-warning',
  },
  {
    label: t('animals.stats.adopted'),
    value: props.stats?.adopted ?? 0,
    icon: 'heart',
    bgClass: 'bg-blue-100 bg-info/20',
    iconClass: 'text-blue-600 text-info',
  },
])
</script>
