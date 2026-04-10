<template>
  <UBadge :color="badgeColor" variant="subtle">
    {{ label }}
  </UBadge>
</template>

<script setup lang="ts">
type AnimalStatus = 'AVAILABLE' | 'IN_PROCESS' | 'ADOPTED' | 'ARCHIVED'

const props = defineProps<{
  status: AnimalStatus
}>()

const { t } = useI18n()

const statusConfig: Record<AnimalStatus, { color: string; labelKey: string }> = {
  AVAILABLE: { color: 'success', labelKey: 'animals.status.available' },
  IN_PROCESS: { color: 'warning', labelKey: 'animals.status.inProcess' },
  ADOPTED: { color: 'info', labelKey: 'animals.status.adopted' },
  ARCHIVED: { color: 'neutral', labelKey: 'animals.status.archived' },
}

const badgeColor = computed(() => {
  return (statusConfig[props.status]?.color ?? 'neutral') as any
})

const label = computed(() => {
  const config = statusConfig[props.status]
  return config ? t(config.labelKey) : props.status
})
</script>
