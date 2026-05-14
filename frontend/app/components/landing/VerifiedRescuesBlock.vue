<!--
  VerifiedRescuesBlock — Phase 15-07 landing bento VERIFIED cell.

  Lists Organization rows with verifiedAt IS NOT NULL (D-14). Each row
  shows logoUrl + name + optional foundedYear caption. Footer links to
  /verificacion for the methodology.

  Renders nothing visible when rescues is empty (the parent decides
  whether to mount us; we just render a sensible empty stack just in
  case). For Day-1 zero state the parent hides this block.
-->
<template>
  <KSpringCard
    data-testid="bento-verified"
    class="bento-verified [grid-area:verified] rounded-[var(--radius-card,24px)] p-6"
  >
    <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
      <KIcon name="shield-check" :size="20" class="text-[var(--color-verde-forestal-500,#16a34a)]" aria-hidden="true" />
      {{ $t('landing.verifiedRescues.heading') }}
    </h2>

    <ul class="flex flex-col gap-3">
      <li
        v-for="rescue in rescues"
        :key="rescue.id"
        class="flex items-center gap-3"
      >
        <div class="bento-verified__logo flex-shrink-0 w-10 h-10 rounded-[var(--radius-icon,14px)] overflow-hidden bg-[var(--color-bg-secondary,#faf3e8)] flex items-center justify-center">
          <img
            v-if="rescue.logoUrl"
            :src="rescue.logoUrl"
            :alt="rescue.name"
            class="w-full h-full object-cover"
          />
          <KIcon v-else name="building-2" :size="20" class="text-[var(--color-text)]/40" aria-hidden="true" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm truncate">{{ rescue.name }}</p>
          <p v-if="rescue.foundedYear" class="text-xs text-[var(--color-text)]/60">
            {{ $t('landing.verifiedRescues.foundedYear', { year: rescue.foundedYear }) }}
          </p>
        </div>
      </li>
    </ul>

    <NuxtLink
      to="/verificacion"
      class="bento-verified__methodology underline text-sm text-[var(--color-text)]/70 hover:text-[var(--color-text)] mt-4 inline-flex items-center gap-1"
    >
      {{ $t('landing.stats.methodologyLink') }}
      <KIcon name="external-link" :size="14" aria-hidden="true" />
    </NuxtLink>
  </KSpringCard>
</template>

<script setup lang="ts">
interface VerifiedRefugio {
  id: string
  name: string
  logoUrl: string | null
  foundedYear: number | null
  verifiedAt: string
}

defineProps<{
  rescues: VerifiedRefugio[]
}>()
</script>
