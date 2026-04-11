<template>
  <!-- Score en modo sombra: oculto hasta calibracion -->
  <template v-if="scoringEnabled">
    <p v-if="score === null || score === undefined" class="text-sm text-gray-400 italic">
      {{ $t('scoring.pending') }}
    </p>
    <UCard v-else>
      <template #header>
        <h3 class="font-semibold text-base">{{ $t('scoring.panelHeading') }}</h3>
      </template>

      <!-- Score number + risk badge -->
      <div class="flex items-center gap-3 mb-4">
        <span class="text-3xl font-bold">{{ score }}</span>
        <RiskBadge
          v-if="scoreDetails?.riskLevel"
          :risk-level="scoreDetails.riskLevel"
        />
      </div>

      <!-- Collapsible breakdown -->
      <UCollapsible v-if="scoreDetails?.categories?.length" v-model:open="breakdownOpen">
        <UButton
          variant="ghost"
          size="sm"
          class="mb-2"
          @click="breakdownOpen = !breakdownOpen"
        >
          {{ breakdownOpen ? $t('scoring.breakdownHide') : $t('scoring.breakdown') }}
        </UButton>
        <template #content>
          <div class="space-y-2 mt-2">
            <div
              v-for="cat in scoreDetails.categories"
              :key="cat.name"
              class="space-y-1"
            >
              <div class="flex justify-between text-sm">
                <span>{{ cat.label }}</span>
                <span>{{ cat.points }}/{{ cat.maxPoints }} pts</span>
              </div>
            </div>
            <!-- Soft flags shown once after the category list (not duplicated per category) -->
            <template v-if="softFlags.length">
              <p
                v-for="flag in softFlags"
                :key="flag.code"
                class="text-xs text-gray-400 italic"
              >
                {{ flag.message }}
              </p>
            </template>
          </div>
        </template>
      </UCollapsible>

      <!-- Re-score button (ORG_ADMIN only) -->
      <div v-if="authStore.isOrgAdmin" class="mt-4">
        <UButton
          color="primary"
          size="sm"
          :loading="rescoring"
          :label="rescoring ? $t('scoring.rescoring') : $t('scoring.rescore')"
          @click="handleRescore"
        />
        <p v-if="rescoreError" class="text-xs text-red-500 mt-1">
          {{ $t('scoring.rescoreError') }}
        </p>
      </div>
    </UCard>
  </template>
</template>

<script setup lang="ts">
interface CategoryScore {
  name: string
  label: string
  points: number
  maxPoints: number
  notes?: string[]
}

interface RedFlag {
  severity: string
  code: string
  message: string
}

interface ScoringResult {
  total: number
  riskLevel: string
  categories: CategoryScore[]
  redFlags: RedFlag[]
  overridden: boolean
}

const props = defineProps<{
  score: number | null
  scoreDetails: ScoringResult | null
  applicationId: string
}>()

const emit = defineEmits<{
  rescored: [score: number, scoreDetails: ScoringResult]
}>()

const config = useRuntimeConfig()
const scoringEnabled = config.public.scoringDisplayEnabled

const authStore = useAuthStore()
const { post } = useApi()

const breakdownOpen = ref(false)
const rescoring = ref(false)
const rescoreError = ref(false)

// All soft flags — displayed once after the category breakdown, not per-category
const softFlags = computed<RedFlag[]>(() => {
  if (!props.scoreDetails?.redFlags) return []
  return props.scoreDetails.redFlags.filter(f => f.severity === 'soft')
})

async function handleRescore() {
  rescoring.value = true
  rescoreError.value = false
  try {
    const result = await post<{ score: number; scoreDetails: ScoringResult }>(
      `/applications/${props.applicationId}/rescore`,
      {},
    )
    emit('rescored', result.score, result.scoreDetails)
  } catch {
    rescoreError.value = true
  } finally {
    rescoring.value = false
  }
}
</script>
