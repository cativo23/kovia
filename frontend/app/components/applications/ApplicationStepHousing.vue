<template>
  <div class="space-y-4">
    <!-- Housing Type -->
    <div>
      <label class="block text-sm font-medium mb-1">
        {{ $t('applications.steps.housing.housingType') }} <span class="text-red-500">*</span>
      </label>
      <USelectMenu
        v-model="form.housingType"
        :items="housingTypeOptions"
        :placeholder="$t('applications.steps.housing.housingTypePlaceholder')"
        value-key="label"
        :color="errors.housingType ? 'error' : undefined"
      />
      <p v-if="errors.housingType" class="text-sm text-red-500 mt-1">{{ errors.housingType }}</p>
    </div>

    <!-- Ownership -->
    <div>
      <label class="block text-sm font-medium mb-2">
        {{ $t('applications.steps.housing.ownership') }} <span class="text-red-500">*</span>
      </label>
      <div class="flex gap-6">
        <label v-for="opt in ownershipOptions" :key="opt.value" class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            :value="opt.value"
            v-model="form.ownership"
            class="text-primary"
          />
          <span class="text-sm">{{ opt.label }}</span>
        </label>
      </div>
      <p v-if="errors.ownership" class="text-sm text-red-500 mt-1">{{ errors.ownership }}</p>
    </div>

    <!-- Pet Permission (conditional) -->
    <div v-if="form.ownership === 'Alquilada'">
      <label class="block text-sm font-medium mb-2">
        {{ $t('applications.steps.housing.petPermission') }} <span class="text-red-500">*</span>
      </label>
      <div class="flex gap-6">
        <label v-for="opt in petPermissionOptions" :key="opt.value" class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            :value="opt.value"
            v-model="form.petPermission"
            class="text-primary"
          />
          <span class="text-sm">{{ opt.label }}</span>
        </label>
      </div>
      <p v-if="errors.petPermission" class="text-sm text-red-500 mt-1">{{ errors.petPermission }}</p>
    </div>

    <!-- Exterior Space -->
    <div>
      <label class="block text-sm font-medium mb-1">
        {{ $t('applications.steps.housing.exteriorSpace') }} <span class="text-red-500">*</span>
      </label>
      <USelectMenu
        v-model="form.exteriorSpace"
        :items="exteriorSpaceOptions"
        :placeholder="$t('applications.steps.housing.exteriorSpacePlaceholder')"
        value-key="label"
        :color="errors.exteriorSpace ? 'error' : undefined"
      />
      <p v-if="errors.exteriorSpace" class="text-sm text-red-500 mt-1">{{ errors.exteriorSpace }}</p>
    </div>

    <!-- Adults -->
    <div>
      <label class="block text-sm font-medium mb-1">
        {{ $t('applications.steps.housing.adults') }} <span class="text-red-500">*</span>
      </label>
      <UInput
        v-model.number="form.adults"
        type="number"
        :min="1"
        :color="errors.adults ? 'error' : undefined"
      />
      <p v-if="errors.adults" class="text-sm text-red-500 mt-1">{{ errors.adults }}</p>
    </div>

    <!-- Children -->
    <div>
      <label class="block text-sm font-medium mb-1">
        {{ $t('applications.steps.housing.children') }} <span class="text-red-500">*</span>
      </label>
      <UInput
        v-model.number="form.children"
        type="number"
        :min="0"
        :color="errors.children ? 'error' : undefined"
      />
      <p class="text-xs text-gray-500 mt-1">{{ $t('applications.steps.housing.childrenHelper') }}</p>
      <p v-if="errors.children" class="text-sm text-red-500 mt-1">{{ errors.children }}</p>
    </div>

    <!-- Current Pets -->
    <div>
      <UCheckbox
        v-model="hasPets"
        :label="$t('applications.steps.housing.hasPets')"
      />
      <div v-if="hasPets" class="mt-3 space-y-2">
        <div
          v-for="(pet, index) in form.currentPets"
          :key="index"
          class="flex items-center gap-2"
        >
          <UInput
            v-model="form.currentPets[index].species"
            :placeholder="$t('applications.steps.housing.petSpeciesPlaceholder')"
            class="flex-1"
          />
          <UButton
            variant="ghost"
            color="error"
            icon="i-lucide-x"
            size="sm"
            @click="removePet(index)"
          />
        </div>
        <UButton
          variant="link"
          size="sm"
          icon="i-lucide-plus"
          :label="$t('applications.steps.housing.addPet')"
          @click="addPet"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'

const { t } = useI18n()

const housingTypeOptions = computed(() => [
  'Casa',
  'Apartamento',
  'Casa con patio',
  'Finca/propiedad rural',
  'Otro',
])

const ownershipOptions = computed(() => [
  { label: 'Propia', value: 'Propia' },
  { label: 'Alquilada', value: 'Alquilada' },
])

const petPermissionOptions = computed(() => [
  { label: 'Si', value: 'Si' },
  { label: 'No', value: 'No' },
  { label: 'No aplica', value: 'No aplica' },
])

const exteriorSpaceOptions = computed(() => [
  'Sin espacio exterior',
  'Balcon/terraza',
  'Patio pequeno (< 30m2)',
  'Patio grande (> 30m2)',
  'Jardin amplio',
])

const form = reactive({
  housingType: '',
  ownership: '',
  petPermission: '',
  exteriorSpace: '',
  adults: 1,
  children: 0,
  currentPets: [] as { species: string }[],
})

const hasPets = ref(false)
const errors = ref<Record<string, string>>({})

watch(hasPets, (val) => {
  if (!val) form.currentPets = []
})

function addPet() {
  form.currentPets.push({ species: '' })
}

function removePet(index: number) {
  form.currentPets.splice(index, 1)
}

function validate(): boolean {
  errors.value = {}

  if (!form.housingType) errors.value.housingType = t('validation.required')
  if (!form.ownership) errors.value.ownership = t('validation.required')
  if (form.ownership === 'Alquilada' && !form.petPermission) {
    errors.value.petPermission = t('validation.required')
  }
  if (!form.exteriorSpace) errors.value.exteriorSpace = t('validation.required')
  if (!form.adults || form.adults < 1) errors.value.adults = t('validation.required')
  if (form.children === null || form.children === undefined || form.children < 0) {
    errors.value.children = t('validation.required')
  }

  return Object.keys(errors.value).length === 0
}

defineExpose({ validate, form, errors })
</script>
