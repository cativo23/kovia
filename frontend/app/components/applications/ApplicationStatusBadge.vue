<template>
  <UBadge :color="badgeColor as any" variant="subtle">
    {{ label }}
  </UBadge>
</template>

<script setup lang="ts">
type ApplicationStatus = 'ENVIADA' | 'REVISANDO' | 'APROBADA' | 'RECHAZADA' | 'SEGUIMIENTO' | 'ADOPTADA' | 'RETIRADA'

const props = defineProps<{
  status: string
}>()

const { t } = useI18n()

const colorMap: Record<string, string> = {
  ENVIADA: 'info',
  REVISANDO: 'warning',
  APROBADA: 'success',
  RECHAZADA: 'error',
  SEGUIMIENTO: 'warning',
  ADOPTADA: 'success',
  RETIRADA: 'neutral',
}

const labelMap: Record<string, string> = {
  ENVIADA: 'applications.status.enviada',
  REVISANDO: 'applications.status.revisando',
  APROBADA: 'applications.status.aprobada',
  RECHAZADA: 'applications.status.rechazada',
  SEGUIMIENTO: 'applications.status.seguimiento',
  ADOPTADA: 'applications.status.adoptada',
  RETIRADA: 'applications.status.retirada',
}

const badgeColor = computed(() => colorMap[props.status] ?? 'neutral')

const label = computed(() => {
  const key = labelMap[props.status]
  return key ? t(key) : props.status
})
</script>
