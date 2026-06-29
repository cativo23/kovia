<template>
  <div class="space-y-4">
    <!-- Nombre del co-aplicante (required) -->
    <UFormField
      :label="$t('apply.coAplicante.nombre')"
      required
      :error="errors.coAplicanteNombre"
    >
      <UInput
        :model-value="modelValue.coAplicanteNombre"
        :placeholder="$t('apply.coAplicante.nombrePlaceholder')"
        aria-required="true"
        @update:model-value="emit('update:modelValue', { ...modelValue, coAplicanteNombre: $event })"
      />
    </UFormField>

    <!-- Email del co-aplicante (required) -->
    <UFormField
      :label="$t('apply.coAplicante.email')"
      required
      :error="errors.coAplicanteEmail"
    >
      <UInput
        :model-value="modelValue.coAplicanteEmail"
        type="email"
        aria-required="true"
        @update:model-value="emit('update:modelValue', { ...modelValue, coAplicanteEmail: $event })"
      />
    </UFormField>

    <!-- Teléfono del co-aplicante (optional) -->
    <UFormField
      :label="$t('apply.coAplicante.phone')"
      :error="errors.coAplicantePhone"
    >
      <UInput
        :model-value="modelValue.coAplicantePhone ?? ''"
        type="tel"
        :placeholder="$t('apply.coAplicante.phonePlaceholder')"
        @update:model-value="emit('update:modelValue', { ...modelValue, coAplicantePhone: $event })"
      />
    </UFormField>

    <!-- Confirmation copy: shown when both nombre and email are non-empty -->
    <p
      v-if="modelValue.coAplicanteNombre && modelValue.coAplicanteEmail"
      class="text-sm text-gray-500 mt-3"
    >
      {{ $t('apply.coAplicante.confirmationCopy', { nombre: modelValue.coAplicanteNombre, email: modelValue.coAplicanteEmail }) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { z } from 'zod'
import { useI18n } from '#imports'

const { t } = useI18n()

interface CoAplicanteFormValue {
  coAplicanteNombre: string
  coAplicanteEmail: string
  coAplicantePhone?: string
}

const props = defineProps<{
  modelValue: CoAplicanteFormValue
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CoAplicanteFormValue]
}>()

const schema = z.object({
  coAplicanteNombre: z.string().min(1, { message: 'apply.coAplicante.errors.nombreRequired' }),
  coAplicanteEmail: z.string().email({ message: 'apply.coAplicante.errors.emailInvalid' }),
  coAplicantePhone: z.string().optional(),
})

const errors = ref<Partial<Record<keyof CoAplicanteFormValue, string>>>({})

/**
 * Validates the co-aplicante form using Zod.
 * On failure: surfaces per-field inline errors using i18n keys from issue.message.
 * Returns true iff all required fields pass validation.
 */
function validate(): boolean {
  errors.value = {}

  const result = schema.safeParse(props.modelValue)

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof CoAplicanteFormValue
      if (field && !errors.value[field]) {
        // issue.message is the i18n key; translate it
        errors.value[field] = t(issue.message as string)
      }
    }
    return false
  }

  return true
}

defineExpose({ validate })
</script>
