<template>
  <NuxtLink
    :to="to"
    class="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
  >
    <UCard
      class="hover:shadow-md transition-shadow"
      :class="accent ? 'border-primary/30' : ''"
    >
      <div class="flex items-center gap-3">
        <div
          class="p-2 rounded-lg shrink-0"
          :class="accent
            ? 'bg-amber-100 bg-warning/20'
            : 'bg-[--color-border]/40'"
        >
          <UIcon
            name="i-lucide-file-text"
            class="w-6 h-6"
            :class="accent
              ? 'text-amber-600 text-warning'
              : 'text-[--color-text]/70'"
            aria-hidden="true"
          />
        </div>
        <div class="min-w-0">
          <template v-if="count !== null">
            <p
              class="text-xl font-semibold leading-snug"
              :class="accent ? 'text-primary' : ''"
            >
              {{ count }}
            </p>
            <p class="text-sm font-semibold text-[--color-text]/70 leading-snug">
              {{ label }}
            </p>
          </template>
          <template v-else>
            <div class="h-6 w-10 bg-[--color-border]/40 rounded animate-pulse mb-1" />
            <div class="h-4 w-20 bg-[--color-border]/40 rounded animate-pulse" />
          </template>
        </div>
      </div>
    </UCard>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  count: number | null
  to: string
  accent?: boolean
}>()
</script>
