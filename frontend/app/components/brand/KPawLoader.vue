<script setup lang="ts">
/**
 * KPawLoader — DESIGN-05 paw-walk loading indicator (Plan 14-06).
 *
 * Renders 4 paw glyphs with staggered animation-delay so the loop
 * "walks" left-to-right at ~0.8s/cycle. Pure CSS keyframes (D-14, D-16):
 * zero JS scheduler. Animation gated on `prefers-reduced-motion`.
 *
 * a11y: role="status" + aria-live="polite" announces loading state to
 * assistive tech. SR-only label uses i18n key `common.loading`.
 */
withDefaults(defineProps<{ size?: number }>(), { size: 24 })
</script>

<template>
  <div
    class="k-paw-loader"
    role="status"
    aria-live="polite"
    :style="{ '--paw-size': `${size}px` }"
  >
    <span class="sr-only">{{ $t('common.loading') }}</span>
    <span v-for="i in 4" :key="i" :class="`paw paw-${i}`">
      <KIcon name="paw-print" :size="size" />
    </span>
  </div>
</template>

<style scoped>
.k-paw-loader {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  color: var(--color-accent, var(--color-terracota-500, #c97c5d));
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.paw {
  display: inline-block;
  line-height: 0;
}

@media (prefers-reduced-motion: no-preference) {
  @keyframes paw-walk {
    0% {
      opacity: 0;
      transform: scale(0.8);
    }
    25%,
    75% {
      opacity: 1;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(0.8);
    }
  }

  .paw {
    animation: paw-walk 0.8s ease-in-out infinite;
  }

  .paw-1 {
    animation-delay: 0s;
  }
  .paw-2 {
    animation-delay: 0.2s;
  }
  .paw-3 {
    animation-delay: 0.4s;
  }
  .paw-4 {
    animation-delay: 0.6s;
  }
}
</style>
