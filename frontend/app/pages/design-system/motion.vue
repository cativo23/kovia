<script setup lang="ts">
/**
 * Phase 14-07 — /design-system/motion.
 *
 * Exercises DESIGN-05 motion primitives:
 *   - KSpringCard: hover lift via motion-v spring (stiffness 300 / damping 20)
 *   - KPawLoader: paw-walk CSS keyframe loader
 *   - Marquee: pure CSS keyframe scrolling paw-print row (D-14, D-16)
 *   - Fade-up: IntersectionObserver-driven `.is-visible` toggle
 *
 * View Transitions (`experimental.viewTransition: true`, Plan 02) cross-fade
 * between sub-routes — verifiable by navigating tokens → motion in Chrome.
 */
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { ALL_ICON_NAMES } from '~~/tests/fixtures/icon-names'

definePageMeta({
  middleware: ['design-system'],
})

const fadeTarget = ref<HTMLElement | null>(null)
const fadeVisible = ref(false)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    fadeVisible.value = true
    return
  }
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        fadeVisible.value = true
        observer?.disconnect()
        observer = null
      }
    }
  }, { threshold: 0.2 })
  if (fadeTarget.value) observer.observe(fadeTarget.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

// Repeat the icon list so the marquee strip looks continuous
const marqueeIcons = [...ALL_ICON_NAMES.slice(0, 12), ...ALL_ICON_NAMES.slice(0, 12)]
</script>

<template>
  <section class="ds-page">
    <h1 class="ds-page__title">{{ $t('designSystem.nav.motion') }}</h1>

    <div class="ds-motion-block">
      <h2 class="ds-section__title">{{ $t('designSystem.motion.springCard') }}</h2>
      <KSpringCard>
        <p>{{ $t('designSystem.motion.springCardBody') }}</p>
      </KSpringCard>
    </div>

    <div class="ds-motion-block">
      <h2 class="ds-section__title">{{ $t('designSystem.motion.pawLoader') }}</h2>
      <KPawLoader :size="32" />
    </div>

    <div class="ds-motion-block">
      <h2 class="ds-section__title">{{ $t('designSystem.motion.marquee') }}</h2>
      <div class="ds-marquee">
        <div class="ds-marquee__track">
          <span
            v-for="(name, idx) in marqueeIcons"
            :key="`${name}-${idx}`"
            class="ds-marquee__item"
          >
            <KIcon :name="name" :size="24" />
          </span>
        </div>
      </div>
    </div>

    <div
      ref="fadeTarget"
      class="ds-motion-block ds-fade-up"
      :class="{ 'is-visible': fadeVisible }"
    >
      <h2 class="ds-section__title">{{ $t('designSystem.motion.fadeUp') }}</h2>
      <p>{{ $t('designSystem.typography.body') }}</p>
    </div>
  </section>
</template>

<style scoped>
.ds-page {
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  color: var(--color-text);
}
.ds-page__title {
  font-size: 28px;
  font-weight: 700;
}
.ds-section__title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}
.ds-motion-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ds-marquee {
  overflow: hidden;
  border-radius: var(--radius-card, 16px);
  background: var(--color-bg-secondary, rgba(0, 0, 0, 0.03));
  padding: 16px 0;
}
.ds-marquee__track {
  display: flex;
  gap: 24px;
  width: max-content;
  color: var(--color-terracota-500, #d97706);
}
.ds-marquee__item {
  display: inline-flex;
  align-items: center;
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes ds-marquee-scroll {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  .ds-marquee__track {
    animation: ds-marquee-scroll 30s linear infinite;
  }
}

.ds-fade-up {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 600ms ease, transform 600ms ease;
}
.ds-fade-up.is-visible {
  opacity: 1;
  transform: translateY(0);
}
@media (prefers-reduced-motion: reduce) {
  .ds-fade-up {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>
