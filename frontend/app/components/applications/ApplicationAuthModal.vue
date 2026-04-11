<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <div class="p-6">
        <h2 class="text-lg font-bold mb-2">{{ $t('applications.authModal.title') }}</h2>
        <p class="text-sm text-gray-500 mb-6">{{ $t('applications.authModal.description') }}</p>
        <div class="flex flex-col sm:flex-row gap-3">
          <UButton
            block
            :label="$t('applications.authModal.register')"
            :to="`/auth/register?redirect=/animales/${animalId}/aplicar`"
          />
          <UButton
            block
            variant="outline"
            :label="$t('applications.authModal.login')"
            :to="`/auth/login?redirect=/animales/${animalId}/aplicar`"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  animalId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})
</script>
