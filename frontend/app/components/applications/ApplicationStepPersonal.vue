<template>
  <div class="space-y-4">
    <!-- Read-only user info -->
    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-1">
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}
      </p>
      <p class="text-sm text-gray-500">{{ authStore.user?.email }}</p>
    </div>

    <!-- Phone -->
    <div>
      <label class="block text-sm font-medium mb-1">
        {{ $t('applications.steps.personal.phone') }} <span class="text-red-500">*</span>
      </label>
      <UInput
        v-model="form.phone"
        type="tel"
        :placeholder="$t('applications.steps.personal.phonePlaceholder')"
        :color="errors.phone ? 'error' : undefined"
      />
      <p v-if="errors.phone" class="text-sm text-red-500 mt-1">{{ errors.phone }}</p>
    </div>

    <!-- Occupation -->
    <div>
      <label class="block text-sm font-medium mb-1">
        {{ $t('applications.steps.personal.occupation') }} <span class="text-red-500">*</span>
      </label>
      <UInput
        v-model="form.occupation"
        :placeholder="$t('applications.steps.personal.occupationPlaceholder')"
        :color="errors.occupation ? 'error' : undefined"
      />
      <p v-if="errors.occupation" class="text-sm text-red-500 mt-1">{{ errors.occupation }}</p>
    </div>

    <!-- Birth Date -->
    <div>
      <label class="block text-sm font-medium mb-1">
        {{ $t('applications.steps.personal.birthDate') }} <span class="text-red-500">*</span>
      </label>
      <UInput
        v-model="form.birthDate"
        type="date"
        :color="errors.birthDate ? 'error' : undefined"
      />
      <p v-if="errors.birthDate" class="text-sm text-red-500 mt-1">{{ errors.birthDate }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'

const { t } = useI18n()
const authStore = useAuthStore()

const schema = z.object({
  phone: z.string().min(7, t('validation.minLength', { min: 7 })),
  occupation: z.string().min(2, t('validation.minLength', { min: 2 })),
  birthDate: z.string().min(1, t('validation.required')),
})

const form = reactive({
  phone: '',
  occupation: '',
  birthDate: '',
})

const errors = ref<Record<string, string>>({})

function validate(): boolean {
  errors.value = {}
  const result = schema.safeParse(form)
  if (!result.success) {
    result.error.errors.forEach(err => {
      const field = err.path[0] as string
      if (field && !errors.value[field]) {
        errors.value[field] = err.message
      }
    })
    return false
  }
  return true
}

defineExpose({ validate, form, errors })
</script>
