<template>
  <div class="flex items-center gap-2">
    <UIcon name="i-lucide-paw-print" class="w-7 h-7 text-primary" />
    <div>
      <span class="text-xl font-bold text-primary leading-none">Kovia</span>
      <p v-if="showTagline" class="text-xs text-gray-500 dark:text-gray-400 leading-none mt-0.5">
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
