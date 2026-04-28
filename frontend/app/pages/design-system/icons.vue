<script setup lang="ts">
/**
 * Phase 14-07 — /design-system/icons.
 *
 * Visual reference grid for the 63 hand-authored KIcon components
 * (DESIGN-03). Imports ALL_ICON_NAMES from the test fixture so this page
 * and the Playwright @phase14 smoke share a single source of truth — if
 * the icon list grows, both update in lockstep.
 *
 * The grid container carries `data-testid="icon-grid"` so the smoke test
 * can scope its `svg` count without picking up navbar/footer extras.
 */
import { ALL_ICON_NAMES } from '~~/tests/fixtures/icon-names'

definePageMeta({
  middleware: ['design-system'],
})
</script>

<template>
  <section class="ds-page">
    <h1 class="ds-page__title">{{ $t('designSystem.icons.heading') }}</h1>
    <p class="ds-page__subtitle">{{ $t('designSystem.icons.subtitle') }}</p>

    <div data-testid="icon-grid" class="ds-icon-grid">
      <div
        v-for="name in ALL_ICON_NAMES"
        :key="name"
        class="ds-icon-cell"
        :data-k-icon="name"
      >
        <KIcon :name="name" :size="32" />
        <code class="ds-icon-cell__label">{{ name }}</code>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ds-page {
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--color-text);
}
.ds-page__title {
  font-size: 28px;
  font-weight: 700;
}
.ds-page__subtitle {
  opacity: 0.7;
}
.ds-icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.ds-icon-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border-radius: var(--radius-card, 16px);
  background: var(--color-bg-secondary, rgba(0, 0, 0, 0.03));
  color: var(--color-text);
}
.ds-icon-cell__label {
  font-size: 11px;
  opacity: 0.75;
  text-align: center;
  word-break: break-word;
}
</style>
