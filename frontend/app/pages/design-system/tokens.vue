<script setup lang="ts">
/**
 * Phase 14-07 — /design-system/tokens.
 *
 * Visual swatches for raw + semantic color tokens, the 5 radius tokens,
 * and the 7-step spacing scale. All values come from CSS custom
 * properties declared in `assets/css/main.css` — this page is a viewer,
 * not a token source. Switching the theme toggle should reflow the
 * swatches automatically.
 */
definePageMeta({
  middleware: ['design-system'],
})

interface Swatch {
  name: string
  varName: string
}

const rawColors: Swatch[] = [
  { name: 'cream', varName: '--color-cream' },
  { name: 'terracota-500', varName: '--color-terracota-500' },
  { name: 'verde-forestal-500', varName: '--color-verde-forestal-500' },
  { name: 'coral-electrico', varName: '--color-coral-electrico' },
  { name: 'marron-profundo', varName: '--color-marron-profundo' },
  { name: 'ambar-500', varName: '--color-ambar-500' },
  { name: 'rojo-500', varName: '--color-rojo-500' },
]

const semanticColors: Swatch[] = [
  { name: 'bg', varName: '--color-bg' },
  { name: 'bg-secondary', varName: '--color-bg-secondary' },
  { name: 'text', varName: '--color-text' },
  { name: 'border', varName: '--color-border' },
  { name: 'accent', varName: '--color-accent' },
]

const radiusTokens = [
  { name: 'icon', varName: '--radius-icon' },
  { name: 'chip', varName: '--radius-chip' },
  { name: 'card', varName: '--radius-card' },
  { name: 'card-lg', varName: '--radius-card-lg' },
  { name: 'pill', varName: '--radius-pill' },
]

const spacingTokens = [
  { name: 'xs', value: '4px' },
  { name: 'sm', value: '8px' },
  { name: 'md', value: '16px' },
  { name: 'lg', value: '24px' },
  { name: 'xl', value: '32px' },
  { name: '2xl', value: '48px' },
  { name: '3xl', value: '64px' },
]
</script>

<template>
  <section class="ds-page">
    <h1 class="ds-page__title">{{ $t('designSystem.nav.tokens') }}</h1>

    <h2 class="ds-section__title">{{ $t('designSystem.tokens.rawColors') }}</h2>
    <div class="ds-grid ds-grid--swatch">
      <div v-for="c in rawColors" :key="c.varName" class="ds-swatch">
        <div class="ds-swatch__chip" :style="{ background: `var(${c.varName})` }" />
        <code class="ds-swatch__label">{{ c.name }}</code>
        <code class="ds-swatch__var">{{ c.varName }}</code>
      </div>
    </div>

    <h2 class="ds-section__title">{{ $t('designSystem.tokens.semanticColors') }}</h2>
    <div class="ds-grid ds-grid--swatch">
      <div v-for="c in semanticColors" :key="c.varName" class="ds-swatch">
        <div class="ds-swatch__chip" :style="{ background: `var(${c.varName})` }" />
        <code class="ds-swatch__label">{{ c.name }}</code>
        <code class="ds-swatch__var">{{ c.varName }}</code>
      </div>
    </div>

    <h2 class="ds-section__title">{{ $t('designSystem.tokens.radius') }}</h2>
    <div class="ds-grid ds-grid--radius">
      <div v-for="r in radiusTokens" :key="r.varName" class="ds-radius">
        <div
          class="ds-radius__box"
          :style="{ borderRadius: `var(${r.varName})` }"
        />
        <code class="ds-swatch__label">{{ r.name }}</code>
        <code class="ds-swatch__var">{{ r.varName }}</code>
      </div>
    </div>

    <h2 class="ds-section__title">{{ $t('designSystem.tokens.spacing') }}</h2>
    <div class="ds-spacing">
      <div v-for="s in spacingTokens" :key="s.name" class="ds-spacing__row">
        <code class="ds-spacing__name">{{ s.name }}</code>
        <div class="ds-spacing__bar" :style="{ width: s.value }" />
        <code class="ds-spacing__value">{{ s.value }}</code>
      </div>
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
  font-size: 20px;
  font-weight: 600;
  margin-top: 16px;
}
.ds-grid {
  display: grid;
  gap: 16px;
}
.ds-grid--swatch {
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}
.ds-grid--radius {
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
}
.ds-swatch,
.ds-radius {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}
.ds-swatch__chip {
  width: 100%;
  height: 64px;
  border-radius: var(--radius-card, 16px);
  border: 1px solid var(--color-border, rgba(0, 0, 0, 0.08));
}
.ds-radius__box {
  width: 80px;
  height: 80px;
  background: var(--color-terracota-500, #d97706);
}
.ds-swatch__label {
  font-size: 14px;
  font-weight: 600;
}
.ds-swatch__var {
  font-size: 11px;
  opacity: 0.6;
}
.ds-spacing {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ds-spacing__row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ds-spacing__name {
  width: 36px;
  font-weight: 600;
}
.ds-spacing__bar {
  height: 12px;
  background: var(--color-terracota-500, #d97706);
  border-radius: 4px;
}
.ds-spacing__value {
  font-size: 12px;
  opacity: 0.7;
}
</style>
