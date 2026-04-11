<template>
  <div class="space-y-4">
    <!-- Species Experience -->
    <div>
      <label class="block text-sm font-medium mb-1">
        {{ $t('applications.steps.lifestyle.speciesExperience') }} <span class="text-red-500">*</span>
      </label>
      <USelectMenu
        v-model="form.speciesExperience"
        :items="speciesExperienceOptions"
        :placeholder="$t('applications.steps.lifestyle.speciesExperiencePlaceholder')"
        value-key="label"
        :color="errors.speciesExperience ? 'error' : undefined"
      />
      <p v-if="errors.speciesExperience" class="text-sm text-red-500 mt-1">{{ errors.speciesExperience }}</p>
    </div>

    <!-- Previous Pets -->
    <div>
      <UCheckbox
        v-model="hadPreviousPets"
        :label="$t('applications.steps.lifestyle.previousPets')"
      />
      <div v-if="hadPreviousPets" class="mt-3">
        <label class="block text-sm font-medium mb-1">
          {{ $t('applications.steps.lifestyle.previousPetsDetail') }}
        </label>
        <UTextarea
          v-model="form.previousPets"
          :rows="3"
          :placeholder="$t('applications.steps.lifestyle.previousPetsPlaceholder')"
        />
      </div>
    </div>

    <!-- Hours Alone -->
    <div>
      <label class="block text-sm font-medium mb-1">
        {{ $t('applications.steps.lifestyle.hoursAlone') }} <span class="text-red-500">*</span>
      </label>
      <USelectMenu
        v-model="form.hoursAlone"
        :items="hoursAloneOptions"
        :placeholder="$t('applications.steps.lifestyle.hoursAlonePlaceholder')"
        value-key="label"
        :color="errors.hoursAlone ? 'error' : undefined"
      />
      <p v-if="errors.hoursAlone" class="text-sm text-red-500 mt-1">{{ errors.hoursAlone }}</p>
    </div>

    <!-- Activity Level -->
    <div>
      <label class="block text-sm font-medium mb-1">
        {{ $t('applications.steps.lifestyle.activityLevel') }} <span class="text-red-500">*</span>
      </label>
      <USelectMenu
        v-model="form.activityLevel"
        :items="activityLevelOptions"
        :placeholder="$t('applications.steps.lifestyle.activityLevelPlaceholder')"
        value-key="label"
        :color="errors.activityLevel ? 'error' : undefined"
      />
      <p v-if="errors.activityLevel" class="text-sm text-red-500 mt-1">{{ errors.activityLevel }}</p>
    </div>

    <!-- Adoption Reason -->
    <div>
      <label class="block text-sm font-medium mb-1">
        {{ $t('applications.steps.lifestyle.adoptionReason') }} <span class="text-red-500">*</span>
      </label>
      <UTextarea
        v-model="form.adoptionReason"
        :rows="3"
        :maxlength="500"
        :placeholder="$t('applications.steps.lifestyle.adoptionReasonPlaceholder')"
        :color="errors.adoptionReason ? 'error' : undefined"
      />
      <p class="text-xs text-gray-400 mt-1 text-right">{{ form.adoptionReason.length }} / 500 {{ $t('applications.steps.lifestyle.characters') }}</p>
      <p v-if="errors.adoptionReason" class="text-sm text-red-500 mt-1">{{ errors.adoptionReason }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'

const { t } = useI18n()

const speciesExperienceOptions = computed(() => [
  'Primera vez con esta especie',
  'Tuve antes pero tiempo atras',
  'Tengo experiencia reciente',
  'Soy experto/criador',
])

const hoursAloneOptions = computed(() => [
  'Menos de 2 horas',
  '2-4 horas',
  '4-6 horas',
  '6-8 horas',
  'Mas de 8 horas',
])

const activityLevelOptions = computed(() => [
  'Muy tranquilo',
  'Moderado',
  'Activo',
  'Muy activo',
])

const form = reactive({
  speciesExperience: '',
  previousPets: '',
  hoursAlone: '',
  activityLevel: '',
  adoptionReason: '',
})

const hadPreviousPets = ref(false)
const errors = ref<Record<string, string>>({})

watch(hadPreviousPets, (val) => {
  if (!val) form.previousPets = ''
})

const schema = z.object({
  speciesExperience: z.string().min(1, t('validation.required')),
  hoursAlone: z.string().min(1, t('validation.required')),
  activityLevel: z.string().min(1, t('validation.required')),
  adoptionReason: z.string().min(10, t('validation.minLength', { min: 10 })).max(500, t('validation.maxLength', { max: 500 })),
})

function validate(): boolean {
  errors.value = {}
  const result = schema.safeParse(form)
  if (!result.success) {
    result.error.issues.forEach(err => {
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
