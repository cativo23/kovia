<template>
  <div v-if="hardFlags.length || mediumFlags.length" class="space-y-2">
    <!-- HARD flags render above MEDIUM flags -->
    <UAlert
      v-for="flag in hardFlags"
      :key="flag.code"
      color="error"
      :title="$t('scoring.flags.hardPrefix')"
      :description="flag.message"
    />
    <UAlert
      v-for="flag in mediumFlags"
      :key="flag.code"
      color="warning"
      :title="$t('scoring.flags.mediumPrefix')"
      :description="flag.message"
    />
  </div>
</template>

<script setup lang="ts">
interface RedFlag {
  severity: string
  code: string
  message: string
}

const props = defineProps<{
  redFlags: RedFlag[]
}>()

const hardFlags = computed(() => props.redFlags.filter(f => f.severity === 'hard'))
const mediumFlags = computed(() => props.redFlags.filter(f => f.severity === 'medium'))
</script>
