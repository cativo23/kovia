<script setup lang="ts">
/**
 * KDisplay (DESIGN-02) — hero typography primitive (Phase 14, 15-08 fix, 15-09 bundle trim).
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
 * Phase 15-09 bundle change: motion-v hook CALLS are deferred to onMounted.
 * The static `import { useMotionValue, useSpring, useTransform }` is kept for
 * TypeScript inference, but the actual hook instantiation now happens after the
 * initial paint so the motion-v runtime is not forced into the sync module graph
 * at evaluation time. Without this, KDisplay's import pulls the full motion-v
 * runtime into the initial JS bundle even when the component hasn't mounted yet.
 *
 * Spring config (UI-SPEC Motion Contract): stiffness 200, damping 30, mass 1
 * → ≈250 ms perceived duration.
 */
import { onMounted, shallowRef, computed } from 'vue'
import { useMotionValue, useSpring, useTransform } from 'motion-v'

// Lazy refs — null until component mounts so motion-v runtime is not evaluated
// at module parse time (Phase 15-09 D-16 bundle budget).
const wght = shallowRef<ReturnType<typeof useMotionValue> | null>(null)
const spring = shallowRef<ReturnType<typeof useSpring> | null>(null)
const fontVariation = shallowRef<ReturnType<typeof useTransform> | null>(null)

// fontVariationSettings computed: returns the live transform value after mount,
// or undefined before mount (no-op — font renders at static weight 800).
const fontVariationSettings = computed(() => fontVariation.value ?? undefined)

onMounted(() => {
  wght.value = useMotionValue(800)
  spring.value = useSpring(wght.value, { stiffness: 200, damping: 30, mass: 1 })
  fontVariation.value = useTransform(spring.value, (v: number) => `'wght' ${v}`)
})

function onEnter() {
  if (wght.value) wght.value.set(900)
}
function onLeave() {
  if (wght.value) wght.value.set(800)
}
</script>

<template>
  <Motion
    as="h1"
    class="k-display"
    :style="{ fontVariationSettings: fontVariationSettings }"
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
