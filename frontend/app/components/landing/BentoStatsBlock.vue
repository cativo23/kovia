<!--
  BentoStatsBlock — Phase 15-07 landing bento STATS cell.

  Renders the Day-1 stats (availableCount large + verifiedRefugiosCount
  caption + methodology link). On layoutVariant='year2' additionally shows
  totalAdoptions. Both copies live in es-SV.json; backend evaluates the
  variant per D-12 — frontend never recomputes the threshold.

  Methodology link → /verificacion (D-14).
-->
<template>
  <KSpringCard
    data-testid="bento-stats"
    class="bento-stats [grid-area:stats] rounded-[var(--radius-card,24px)] p-6"
  >
    <div class="flex flex-col gap-3">
      <!-- Primary stat: availableCount with coral pop on the number (Color §reserved-for #2). -->
      <div class="bento-stats__primary">
        <span class="bento-stats__number">{{ availableCount }}</span>
        <p class="bento-stats__caption mt-1 text-sm text-[var(--color-text)]/80">
          {{ availableCountCopy }}
        </p>
      </div>

      <!-- Verified rescues count (always shown). -->
      <div class="bento-stats__secondary mt-2">
        <p class="text-base font-semibold">
          {{ verifiedRescuesCopy }}
        </p>
        <NuxtLink
          to="/verificacion"
          class="bento-stats__methodology underline text-sm text-[var(--color-text)]/70 hover:text-[var(--color-text)] mt-1 inline-block"
        >
          {{ $t('landing.stats.methodologyLink') }}
        </NuxtLink>
      </div>

      <!-- Year-2 only: totalAdoptions third stat. -->
      <div v-if="layoutVariant === 'year2'" class="bento-stats__tertiary mt-2">
        <p class="text-base font-semibold">
          {{ totalAdoptions }}
          <span class="text-sm font-normal text-[var(--color-text)]/70">adopciones</span>
        </p>
      </div>
    </div>
  </KSpringCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  availableCount: number
  verifiedRefugiosCount: number
  totalAdoptions: number
  layoutVariant: 'day1' | 'year2'
}>()

// Use composable `t(key, named, count)` form instead of template `$tc(...)`.
// `$tc` was removed from the component-instance in vue-i18n 9+ and trips a
// runtime "TypeError: _ctx.$tc is not a function" in the SSR pipeline. Same
// fix pattern as BentoHero (15-08 Rule-1 deviation).
const { t } = useI18n()
const availableCountCopy = computed(() =>
  t('landing.hero.day1.availableCount', { n: props.availableCount }, props.availableCount),
)
const verifiedRescuesCopy = computed(() =>
  t('landing.stats.verifiedRescues', { n: props.verifiedRefugiosCount }, props.verifiedRefugiosCount),
)
</script>

<style scoped>
.bento-stats__number {
  font-family: var(--font-display, 'Inter, system-ui, sans-serif');
  font-size: 48px;
  font-weight: 800;
  color: var(--color-coral-electrico, #ff6b47);
  line-height: 1;
}
@media (min-width: 640px) {
  .bento-stats__number {
    font-size: 56px;
  }
}
</style>
