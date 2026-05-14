<script setup lang="ts">
/**
 * KDisplay (DESIGN-02) — hero typography primitive (Phase 14, 15-08 fix).
 *
 * Animates Inter's `wght` variable axis 800 → 900 on hover via a motion-v
 * spring (D-07, D-13). Uses `<Motion as="h1">` — the Nuxt module
 * (`motion-v/nuxt`) auto-imports CAPITAL-CASE components only (`Motion`,
 * `M`, `AnimatePresence`, etc.). The lowercase `<motion.h1>` dot-notation
 * is a SCRIPT-LEVEL proxy export, NOT a template-resolvable component —
 * using it produces a Vue runtime warning and renders the heading as
 * `<!---->`. Latent Phase 14 bug fixed in 15-08 (see 15-08-SUMMARY
 * §Regression Diagnosis).
 *
 * Hooks imports stay narrow (only the three we need) to honor the D-16
 * bundle budget.
 *
 * Spring config (UI-SPEC Motion Contract): stiffness 200, damping 30, mass 1
 * → ≈250 ms perceived duration.
 */
import { useMotionValue, useSpring, useTransform } from 'motion-v'

const wght = useMotionValue(800)
const spring = useSpring(wght, { stiffness: 200, damping: 30, mass: 1 })
const fontVariation = useTransform(spring, (v) => `'wght' ${v}`)

function onEnter() { wght.set(900) }
function onLeave() { wght.set(800) }
</script>

<template>
  <Motion
    as="h1"
    class="k-display"
    :style="{ fontVariationSettings: fontVariation }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <slot />
  </Motion>
</template>

<style scoped>
.k-display {
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 56px);
  line-height: 1.2;
  color: var(--color-text);
  /* Static fallback for non-variable Inter installs; spring overrides at runtime. */
  font-weight: 800;
}
</style>
