<!--
  Phase 14-02 / DESIGN-01 — ThemeToggle
  ────────────────────────────────────
  Toggles `colorMode.preference` between 'light' and 'dark'. The aria-label
  describes the *action* on click (e.g. when the page is light, label says
  "Modo oscuro" because clicking would switch to dark).

  Per the plan: KIcon name="sun"/"moon" are NOT in the canonical 63-icon
  list. Use a Unicode glyph until Plan 05 promotes them. Wrapped in
  <ClientOnly> because @nuxtjs/color-mode hydrates on the client only and
  the initial SSR rendering would otherwise mismatch.
-->
<template>
  <ClientOnly>
    <UButton
      variant="ghost"
      color="neutral"
      :aria-label="ariaLabel"
      @click="toggle"
    >
      <span aria-hidden="true">{{ glyph }}</span>
    </UButton>
  </ClientOnly>
</template>

<script setup lang="ts">
const colorMode = useColorMode()
const { t } = useI18n()

const isDark = computed(() => colorMode.value === 'dark')

// aria-label = action-on-click. When in light, click would switch to dark
// so we surface the "Modo oscuro" label. When in dark, surface "Modo claro".
const ariaLabel = computed(() => (isDark.value ? t('common.theme.light') : t('common.theme.dark')))

const glyph = computed(() => (isDark.value ? '☀' : '☾'))

function toggle() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>
