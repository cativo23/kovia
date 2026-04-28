<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <UIcon
      name="i-lucide-paw-print"
      class="w-20 h-20 text-amber-200 text-warning mb-6"
    />

    <template v-if="variant === 'filtered'">
      <h3 class="text-xl font-semibold text-gray-700 text-[--color-text]/70 mb-2">
        {{ $t('listings.noResults') }}
      </h3>
      <p class="text-gray-500 text-[--color-text]/70 mb-6 max-w-sm">
        {{ $t('listings.noResultsMessage') }}
      </p>
      <UButton
        color="primary"
        variant="outline"
        icon="i-lucide-x"
        :label="$t('listings.clearAll')"
        @click="emit('clearFilters')"
      />
    </template>

    <template v-else>
      <h3 class="text-xl font-semibold text-gray-700 text-[--color-text]/70 mb-2">
        {{ $t('listings.emptyTitle') }}
      </h3>
      <p class="text-gray-500 text-[--color-text]/70 max-w-sm">
        {{ $t('listings.emptyMessage') }}
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  variant?: 'filtered' | 'empty'
}>()

const emit = defineEmits<{
  clearFilters: []
}>()
</script>
