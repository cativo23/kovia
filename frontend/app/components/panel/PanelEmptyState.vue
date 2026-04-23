<template>
  <UCard class="text-center">
    <div class="py-12 px-6 flex flex-col items-center gap-6">
      <div class="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
        <UIcon
          name="i-lucide-paw-print"
          class="w-8 h-8 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
      </div>
      <div class="space-y-2">
        <h2 class="text-[28px] font-semibold leading-tight">
          {{ $t('dashboard.panel.empty.heading') }}
        </h2>
        <p class="text-base text-gray-500 dark:text-gray-400 leading-relaxed max-w-md">
          {{ $t('dashboard.panel.empty.body') }}
        </p>
      </div>
      <UButton
        color="primary"
        to="/animales"
        :label="$t('dashboard.panel.empty.cta')"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
// No props — pure presentational empty state
</script>
