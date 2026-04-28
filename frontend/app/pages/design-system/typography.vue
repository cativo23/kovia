<script setup lang="ts">
/**
 * Phase 14-07 — /design-system/typography.
 *
 * Exercises KDisplay (DESIGN-02 Inter variable wght 800→900 spring tween)
 * and shows heading/label/body specimens for visual reference.
 */
definePageMeta({
  middleware: ['design-system'],
})
</script>

<template>
  <section class="ds-page">
    <h1 class="ds-page__title">{{ $t('designSystem.nav.typography') }}</h1>

    <KDisplay>{{ $t('designSystem.typography.displayHover') }}</KDisplay>

    <div class="ds-specimen">
      <h2 class="ds-heading">{{ $t('designSystem.typography.heading') }}</h2>
      <span class="ds-label">{{ $t('designSystem.typography.label') }}</span>
      <p class="ds-body">{{ $t('designSystem.typography.body') }}</p>
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
.ds-specimen {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 640px;
}
.ds-heading {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
}
.ds-label {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}
.ds-body {
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
}
</style>
