<template>
  <span
    role="status"
    data-testid="guidance-pill"
    :aria-label="ariaLabel"
    :data-guidance-color="guidance.color"
    :data-variant="variant"
    :data-size="size"
    :class="[
      'guidance-pill inline-flex items-center border',
      tintClass,
      sizeClass,
      variantClass,
    ]"
  >
    <!-- Card variant: horizontal icon + label only -->
    <template v-if="variant === 'card'">
      <KIcon
        :name="iconName"
        :size="size === 'sm' ? 12 : 14"
        class="flex-shrink-0"
      />
      <span class="font-semibold">{{ guidance.label }}</span>
    </template>

    <!-- Dossier variant: vertical, larger icon, optional secondary copy block -->
    <template v-else>
      <KIcon
        :name="iconName"
        :size="20"
        class="flex-shrink-0"
      />
      <span class="text-base font-semibold">{{ guidance.label }}</span>
      <span
        v-if="guidance.copy"
        data-pill-copy
        class="text-sm opacity-80 leading-snug"
      >{{ guidance.copy }}</span>
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import KIcon from '~/components/icons/KIcon.vue'
import type { Guidance, GuidanceColor } from '~/types/public-animal'

/**
 * Phase 15-05 — GuidancePill (UI-SPEC §Component Inventory + §Pill mapping).
 *
 * Presentational, props-only. NEVER recomputes the categorical mapping —
 * the API populates `guidance` from `Animal.adoptionCategory` server-side
 * (D-04). Frontend only renders.
 *
 * Color mapping (D-02 — LOCKED, identical to backend `COLORS` Record):
 *   verde → check-circle, verde-forestal tint
 *   ambar → alert-circle, ambar tint
 *   rojo  → shield,       rojo tint   (+ optional locked PUBLIC-06 copy)
 *
 * Variants per UI-SPEC §Component Inventory:
 *   card    → horizontal flex, rounded-[--radius-chip], px-3 py-1
 *   dossier → vertical   flex, rounded-[--radius-card], p-4, optional copy
 *
 * Accessibility: `role="status"` wraps the pill so screen readers announce
 * it as a status region; `aria-label` combines `label + ". " + copy?` so
 * users hear the full medical disclosure when `rojo` carries the locked copy.
 */
interface GuidancePillProps {
  guidance: Guidance
  variant?: 'card' | 'dossier'
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<GuidancePillProps>(), {
  variant: 'card',
  size: 'md',
})

const ICONS: Record<GuidanceColor, string> = {
  verde: 'check-circle',
  ambar: 'alert-circle',
  rojo: 'shield',
}

const iconName = computed(() => ICONS[props.guidance.color])

const ariaLabel = computed(() =>
  props.guidance.copy
    ? `${props.guidance.label}. ${props.guidance.copy}`
    : props.guidance.label,
)

// Tint classes — use the Phase 14 token system via Tailwind's arbitrary
// value syntax (`bg-[color:var(--color-...)]`) since the tokens are
// declared as CSS custom properties under `@theme` in main.css.
const TINTS: Record<GuidanceColor, string> = {
  verde: [
    'bg-[color:var(--color-verde-forestal-100)]',
    'dark:bg-[color:var(--color-verde-forestal-900)]',
    'text-[color:var(--color-verde-forestal-700)]',
    'dark:text-[color:var(--color-verde-forestal-300)]',
    'border-[color:var(--color-verde-forestal-300)]',
  ].join(' '),
  ambar: [
    'bg-[color:var(--color-ambar-100)]',
    'dark:bg-[color:var(--color-ambar-900)]',
    'text-[color:var(--color-ambar-700)]',
    'dark:text-[color:var(--color-ambar-300)]',
    'border-[color:var(--color-ambar-300)]',
  ].join(' '),
  rojo: [
    'bg-[color:var(--color-rojo-100)]',
    'dark:bg-[color:var(--color-rojo-900)]',
    'text-[color:var(--color-rojo-700)]',
    'dark:text-[color:var(--color-rojo-300)]',
    'border-[color:var(--color-rojo-300)]',
  ].join(' '),
}

const tintClass = computed(() => TINTS[props.guidance.color])

// Size is meaningful for the card variant only (sm vs md).
// Dossier variant uses a single internal scale regardless of `size` prop.
const sizeClass = computed(() =>
  props.size === 'sm' ? 'text-xs gap-1' : 'text-sm gap-1.5',
)

// Variant-driven layout: card is one row (rounded chip); dossier stacks.
const variantClass = computed(() =>
  props.variant === 'card'
    ? 'rounded-[--radius-chip] px-3 py-1'
    : 'rounded-[--radius-card] p-4 flex-col items-start gap-2',
)
</script>
