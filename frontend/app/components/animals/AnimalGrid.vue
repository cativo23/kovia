<template>
  <div>
    <!-- Header row: result count + view toggle -->
    <div class="flex items-center justify-between mb-4">
      <p class="text-sm text-[--color-text]/70">
        <span v-if="total !== undefined">
          {{ total }} {{ total === 1 ? $t('listings.resultSingle') : $t('listings.results') }}
        </span>
        <span v-else>{{ animals.length }} {{ animals.length === 1 ? $t('listings.resultSingle') : $t('listings.results') }}</span>
      </p>
      <div class="flex items-center gap-1">
        <UButton
          :variant="localViewMode === 'grid' ? 'solid' : 'ghost'"
          color="neutral"
          size="sm"
         
          :title="$t('listings.viewGrid')"
          @click="setMode('grid')">
          <template #leading><KIcon name="layout-grid" /></template>
        </UButton>
        <UButton
          :variant="localViewMode === 'list' ? 'solid' : 'ghost'"
          color="neutral"
          size="sm"
         
          :title="$t('listings.viewList')"
          @click="setMode('list')">
          <template #leading><KIcon name="list" /></template>
        </UButton>
      </div>
    </div>

    <!-- Grid mode -->
    <div
      v-if="localViewMode === 'grid'"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      <AnimalCard
        v-for="animal in animals"
        :key="animal.id"
        :animal="animal"
        mode="grid"
      />
    </div>

    <!-- List mode -->
    <div v-else class="flex flex-col gap-2">
      <AnimalCard
        v-for="animal in animals"
        :key="animal.id"
        :animal="animal"
        mode="list"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnimalPublic } from '~/types/public-animal'

/**
 * Phase 15-05 — Grid forwards the public DTO shape into AnimalCard.
 * The shared `AnimalPublic` type is the source of truth for the public
 * listing (D-04). AnimalCard tolerates legacy admin-side fields as
 * Partial<…> in its own scope, so this Grid stays narrow.
 */
const props = defineProps<{
  animals: AnimalPublic[]
  viewMode?: 'grid' | 'list'
  total?: number
}>()

const emit = defineEmits<{
  'update:viewMode': [value: 'grid' | 'list']
}>()

const localViewMode = ref<'grid' | 'list'>(props.viewMode || 'grid')

watch(() => props.viewMode, (val) => {
  if (val) localViewMode.value = val
})

function setMode(mode: 'grid' | 'list') {
  localViewMode.value = mode
  emit('update:viewMode', mode)
}
</script>
