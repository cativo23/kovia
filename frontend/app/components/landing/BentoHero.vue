<!--
  BentoHero — Phase 15-07 landing bento HERO cell.

  Hero composition (UI-SPEC §Component Inventory line 210, §Bento Layout):
    - KMascot variant="hero" (240/200/160 SVG-size responsive via CSS scale)
    - Headline split into 3 i18n keys so the word "hogar" gets coral pop
      (Color §reserved-for #1) via auto-escaped Vue interpolation only
      (T-15-03 mitigation).
    - Loss-framed availableCount stat (coral on the number per Color §2).
    - Subhead (Body 16/400).
    - Primary CTA → /animales; secondary CTA → /register (unauth only).

  Wrapped in KSpringCard (radius-card-lg) for the spring hover-lift carrying
  forward from Phase 14 D-13. The `[grid-area:hero]` Tailwind utility puts
  this card into the bento HERO area declared by pages/index.vue.
-->
<template>
  <KSpringCard class="bento-hero [grid-area:hero] rounded-[var(--radius-card-lg,32px)] p-8 md:p-10">
    <div class="flex flex-col items-center text-center gap-4">
      <KMascot
        variant="hero"
        :size="240"
        class="bento-hero__mascot"
        :aria-label="$t('landing.hero.day1.mascotAria')"
      />

      <h1 class="bento-hero__headline font-display font-bold leading-[1.1]">
        <span>{{ $t('landing.hero.day1.headlineBefore') }}</span>
        <span class="bento-hero__coral">{{ $t('landing.hero.day1.headlineCoral') }}</span>
        <span>{{ $t('landing.hero.day1.headlineAfter') }}</span>
      </h1>

      <p class="bento-hero__stat text-2xl font-semibold mt-2">
        <span class="bento-hero__stat-number">{{ availableCount }}</span>
        {{ $tc('landing.hero.day1.availableCount', availableCount, { n: availableCount }) }}
      </p>

      <p class="bento-hero__subhead mt-3 text-base text-[--color-text]/80 max-w-xl">
        {{ $t('landing.hero.day1.subhead') }}
      </p>

      <div class="bento-hero__ctas flex flex-col sm:flex-row gap-3 mt-6">
        <UButton
          to="/animales"
          size="lg"
          color="primary"
          class="rounded-[var(--radius-pill,9999px)]"
          :label="$t('landing.hero.cta')"
        >
          <template #leading>
            <KIcon name="search" :size="18" />
          </template>
        </UButton>

        <UButton
          v-if="!isAuthenticated"
          to="/register"
          size="lg"
          variant="ghost"
          class="rounded-[var(--radius-pill,9999px)]"
          :label="$t('nav.register')"
        />
      </div>
    </div>
  </KSpringCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'

defineProps<{
  availableCount: number
}>()

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
</script>

<style scoped>
.bento-hero__headline {
  /* Display 48 desktop / 36 tablet / 28 mobile per UI-SPEC §Typography */
  font-size: 28px;
}
@media (min-width: 640px) {
  .bento-hero__headline {
    font-size: 36px;
  }
}
@media (min-width: 1024px) {
  .bento-hero__headline {
    font-size: 48px;
  }
}

.bento-hero__coral {
  color: var(--color-coral-electrico, #ff6b47);
}

.bento-hero__stat-number {
  color: var(--color-coral-electrico, #ff6b47);
  font-weight: 800;
}

/*
 * Mascot size strategy (resolves the plan's "240 px / 200 / 160 across
 * breakpoints" requirement): KMascot's `size` prop sets both width and
 * height attributes on the inner <svg>. To make the SVG scale across
 * breakpoints WITHOUT re-mounting with a different prop value (and
 * without coupling this component to a viewport composable that doesn't
 * yet exist in the codebase), we let the SVG render at its natural 240
 * and cap its rendered size with `max-width: min(60vw, …)` per breakpoint.
 * This keeps the SVG aspect-ratio intact (it has a fixed viewBox 200x200)
 * because both width and height attrs are equal at the prop boundary.
 */
.bento-hero__mascot {
  width: 100%;
  height: auto;
  max-width: 160px;
}
@media (min-width: 640px) {
  .bento-hero__mascot {
    max-width: 200px;
  }
}
@media (min-width: 1024px) {
  .bento-hero__mascot {
    max-width: 240px;
  }
}
</style>
