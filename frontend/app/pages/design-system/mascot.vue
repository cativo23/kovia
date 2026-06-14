<script setup lang="ts">
/**
 * Phase 14-07 — /design-system/mascot.
 *
 * Exercises every KMascot variant (hero, empty-state, loading, status)
 * plus the three status sub-variants (pending, approved, rejected).
 * Demonstrates DESIGN-04 idle animations (ear-flick, tail-wag) which
 * are pure CSS keyframes inside the component.
 */
definePageMeta({
  middleware: ['design-system'],
})
</script>

<template>
  <section class="ds-page">
    <h1 class="ds-page__title">{{ $t('designSystem.nav.mascot') }}</h1>

    <div class="ds-mascot-grid">
      <div class="ds-mascot-cell">
        <KMascot variant="hero" :size="160" />
        <code class="ds-mascot-cell__label">{{ $t('designSystem.mascot.variant.hero') }}</code>
      </div>

      <div class="ds-mascot-cell">
        <KMascot variant="empty-state" :size="160" />
        <code class="ds-mascot-cell__label">{{ $t('designSystem.mascot.variant.emptyState') }}</code>
        <p class="ds-mascot-cell__copy ds-mascot-cell__copy--heading">
          {{ $t('designSystem.emptyState.heading') }}
        </p>
        <p class="ds-mascot-cell__copy">
          {{ $t('designSystem.emptyState.body') }}
        </p>
      </div>

      <div class="ds-mascot-cell">
        <KMascot variant="loading" :size="160" />
        <code class="ds-mascot-cell__label">{{ $t('designSystem.mascot.variant.loading') }}</code>
      </div>

      <div class="ds-mascot-cell">
        <KMascot variant="status" status="pending" :size="160" />
        <code class="ds-mascot-cell__label">
          {{ $t('designSystem.mascot.variant.status') }} · {{ $t('designSystem.mascot.status.pending') }}
        </code>
      </div>

      <div class="ds-mascot-cell">
        <KMascot variant="status" status="approved" :size="160" />
        <code class="ds-mascot-cell__label">
          {{ $t('designSystem.mascot.variant.status') }} · {{ $t('designSystem.mascot.status.approved') }}
        </code>
      </div>

      <div class="ds-mascot-cell">
        <KMascot variant="status" status="rejected" :size="160" />
        <code class="ds-mascot-cell__label">
          {{ $t('designSystem.mascot.variant.status') }} · {{ $t('designSystem.mascot.status.rejected') }}
        </code>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ds-page {
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: var(--color-text);
}
.ds-page__title {
  font-size: 28px;
  font-weight: 700;
}
.ds-mascot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
}
.ds-mascot-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  border-radius: var(--radius-card, 16px);
  background: var(--color-bg-secondary, rgba(0, 0, 0, 0.03));
  text-align: center;
}
.ds-mascot-cell__label {
  font-size: 13px;
  font-weight: 600;
}
.ds-mascot-cell__copy {
  font-size: 13px;
  opacity: 0.8;
  margin: 0;
}
.ds-mascot-cell__copy--heading {
  font-weight: 600;
  opacity: 1;
}
</style>
