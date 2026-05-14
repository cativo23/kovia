<template>
  <div
    class="rounded-[--radius-card] border border-[color:var(--color-bg-secondary)] p-4 space-y-2"
  >
    <UCheckbox
      :model-value="modelValue"
      :label="$t('dossier.apply.ackLabel')"
      data-testid="dossier-ack-checkbox"
      aria-describedby="dossier-ack-helper"
      @update:model-value="onCheckboxUpdate"
    />
    <p
      v-if="!modelValue"
      id="dossier-ack-helper"
      class="text-sm text-[color:var(--color-text-muted)]"
    >
      {{ $t('dossier.apply.ackHelper') }}
    </p>
    <p
      v-else
      id="dossier-ack-helper"
      class="text-sm text-[color:var(--color-verde-forestal-700)] dark:text-[color:var(--color-verde-forestal-300)]"
    >
      {{ $t('dossier.apply.ackReady') }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * Phase 15-06 — DossierAckCheckbox (D-10 + PUBLIC-05).
 *
 * Wraps Nuxt UI's `UCheckbox` with a labelled ack control + dynamic helper
 * text. The helper switches from neutral muted copy to a verde-forestal
 * "ready" copy once the checkbox is ticked, giving the user a visible
 * affordance that the next CTA (Aplicar) is now enabled.
 *
 * Props are minimal (`modelValue`) so the parent owns the boolean state.
 * The component re-emits the underlying checkbox change as
 * `update:modelValue`, supporting `v-model` binding on the parent page.
 *
 * Accessibility: the helper element is referenced by `aria-describedby`
 * on the checkbox so screen readers announce the helper alongside the
 * checkbox label. The element id (`dossier-ack-helper`) is stable so
 * automated checks (Wave 0 sensor + Phase 15-08 playwright spec) can
 * target it reliably.
 *
 * Touch target: the surrounding 16px padding (`p-4`) plus the default
 * UCheckbox sizing keeps the interactive area >= 44x44px per
 * UI-SPEC §Spacing (line 62).
 */
interface DossierAckCheckboxProps {
  modelValue: boolean
}

defineProps<DossierAckCheckboxProps>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

// UCheckbox can emit `boolean | "indeterminate"`. The ack checkbox is a
// binary control, so coerce "indeterminate" to false (treated as unticked).
function onCheckboxUpdate(value: boolean | 'indeterminate') {
  emit('update:modelValue', value === true)
}
</script>
