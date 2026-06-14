<template>
  <div class="flex items-center gap-2">
    <KIcon name="paw-print" :size="28" class="text-primary" />
    <div>
      <span class="text-xl font-bold text-primary leading-none">Kovia</span>
      <p v-if="showTagline" class="text-xs text-[var(--color-text)]/70 leading-none mt-0.5">
        {{ $t('common.footer.tagline') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  showTagline?: boolean
}>()
</script>
