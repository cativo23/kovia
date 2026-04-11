<template>
  <form @submit.prevent="handleSubmit">
    <!-- Informacion basica -->
    <div v-show="visibleSections.includes('basic')" class="space-y-4">
      <h3 v-if="showSectionHeaders" class="text-lg font-semibold mb-4">
        {{ $t('animals.wizard.step1') }}
      </h3>

      <!-- Name -->
      <div>
        <label class="block text-sm font-medium mb-1">
          {{ $t('animals.form.name') }} <span class="text-red-500">*</span>
        </label>
        <UInput
          v-model="form.name"
          :placeholder="$t('animals.form.namePlaceholder')"
          :color="errors.name ? 'error' : undefined"
        />
        <p v-if="errors.name" class="text-sm text-red-500 mt-1">{{ errors.name }}</p>
      </div>

      <!-- Species -->
      <div>
        <label class="block text-sm font-medium mb-1">
          {{ $t('animals.form.species') }} <span class="text-red-500">*</span>
        </label>
        <USelectMenu
          v-model="form.speciesId"
          :items="speciesOptions"
          :placeholder="$t('animals.form.speciesPlaceholder')"
          value-key="value"
          :color="errors.speciesId ? 'error' : undefined"
        />
        <p v-if="errors.speciesId" class="text-sm text-red-500 mt-1">{{ errors.speciesId }}</p>
      </div>

      <!-- Breed -->
      <div>
        <label class="block text-sm font-medium mb-1">{{ $t('animals.form.breed') }}</label>
        <UInput
          v-model="form.breed"
          :placeholder="$t('animals.form.breedPlaceholder')"
        />
      </div>

      <!-- Gender -->
      <div>
        <label class="block text-sm font-medium mb-1">{{ $t('animals.form.gender') }}</label>
        <USelectMenu
          v-model="form.gender"
          :items="genderOptions"
          :placeholder="$t('animals.form.genderPlaceholder')"
          value-key="value"
        />
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium mb-1">{{ $t('animals.form.description') }}</label>
        <UTextarea
          v-model="form.description"
          :placeholder="$t('animals.form.descriptionPlaceholder')"
          :rows="3"
        />
      </div>
    </div>

    <!-- Caracteristicas -->
    <div v-show="visibleSections.includes('characteristics')" class="space-y-4">
      <h3 v-if="showSectionHeaders" class="text-lg font-semibold mb-4">
        {{ $t('animals.wizard.step2') }}
      </h3>

      <!-- Age -->
      <div>
        <label class="block text-sm font-medium mb-1">{{ $t('animals.form.age') }}</label>
        <div class="flex items-center gap-3">
          <UInput
            v-model.number="ageYears"
            type="number"
            :min="0"
            :max="30"
            class="w-24"
          />
          <span class="text-sm text-gray-500">{{ $t('animals.form.ageYears') }}</span>
          <UInput
            v-model.number="ageMonths"
            type="number"
            :min="0"
            :max="11"
            class="w-24"
          />
          <span class="text-sm text-gray-500">{{ $t('animals.form.ageMonths') }}</span>
        </div>
      </div>

      <!-- Size -->
      <div>
        <label class="block text-sm font-medium mb-1">{{ $t('animals.form.size') }}</label>
        <USelectMenu
          v-model="form.size"
          :items="sizeOptions"
          :placeholder="$t('animals.form.sizePlaceholder')"
          value-key="value"
        />
      </div>

      <!-- Energy Level -->
      <div>
        <label class="block text-sm font-medium mb-1">{{ $t('animals.form.energyLevel') }}</label>
        <USelectMenu
          v-model="form.energyLevel"
          :items="energyOptions"
          :placeholder="$t('animals.form.energyPlaceholder')"
          value-key="value"
        />
      </div>

      <!-- Compatibility -->
      <div>
        <label class="block text-sm font-medium mb-2">{{ $t('animals.form.compatibility') }}</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UCheckbox v-model="form.goodWithKids" :label="$t('animals.form.goodWithKids')" />
          <UCheckbox v-model="form.goodWithDogs" :label="$t('animals.form.goodWithDogs')" />
          <UCheckbox v-model="form.goodWithCats" :label="$t('animals.form.goodWithCats')" />
          <UCheckbox v-model="form.goodWithOtherPets" :label="$t('animals.form.goodWithOtherPets')" />
        </div>
      </div>

      <!-- Special Needs -->
      <div>
        <label class="block text-sm font-medium mb-1">{{ $t('animals.form.specialNeeds') }}</label>
        <UTextarea
          v-model="form.specialNeeds"
          :placeholder="$t('animals.form.specialNeedsPlaceholder')"
          :rows="2"
        />
      </div>

      <!-- Health -->
      <div>
        <label class="block text-sm font-medium mb-2">{{ $t('animals.form.health') }}</label>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <UCheckbox v-model="form.vaccinated" :label="$t('animals.form.vaccinated')" />
          <UCheckbox v-model="form.sterilized" :label="$t('animals.form.sterilized')" />
          <UCheckbox v-model="form.trained" :label="$t('animals.form.trained')" />
        </div>
      </div>
    </div>

    <!-- Actions (only shown in edit mode or when all sections visible) -->
    <div v-if="showActions" class="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
      <UButton
        type="submit"
        :label="mode === 'create' ? $t('animals.wizard.create') : $t('animals.edit.save')"
        :loading="submitting"
      />
      <UButton
        variant="outline"
        :label="$t('animals.edit.cancel')"
        @click="emit('cancel')"
      />
    </div>
  </form>
</template>

<script setup lang="ts">
interface AnimalFormData {
  name: string
  speciesId: string
  breed: string
  gender: string
  description: string
  ageMonths: number | null
  size: string
  energyLevel: string
  goodWithKids: boolean
  goodWithDogs: boolean
  goodWithCats: boolean
  goodWithOtherPets: boolean
  specialNeeds: string
  vaccinated: boolean
  sterilized: boolean
  trained: boolean
}

interface Species {
  id: string
  name: string
  slug: string
}

const props = withDefaults(defineProps<{
  initialData?: Partial<AnimalFormData>
  mode?: 'create' | 'edit'
  visibleSections?: string[]
  showSectionHeaders?: boolean
  showActions?: boolean
  submitting?: boolean
}>(), {
  mode: 'create',
  visibleSections: () => ['basic', 'characteristics'],
  showSectionHeaders: true,
  showActions: true,
  submitting: false,
})

const emit = defineEmits<{
  submit: [data: AnimalFormData]
  cancel: []
}>()

const { t } = useI18n()
const { get } = useApi()

const speciesList = ref<Species[]>([])
const errors = ref<Record<string, string>>({})

// Age fields: split ageMonths into years + months for display
const ageYears = ref(0)
const ageMonths = ref(0)

const form = reactive<AnimalFormData>({
  name: '',
  speciesId: '',
  breed: '',
  gender: '',
  description: '',
  ageMonths: null,
  size: '',
  energyLevel: '',
  goodWithKids: false,
  goodWithDogs: false,
  goodWithCats: false,
  goodWithOtherPets: false,
  specialNeeds: '',
  vaccinated: false,
  sterilized: false,
  trained: false,
})

// Initialize from props
if (props.initialData) {
  Object.assign(form, props.initialData)
  if (props.initialData.ageMonths != null) {
    ageYears.value = Math.floor(props.initialData.ageMonths / 12)
    ageMonths.value = props.initialData.ageMonths % 12
  }
}

// Sync age fields to form.ageMonths
watch([ageYears, ageMonths], ([y, m]) => {
  const totalMonths = (y || 0) * 12 + (m || 0)
  form.ageMonths = totalMonths > 0 ? totalMonths : null
})

const speciesOptions = computed(() =>
  speciesList.value.map(s => ({ label: s.name, value: s.id }))
)

const genderOptions = computed(() => [
  { label: t('animals.form.genderOptions.male'), value: 'MALE' },
  { label: t('animals.form.genderOptions.female'), value: 'FEMALE' },
  { label: t('animals.form.genderOptions.unknown'), value: 'UNKNOWN' },
])

const sizeOptions = computed(() => [
  { label: t('animals.form.sizeOptions.small'), value: 'SMALL' },
  { label: t('animals.form.sizeOptions.medium'), value: 'MEDIUM' },
  { label: t('animals.form.sizeOptions.large'), value: 'LARGE' },
  { label: t('animals.form.sizeOptions.extraLarge'), value: 'EXTRA_LARGE' },
])

const energyOptions = computed(() => [
  { label: t('animals.form.energyOptions.low'), value: 'LOW' },
  { label: t('animals.form.energyOptions.medium'), value: 'MEDIUM' },
  { label: t('animals.form.energyOptions.high'), value: 'HIGH' },
])

function validate(sections?: string[]): boolean {
  errors.value = {}
  const checkSections = sections || props.visibleSections

  if (checkSections.includes('basic')) {
    if (!form.name || form.name.trim().length < 2) {
      errors.value.name = t('validation.minLength', { min: 2 })
    } else if (form.name.length > 100) {
      errors.value.name = t('validation.maxLength', { max: 100 })
    }
    if (!form.speciesId) {
      errors.value.speciesId = t('validation.required')
    }
  }

  return Object.keys(errors.value).length === 0
}

function handleSubmit() {
  if (!validate()) return
  emit('submit', { ...form })
}

async function loadSpecies() {
  try {
    speciesList.value = await get<Species[]>('/species')
  } catch {
    // Silently handle
  }
}

// Expose validate and form for parent component
defineExpose({ validate, form, errors })

onMounted(() => {
  loadSpecies()
})
</script>
