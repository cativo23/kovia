<script setup lang="ts">
/**
 * KDisplay (DESIGN-02) — hero typography primitive.
 *
 * Animates Inter's `wght` variable axis 800 → 900 on hover via a motion-v
 * spring (D-07, D-13). The `<motion.h1>` factory is auto-imported by the
 * `motion-v/nuxt` module (registered in nuxt.config.ts), so we deliberately
 * import ONLY the three named hooks we need — keeping bundle weight inside
 * the D-16 budget.
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
  <motion.h1
    class="k-display"
    :style="{ fontVariationSettings: fontVariation }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <slot />
  </motion.h1>
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
