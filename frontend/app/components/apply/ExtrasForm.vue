<template>
  <div class="space-y-4">
    <!-- Empty state: no questions for this animal's category -->
    <p v-if="questions.length === 0" class="text-sm text-gray-500">
      {{ $t('apply.extras.empty') }}
    </p>

    <!-- Dynamic question renderer — adopter-facing, safety-stripped field set (APPLY-05) -->
    <div v-for="question in questions" :key="question.id">
      <UFormField
        :label="question.text"
        :required="question.required"
        :error="errors[question.id]"
      >
        <!-- text input -->
        <UInput
          v-if="question.type === 'text'"
          :model-value="(modelValue[question.id] as string) ?? ''"
          :placeholder="question.placeholder"
          :aria-required="question.required"
          @update:model-value="onAnswer(question.id, $event)"
        />

        <!-- number input -->
        <UInput
          v-else-if="question.type === 'number'"
          type="number"
          :model-value="(modelValue[question.id] as number) ?? undefined"
          :placeholder="question.placeholder"
          :aria-required="question.required"
          @update:model-value="onAnswer(question.id, Number($event))"
        />

        <!-- select -->
        <USelect
          v-else-if="question.type === 'select'"
          :model-value="(modelValue[question.id] as string) ?? ''"
          :items="question.options ?? []"
          :aria-required="question.required"
          @update:model-value="onAnswer(question.id, $event)"
        />

        <!-- boolean checkbox -->
        <UCheckbox
          v-else-if="question.type === 'boolean'"
          :model-value="(modelValue[question.id] as boolean) ?? false"
          :label="question.text"
          :aria-required="question.required"
          @update:model-value="onAnswer(question.id, $event)"
        />
      </UFormField>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '#imports'

const { t } = useI18n()

/**
 * Question type for adopter-facing extras.
 * APPLY-05 regression lock: this interface is the type-level enforcement gate.
 * The sensitive field is intentionally absent — tsc fails if anyone tries to render it.
 */
interface Question {
  id: string
  text: string
  type: 'text' | 'number' | 'select' | 'boolean'
  options?: string[]
  required: boolean
  placeholder?: string
}

const props = defineProps<{
  questions: Question[]
  modelValue: Record<string, string | number | boolean>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, string | number | boolean>]
}>()

const errors = ref<Record<string, string>>({})

function onAnswer(questionId: string, value: string | number | boolean) {
  emit('update:modelValue', { ...props.modelValue, [questionId]: value })
}

/**
 * Validates that all required questions have a non-empty answer.
 * Called by the parent wizard before allowing "Continuar".
 * Returns true when all required fields are filled; false otherwise.
 */
function validate(): boolean {
  errors.value = {}

  for (const question of props.questions) {
    if (!question.required) continue

    const answer = props.modelValue[question.id]
    const isEmpty =
      answer === undefined ||
      answer === null ||
      answer === '' ||
      (typeof answer === 'number' && isNaN(answer))

    if (isEmpty) {
      errors.value[question.id] = t('apply.extras.requiredError')
    }
  }

  return Object.keys(errors.value).length === 0
}

defineExpose({ validate })
</script>
