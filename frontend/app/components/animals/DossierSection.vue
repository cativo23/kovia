<template>
  <section class="space-y-3">
    <div class="flex items-center gap-2">
      <KIcon
        v-if="icon"
        :name="icon"
        :size="20"
        aria-hidden="true"
        class="text-[color:var(--color-terracota-500)]"
      />
      <h2 class="text-2xl font-semibold font-display">{{ heading }}</h2>
    </div>
    <div class="text-[18px] leading-[1.65]">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import KIcon from '~/components/icons/KIcon.vue'

/**
 * Phase 15-06 — DossierSection (UI-SPEC §Component Inventory + §Typography).
 *
 * Presentational wrapper for a single dossier section on the long-form
 * animal detail page. Heading + optional icon + body slot.
 *
 * Caller resolves the i18n `$t()` for the heading and passes the resolved
 * string in. Body content is passed via the default slot so callers can
 * render plain text, lists, or computed strings.
 *
 * Per UI-SPEC §Typography (line 136): dossier body text uses 18px /
 * line-height 1.65 for comfortable long-form reading.
 *
 * Section order is locked by UI-SPEC §Copywriting Contract §Dossier
 * sections (lines 306-329) — the page composes 6 of these in a specific
 * order; the component itself is order-agnostic.
 */
interface DossierSectionProps {
  heading: string
  icon?: string
}

defineProps<DossierSectionProps>()
</script>
