<!--
  KSpringCard — DESIGN-05 motion primitive (Plan 14-06; 15-08 fix).

  Wraps the default slot in motion-v's Motion component (default tag "div"),
  applying a spring hover-lift (D-13). The Nuxt module (motion-v/nuxt) only
  auto-imports CAPITAL-CASE component names: Motion, M, AnimatePresence,
  LayoutGroup, MotionConfig, ReorderGroup, ReorderItem. The lowercase
  motion.div dot-notation factory is a SCRIPT-LEVEL Proxy exported from
  motion-v, not a template-resolvable component — the prior comment in
  this file that claimed motion.div was auto-imported was incorrect
  (Phase 14 latent bug fixed in 15-08; see 15-08-SUMMARY §Regression
  Diagnosis). Using motion.div in a template emits the Vue runtime warning
  "Failed to resolve component: motion.div" and renders the cell as an
  empty comment node.

  No script setup block is needed: Motion is registered as a global Nuxt
  component via motion-v/nuxt, same as UButton, UCheckbox, etc.

  Hover spring: stiffness 300 / damping 20 — iOS-widget feel.
  Reduced-motion: motion-v honors prefers-reduced-motion automatically.
-->
<template>
  <Motion
    class="k-card"
    :while-hover="{
      y: -4,
      boxShadow: '0 12px 32px rgba(26,15,6,0.15)',
      borderColor: 'var(--color-terracota-500)',
    }"
    :transition="{ type: 'spring', stiffness: 300, damping: 20 }"
  >
    <slot />
  </Motion>
</template>

<style scoped>
.k-card {
  background: var(--color-bg-secondary, var(--color-cream-100, #faf3e8));
  border: 1px solid var(--color-border, var(--color-cream-300, #e8d8c0));
  border-radius: var(--radius-card, 16px);
  padding: 24px;
  cursor: pointer;
}
</style>
