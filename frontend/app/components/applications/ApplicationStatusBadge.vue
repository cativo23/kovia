<template>
  <UBadge :color="badgeColor as any" variant="subtle" :size="size">
    {{ label }}
  </UBadge>
</template>

<script setup lang="ts">
type ApplicationStatus =
  | 'ENVIADA'
  | 'REVISANDO'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'SEGUIMIENTO'
  | 'ADOPTADA'
  | 'RETIRADA'

const props = defineProps<{
  status: ApplicationStatus
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}>()

const { t } = useI18n()

const statusConfig: Record<ApplicationStatus, { color: string; labelKey: string }> = {
  ENVIADA: { color: 'info', labelKey: 'applications.status.enviada' },
  REVISANDO: { color: 'warning', labelKey: 'applications.status.revisando' },
  APROBADA: { color: 'success', labelKey: 'applications.status.aprobada' },
  RECHAZADA: { color: 'error', labelKey: 'applications.status.rechazada' },
  SEGUIMIENTO: { color: 'warning', labelKey: 'applications.status.seguimiento' },
  ADOPTADA: { color: 'success', labelKey: 'applications.status.adoptada' },
  RETIRADA: { color: 'neutral', labelKey: 'applications.status.retirada' },
}

const badgeColor = computed(() => {
  return (statusConfig[props.status]?.color ?? 'neutral') as any
})

const label = computed(() => {
  const config = statusConfig[props.status]
  return config ? t(config.labelKey) : props.status
})
</script>
