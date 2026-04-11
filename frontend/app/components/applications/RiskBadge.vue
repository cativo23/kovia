<template>
  <UBadge :color="badgeColor as any" variant="subtle">
    {{ label }}
  </UBadge>
</template>

<script setup lang="ts">
const props = defineProps<{
  riskLevel: string
}>()

const { t } = useI18n()

const riskConfig: Record<string, { color: string; labelKey: string }> = {
  bajo_riesgo: { color: 'success', labelKey: 'scoring.risk.bajo_riesgo' },
  riesgo_moderado: { color: 'info', labelKey: 'scoring.risk.riesgo_moderado' },
  requiere_revision: { color: 'warning', labelKey: 'scoring.risk.requiere_revision' },
  alto_riesgo: { color: 'error', labelKey: 'scoring.risk.alto_riesgo' },
}

const badgeColor = computed(() => {
  return riskConfig[props.riskLevel]?.color ?? 'neutral'
})

const label = computed(() => {
  const config = riskConfig[props.riskLevel]
  return config ? t(config.labelKey) : props.riskLevel
})
</script>
