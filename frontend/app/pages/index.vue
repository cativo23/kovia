<!--
  Landing page — Phase 15-07 bento composition (PUBLIC-01).

  Architecture:
    - SINGLE round trip via useFetch('/public/landing-stats') per D-12 —
      the response fans out to the 5 bento cells. No per-component fetches.
    - Bento grid built with CSS Grid `grid-template-areas` across 3 tiers:
      desktop ≥1024px (4-col), tablet 640-1023px (2-col), mobile <640px
      (single column stack) per D-18 and UI-SPEC §Bento Grid Layout.
    - Each cell wraps the KSpringCard child in a <motion.div> for
      whileInView scroll-entry with an 80ms stagger per UI-SPEC §Motion
      line 377. motion-v primitives only — no `import * from 'motion-v'`
      (Performance budget §).
    - layoutVariant ('day1' | 'year2') is evaluated server-side; the
      frontend renders verbatim from the payload (D-12 boundary).
    - AdopterMarquee hides itself when adopters.length === 0 (D-15);
      featuredAnimal cell hides when null; stories/verified blocks hide
      when their arrays are empty (Day-1 zero-state per 15-04 hand-off).

  Drops the legacy `?denied=` toast — that flow predates Phase 15 and was
  not specified for the bento redesign; removed per plan task 2 step 1.
-->
<template>
  <div>
    <!-- Loading state -->
    <div v-if="pending" class="text-center py-24">
      <p class="text-base text-[--color-text]/70">{{ $t('common.loading') }}</p>
    </div>

    <!-- Error state -->
    <div v-else-if="landingError" class="text-center py-24 max-w-md mx-auto px-4">
      <h2 class="text-2xl font-semibold mb-3">{{ $t('landing.error.heading') }}</h2>
      <p class="text-base text-[--color-text]/80 mb-6">{{ $t('landing.error.body') }}</p>
      <UButton
        color="primary"
        size="lg"
        :label="$t('common.retry')"
        @click="refresh"
      />
    </div>

    <!-- Bento grid -->
    <div
      v-else-if="landing"
      class="bento-grid mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12"
    >
      <!-- HERO cell -->
      <motion.div
        :style="{ gridArea: 'hero' }"
        :initial="{ opacity: 0, y: 16 }"
        :while-in-view="{ opacity: 1, y: 0 }"
        :viewport="{ once: true }"
        :transition="{ type: 'spring', stiffness: 100, damping: 18 }"
      >
        <BentoHero :available-count="landing.availableCount" />
      </motion.div>

      <!-- STATS cell -->
      <motion.div
        :style="{ gridArea: 'stats' }"
        :initial="{ opacity: 0, y: 16 }"
        :while-in-view="{ opacity: 1, y: 0 }"
        :viewport="{ once: true }"
        :transition="{ type: 'spring', stiffness: 100, damping: 18, delay: 0.08 }"
      >
        <BentoStatsBlock
          :available-count="landing.availableCount"
          :verified-refugios-count="landing.verifiedRefugiosCount"
          :total-adoptions="landing.totalAdoptions"
          :layout-variant="layoutVariant"
        />
      </motion.div>

      <!-- FEATURED cell (hidden when null) -->
      <motion.div
        v-if="landing.featuredAnimal"
        :style="{ gridArea: 'featured' }"
        :initial="{ opacity: 0, y: 16 }"
        :while-in-view="{ opacity: 1, y: 0 }"
        :viewport="{ once: true }"
        :transition="{ type: 'spring', stiffness: 100, damping: 18, delay: 0.16 }"
      >
        <KSpringCard class="rounded-[var(--radius-card-lg,32px)] overflow-hidden p-0">
          <AnimalCard :animal="landing.featuredAnimal" mode="grid" />
        </KSpringCard>
      </motion.div>

      <!-- VERIFIED cell (hidden when empty) -->
      <motion.div
        v-if="landing.verifiedRefugios.length > 0"
        :style="{ gridArea: 'verified' }"
        :initial="{ opacity: 0, y: 16 }"
        :while-in-view="{ opacity: 1, y: 0 }"
        :viewport="{ once: true }"
        :transition="{ type: 'spring', stiffness: 100, damping: 18, delay: 0.24 }"
      >
        <VerifiedRescuesBlock :rescues="landing.verifiedRefugios" />
      </motion.div>

      <!-- STORY cells — StoriesStrip parent fragment-renders 3 direct
           grid children (each its own grid-area + stagger). Day-1 zero-state
           hides the strip entirely; the parent v-if also prevents the
           lazy-imported chunk from ever being fetched on launch (15-08
           bundle-budget mitigation). -->
      <StoriesStrip
        v-if="landing.stories.length > 0"
        :stories="landing.stories"
      />

      <!-- MARQUEE cell (full width below grid; hidden when empty per D-15) -->
      <motion.div
        v-if="landing.marqueeAdopters.length > 0"
        :style="{ gridArea: 'marquee' }"
        :initial="{ opacity: 0, y: 16 }"
        :while-in-view="{ opacity: 1, y: 0 }"
        :viewport="{ once: true }"
        :transition="{ type: 'spring', stiffness: 100, damping: 18, delay: 0.56 }"
      >
        <AdopterMarquee :adopters="landing.marqueeAdopters" />
      </motion.div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import BentoHero from '~/components/landing/BentoHero.vue'
import BentoStatsBlock from '~/components/landing/BentoStatsBlock.vue'
import VerifiedRescuesBlock from '~/components/landing/VerifiedRescuesBlock.vue'
import StoriesStrip from '~/components/landing/StoriesStrip.vue'
import AnimalCard from '~/components/animals/AnimalCard.vue'
import KSpringCard from '~/components/motion/KSpringCard.vue'
import type { AnimalPublic } from '~/types/public-animal'

// Below-the-fold cell (15-08 bundle-budget mitigation): lazy-import
// AdopterMarquee. Hidden on Day-1 (zero finalized adoptions) so its JS cost
// is wasted at launch. defineAsyncComponent moves its chunk out of the
// initial graph; the chunk is fetched on demand once the landing-stats
// payload actually carries marqueeAdopters rows.
//
// StoriesStrip stays as a static import because its template root is a
// Vue fragment (`<template v-if=...>` with `<motion.div v-for>` children).
// defineAsyncComponent + fragment-root SFCs render a warning + no-op in
// the SSR pipeline, which broke the bento layout in 15-08 testing.
const AdopterMarquee = defineAsyncComponent(
  () => import('~/components/landing/AdopterMarquee.vue'),
)

/*
 * Local mirror of the backend `PublicLandingStats` shape (backend file:
 * `backend/src/public-landing/dto/public-landing.dto.ts`, 15-04 SUMMARY).
 *
 * Inlined here rather than imported across the backend/frontend boundary
 * to keep Nuxt's tsconfig scope simple; the shape is small, owned by the
 * backend's public DTO contract, and the integration spec on 15-04
 * guarantees structural fidelity at the wire.
 */
interface AdoptionStoryPublic {
  id: string
  adopterFirstName: string
  city: string
  testimonial: string
  photoUrl: string | null
  publishedAt: string
}
interface VerifiedRefugio {
  id: string
  name: string
  logoUrl: string | null
  foundedYear: number | null
  verifiedAt: string
}
interface MarqueeAdopter {
  firstName: string
  city: string
  animalName: string
}
interface PublicLandingStats {
  availableCount: number
  verifiedRefugiosCount: number
  totalAdoptions: number
  layoutVariant: 'day1' | 'year2'
  featuredAnimal: AnimalPublic | null
  stories: AdoptionStoryPublic[]
  verifiedRefugios: VerifiedRefugio[]
  marqueeAdopters: MarqueeAdopter[]
}

definePageMeta({ layout: 'default' })

useHead({ title: 'Kovia — Adopción honesta de animales en El Salvador' })

const config = useRuntimeConfig()

const { data: landing, error: landingError, pending, refresh } = await useFetch<PublicLandingStats>(
  '/public/landing-stats',
  {
    baseURL: config.public.apiUrl as string,
  },
)

const layoutVariant = computed<'day1' | 'year2'>(
  () => landing.value?.layoutVariant ?? 'day1',
)
</script>

<style scoped>
/*
 * Bento grid template areas across 3 breakpoint tiers per UI-SPEC
 * §Bento Grid Layout lines 73-121 and RESEARCH §Bento Landing 656-712.
 *
 * Mobile <640px: default block flow (no template-areas) — each cell
 * stacks full-width in document order.
 */
.bento-grid {
  display: grid;
  gap: 16px;
  /* Implicit single-column stack on mobile; grid-template-areas explicit
     at the larger tiers below. */
}

@media (min-width: 640px) {
  .bento-grid {
    gap: 16px;
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      'hero hero'
      'stats verified'
      'featured featured'
      'story1 story2'
      'story3 story3'
      'marquee marquee';
  }
}

@media (min-width: 1024px) {
  .bento-grid {
    gap: 24px;
    grid-template-columns: repeat(4, 1fr);
    grid-template-areas:
      'hero hero stats stats'
      'hero hero stats stats'
      'featured featured verified story1'
      'featured featured verified story2'
      'marquee marquee marquee marquee';
  }
}
</style>
