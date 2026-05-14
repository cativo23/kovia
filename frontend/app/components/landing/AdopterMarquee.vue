<!--
  AdopterMarquee — Phase 15-07 landing MARQUEE cell.

  Privacy-safe marquee of recent adopters (firstName + city + animalName
  ONLY — see backend D-15 / T-15-04). Hidden entirely when adopters list
  is empty (Day-1 zero-state per D-15).

  Implementation per UI-SPEC §Motion §AdopterMarquee — pure CSS @keyframes
  (NOT motion-v) because:
    (1) Marquee is a deterministic loop with no spring solver value;
    (2) Two lines of CSS vs ~30 lines of motion-v sequence glue;
    (3) `prefers-reduced-motion` honored declaratively via media-query
        wrapper — no JS code path needed (T-15-Motion-Vestibular mitigation).

  The track contains the adopter list duplicated TWICE so the -50%
  translate yields a seamless loop. Pauses on hover via
  `animation-play-state: paused`.
-->
<template>
  <div
    v-if="adopters.length > 0"
    class="adopter-marquee [grid-area:marquee] overflow-hidden"
    :aria-label="$t('landing.marquee.ariaLabel')"
    role="region"
  >
    <div class="adopter-marquee__track flex gap-8 whitespace-nowrap">
      <span
        v-for="(adopter, i) in doubledAdopters"
        :key="i"
        class="adopter-marquee__item inline-flex items-center text-sm text-[--color-text]/70"
      >
        <KIcon name="heart" :size="14" class="mr-2 text-[--color-coral-electrico,#ff6b47]" aria-hidden="true" />
        {{ $t('landing.marquee.item', {
          firstName: adopter.firstName,
          animalName: adopter.animalName,
          city: adopter.city,
        }) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface MarqueeAdopter {
  firstName: string
  city: string
  animalName: string
}

const props = defineProps<{
  adopters: MarqueeAdopter[]
}>()

// Duplicate the list twice for seamless loop (animation translates -50%).
const doubledAdopters = computed(() => [...props.adopters, ...props.adopters])
</script>

<style scoped>
.adopter-marquee {
  padding: 16px 0;
  background: var(--color-bg-secondary, rgba(0, 0, 0, 0.03));
  border-radius: var(--radius-card, 24px);
}

.adopter-marquee__track {
  width: max-content;
}

@media (prefers-reduced-motion: no-preference) {
  @keyframes marquee-scroll {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }

  .adopter-marquee__track {
    animation: marquee-scroll 30s linear infinite;
  }

  .adopter-marquee:hover .adopter-marquee__track,
  .adopter-marquee:focus-within .adopter-marquee__track {
    animation-play-state: paused;
  }
}
</style>
