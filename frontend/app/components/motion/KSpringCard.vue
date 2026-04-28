<!--
  KSpringCard — DESIGN-05 motion primitive (Plan 14-06).

  Wraps the default slot in motion-v's <motion.div>, applying a spring
  hover-lift (D-13). The `motion.div` component is auto-imported by the
  motion-v/nuxt module — there is intentionally NO `<script setup>`
  block and NO explicit import from 'motion-v' in this file. This keeps
  the bundle lean (D-16): we ride the framework's tree-shaken auto-import
  instead of pulling the full motion-v entry.

  Hover spring: stiffness 300 / damping 20 — iOS-widget feel.
  Reduced-motion: motion-v honors prefers-reduced-motion automatically.
-->
<template>
  <motion.div
    class="k-card"
    :while-hover="{
      y: -4,
      boxShadow: '0 12px 32px rgba(26,15,6,0.15)',
      borderColor: 'var(--color-terracota-500)',
    }"
    :transition="{ type: 'spring', stiffness: 300, damping: 20 }"
  >
    <slot />
  </motion.div>
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
