<template>
  <KSpringCard class="mb-6">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <KIcon :name="section.icon" :size="20" />
        <h2 class="text-xl font-bold">{{ $t(section.labelKey) }}</h2>
        <KIcon
          :name="isComplete ? 'check-circle' : 'alert-circle'"
          :size="16"
          :class="isComplete ? 'text-[var(--color-verde-forestal-500)]' : 'text-[var(--color-ambar-500)]'"
          :aria-label="isComplete ? $t('profile.section.completeAria') : $t('profile.section.incompleteAria')"
        />
      </div>
      <UButton
        v-if="!editing"
        size="xs"
        variant="ghost"
        :label="$t('profile.section.edit')"
        @click="editing = true"
      />
    </div>
    <div v-if="!editing">
      <slot name="view" />
    </div>
    <div v-else>
      <slot name="edit" />
      <UAlert v-if="errorMessage" color="error" class="mt-3" :title="errorMessage" />
      <div class="flex gap-2 mt-4">
        <UButton
          color="primary"
          :label="$t('profile.section.save')"
          :loading="saving"
          :disabled="saving"
          @click="$emit('save')"
        />
        <UButton
          variant="ghost"
          :label="$t('profile.section.cancel')"
          :disabled="saving"
          @click="onCancel"
        />
      </div>
    </div>
  </KSpringCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  section: { key: string; labelKey: string; icon: string }
  isComplete: boolean
  saving?: boolean
  errorMessage?: string | null
}>()

const emit = defineEmits<{ save: []; cancel: [] }>()

const editing = ref(false)

function onCancel() {
  editing.value = false
  emit('cancel')
}

defineExpose({ exitEditMode: () => { editing.value = false } })
</script>
