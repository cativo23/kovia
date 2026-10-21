<script setup lang="ts">
/**
 * Phase 14-07 — /design-system entry point.
 *
 * Middleware enforces the NUXT_PUBLIC_DESIGN_SYSTEM_ENABLED flag (T-14-09).
 * If the flag is enabled, this route immediately redirects to the tokens
 * sub-page so visitors land on real content instead of a blank index.
 */
definePageMeta({
  middleware: ['design-system'],
})

if (import.meta.server || import.meta.client) {
  await navigateTo('/design-system/tokens', { replace: true })
}
</script>

<template>
  <div />
</template>
