<template>
  <UModal :open="modelValue" @update:open="onOpenChange">
    <template #content>
      <div class="p-6">
        <h2 class="text-lg font-bold mb-2">
          {{ $t('applications.withdraw.confirmTitle') }}
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {{ $t('applications.withdraw.confirmBody', { animalName }) }}
        </p>
        <div class="flex gap-3 justify-end">
          <UButton
            variant="outline"
            :label="$t('applications.withdraw.cancelCta')"
            :disabled="withdrawing"
            @click="close"
          />
          <UButton
            color="error"
            :label="$t('applications.withdraw.confirmCta')"
            :loading="withdrawing"
            :disabled="withdrawing"
            @click="confirmWithdraw"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface ApplicationDetail {
  id: string
  status: string
  [key: string]: unknown
}

const props = defineProps<{
  modelValue: boolean
  animalName: string
  applicationId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'withdrawn': [application: ApplicationDetail]
}>()

const { t } = useI18n()
const { patch } = useApi()
const toast = useToast()

const withdrawing = ref(false)

function onOpenChange(value: boolean) {
  if (!withdrawing.value) emit('update:modelValue', value)
}

function close() {
  emit('update:modelValue', false)
}

async function confirmWithdraw() {
  withdrawing.value = true
  try {
    const updated = await patch<ApplicationDetail>(`/applications/${props.applicationId}/retirar`)
    toast.add({
      title: t('applications.withdraw.toastSuccess'),
      color: 'success',
    })
    emit('withdrawn', updated)
    emit('update:modelValue', false)
  } catch (err: any) {
    toast.add({
      title: t('applications.withdraw.toastError'),
      description: err?.data?.message || '',
      color: 'error',
    })
  } finally {
    withdrawing.value = false
  }
}
</script>
