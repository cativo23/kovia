<template>
  <div class="mb-6">
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-medium">
        {{ completionPct === 100 ? $t('profile.completionFull') : $t('profile.completionPct', { pct: completionPct }) }}
      </span>
    </div>
    <UProgress
      :value="completionPct"
      :max="100"
      :class="completionPct === 100 ? 'progress-complete' : 'progress-partial'"
      role="progressbar"
      :aria-valuenow="completionPct"
      aria-valuemin="0"
      aria-valuemax="100"
    />
    <div class="flex gap-3 mt-3" role="list" :aria-label="$t('profile.completionPipsAriaLabel')">
      <div
        v-for="s in sections"
        :key="s.key"
        role="listitem"
        class="flex items-center gap-1"
      >
        <span
          class="inline-block w-3 h-3 rounded-full"
          :class="s.complete ? 'bg-[var(--color-verde-forestal-500)]' : 'bg-[var(--color-ambar-500)]'"
          :aria-label="$t(`profile.sections.${s.key}`)"
        />
        <span class="text-xs text-gray-500">{{ $t(`profile.sections.${s.key}`) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  completionPct: number
  sections: { key: string; complete: boolean }[]
}>()
</script>

<style scoped>
.progress-partial :deep([role="progressbar"] > *),
.progress-partial :deep(.ui-progress-indicator),
.progress-partial :deep([class*="indicator"]) {
  background-color: var(--color-terracota-500, #D97706);
}

.progress-complete :deep([role="progressbar"] > *),
.progress-complete :deep(.ui-progress-indicator),
.progress-complete :deep([class*="indicator"]) {
  background-color: var(--color-verde-forestal-500, #16A34A);
}
</style>
