<template>
  <div class="max-w-3xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <NuxtLink
        :to="`/animales/${animalId}`"
        class="text-sm text-gray-500 hover:text-primary inline-flex items-center gap-1 mb-2"
      >
        <KIcon name="arrow-left" :size="16" />
        {{ $t('detail.breadcrumb') }}
      </NuxtLink>
      <h2 class="text-2xl font-bold">{{ $t('detail.apply') }}</h2>
      <p v-if="animal" class="text-base text-gray-500">{{ animal.name }}</p>
    </div>

    <!-- Profile incomplete gate (should not render if onMounted redirected) -->
    <UAlert
      v-if="profileIncomplete"
      color="warning"
      :title="$t('profile.applyBlocked')"
      class="mb-6"
    >
      <template #actions>
        <UButton :label="$t('profile.goToProfile')" to="/perfil/" />
      </template>
    </UAlert>

    <!-- Wizard -->
    <template v-else>
      <!-- Step Indicator -->
      <div class="flex items-center gap-2 mb-8">
        <div
          v-for="(step, index) in steps"
          :key="index"
          class="flex items-center gap-2"
          :class="{ 'flex-1': index < steps.length - 1 }"
          :aria-current="currentStep === index ? 'step' : undefined"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
            :class="[
              currentStep > index
                ? 'bg-primary text-white'
                : currentStep === index
                  ? 'bg-primary text-white'
                  : 'bg-[var(--color-border)]/40 text-gray-500'
            ]"
          >
            <KIcon v-if="currentStep > index" name="check" :size="16" />
            <span v-else>{{ index + 1 }}</span>
          </div>
          <span
            class="text-sm hidden sm:inline"
            :class="currentStep >= index ? 'text-primary font-medium' : 'text-gray-500'"
          >
            {{ step.label }}
          </span>
          <div
            v-if="index < steps.length - 1"
            class="flex-1 h-0.5 mx-2"
            :class="currentStep > index ? 'bg-primary' : 'bg-[var(--color-border)]/40'"
          />
        </div>
      </div>

      <!-- Step Content -->
      <UCard>
        <!-- Step 1: Profile read-only preview -->
        <div v-show="currentStep === 0">
          <div v-if="profile" class="space-y-4">
            <!-- datos básicos -->
            <div class="rounded-lg border border-[var(--color-border)] p-4">
              <h3 class="text-sm font-bold mb-2">{{ $t('profile.sections.datos-basicos') }}</h3>
              <div class="space-y-1">
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.phone') }}:</span> {{ profile.phone || '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.occupation') }}:</span> {{ profile.occupation || '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.birthDate') }}:</span> {{ profile.birthDate || '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.city') }}:</span> {{ profile.city || '—' }}</p>
              </div>
            </div>
            <!-- hogar -->
            <div class="rounded-lg border border-[var(--color-border)] p-4">
              <h3 class="text-sm font-bold mb-2">{{ $t('profile.sections.hogar') }}</h3>
              <div class="space-y-1">
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.housingType') }}:</span> {{ profile.housingType || '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.ownership') }}:</span> {{ profile.ownership || '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.exteriorSpace') }}:</span> {{ profile.exteriorSpace !== null ? (profile.exteriorSpace ? $t('common.yes') : $t('common.no')) : '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.adults') }}:</span> {{ profile.adults !== null ? profile.adults : '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.children') }}:</span> {{ profile.children !== null ? profile.children : '—' }}</p>
              </div>
            </div>
            <!-- estilo de vida -->
            <div class="rounded-lg border border-[var(--color-border)] p-4">
              <h3 class="text-sm font-bold mb-2">{{ $t('profile.sections.estilo-de-vida') }}</h3>
              <div class="space-y-1">
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.activityLevel') }}:</span> {{ profile.activityLevel || '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.hoursAlone') }}:</span> {{ profile.hoursAlone !== null ? profile.hoursAlone : '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.adoptionReason') }}:</span> {{ profile.adoptionReason || '—' }}</p>
              </div>
            </div>
            <!-- experiencia -->
            <div class="rounded-lg border border-[var(--color-border)] p-4">
              <h3 class="text-sm font-bold mb-2">{{ $t('profile.sections.experiencia') }}</h3>
              <div class="space-y-1">
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.speciesExperience') }}:</span> {{ profile.speciesExperience !== null ? (profile.speciesExperience ? $t('common.yes') : $t('common.no')) : '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.additionalContext') }}:</span> {{ profile.additionalContext || '—' }}</p>
              </div>
            </div>
            <!-- fotos del hogar -->
            <div class="rounded-lg border border-[var(--color-border)] p-4">
              <h3 class="text-sm font-bold mb-2">{{ $t('profile.sections.fotos') }}</h3>
              <div v-if="profile.photos && profile.photos.length > 0" class="flex flex-wrap gap-2">
                <img
                  v-for="photo in profile.photos"
                  :key="photo.id"
                  :src="photo.url"
                  class="w-16 h-16 object-cover rounded-lg"
                  alt=""
                />
              </div>
              <p v-else class="text-sm text-gray-500">—</p>
            </div>
            <!-- Editar perfil link -->
            <div class="pt-2">
              <NuxtLink
                to="/perfil/"
                target="_blank"
                rel="noopener"
                class="text-sm underline text-primary"
              >
                {{ $t('profile.section.edit') }} {{ $t('profile.title') }}
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Step 2: Extras (animal-specific questions) -->
        <div v-show="currentStep === 1">
          <ExtrasForm
            v-if="extrasTemplate"
            ref="extrasFormRef"
            :questions="extrasTemplate.questions"
            v-model="extraAnswers"
          />
          <div v-else class="py-4">
            <p class="text-sm text-gray-500">{{ $t('apply.extras.empty') }}</p>
          </div>
        </div>

        <!-- Step 3: Co-aplicante + Submit -->
        <div v-show="currentStep === 2">
          <CoAplicanteStep
            ref="coAplicanteStepRef"
            v-model="coAplicanteForm"
          />

          <!-- Submit error -->
          <UAlert
            v-if="submitError"
            color="error"
            :title="submitError"
            class="mt-4"
          />
        </div>

        <!-- Navigation -->
        <div class="flex justify-between mt-6 pt-4 border-t border-[var(--color-border)]">
          <UButton
            v-if="currentStep > 0"
            variant="outline"
            :label="$t('apply.back')"
            @click="prevStep"
          >
            <template #leading><KIcon name="arrow-left" /></template>
          </UButton>
          <div v-else />

          <!-- Continuar (steps 1 and 2) -->
          <UButton
            v-if="currentStep < steps.length - 1"
            :label="$t('apply.next')"
            @click="nextStep"
          >
            <template #trailing>
              <KIcon name="arrow-right" :size="16" />
            </template>
          </UButton>

          <!-- Enviar aplicación (final step) -->
          <UButton
            v-else
            color="primary"
            :label="submitting ? $t('apply.submitting') : $t('apply.submit')"
            :loading="submitting"
            @click="submitApplication"
          >
            <template #leading><KIcon name="send" /></template>
          </UButton>
        </div>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ExtrasForm from '~/components/apply/ExtrasForm.vue'
import CoAplicanteStep from '~/components/apply/CoAplicanteStep.vue'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const { t } = useI18n()
const route = useRoute()
const { get, post } = useApi()
const toast = useToast()

const animalId = computed(() => route.params.id as string)

// Step refs
const extrasFormRef = ref<InstanceType<typeof ExtrasForm> | null>(null)
const coAplicanteStepRef = ref<InstanceType<typeof CoAplicanteStep> | null>(null)

// Wizard state
const currentStep = ref(0)
const submitting = ref(false)
const submitError = ref<string | null>(null)
const profileIncomplete = ref(false)

// Data
interface ProfilePhoto { id: string; url: string; key: string; position: number }
interface AdopterProfile {
  id: string; completionPct: number
  phone: string | null; occupation: string | null; birthDate: string | null; city: string | null
  housingType: string | null; ownership: string | null; exteriorSpace: boolean | null
  petPermission: boolean | null; adults: number | null; children: number | null
  currentPets: unknown[] | null; activityLevel: string | null; hoursAlone: number | null
  adoptionReason: string | null; speciesExperience: boolean | null
  previousPets: unknown[] | null; additionalContext: string | null
  photos: ProfilePhoto[]
}
interface ExtrasQuestion {
  id: string; text: string; type: 'text' | 'number' | 'select' | 'boolean'
  options?: string[]; required: boolean; placeholder?: string
}

const animal = ref<{ id: string; name: string; status: string } | null>(null)
const profile = ref<AdopterProfile | null>(null)
const extrasTemplate = ref<{ questions: ExtrasQuestion[] } | null>(null)
const extraAnswers = ref<Record<string, string | number | boolean>>({})
const coAplicanteForm = ref({ coAplicanteNombre: '', coAplicanteEmail: '', coAplicantePhone: '' })

// 3-step wizard
const steps = computed(() => [
  { label: t('apply.steps.profile') },
  { label: t('apply.steps.extras') },
  { label: t('apply.steps.coapplicant') },
])

async function nextStep() {
  if (currentStep.value === 1) {
    // Gate on extras validation (required questions)
    if (extrasFormRef.value && !extrasFormRef.value.validate()) return
  }
  if (currentStep.value < steps.value.length - 1) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

async function submitApplication() {
  // Validate co-aplicante step
  if (coAplicanteStepRef.value && !coAplicanteStepRef.value.validate()) return

  submitting.value = true
  submitError.value = null

  try {
    const payload = {
      animalId: animalId.value,
      extraAnswers: Object.entries(extraAnswers.value).map(([questionId, answer]) => ({
        questionId,
        answer,
      })),
      coAplicanteNombre: coAplicanteForm.value.coAplicanteNombre,
      coAplicanteEmail: coAplicanteForm.value.coAplicanteEmail,
      coAplicantePhone: coAplicanteForm.value.coAplicantePhone || undefined,
    }

    await post('/applications', payload)

    toast.add({
      title: t('apply.success.heading'),
      description: t('apply.success.body'),
      color: 'success',
    })

    await navigateTo('/perfil/aplicaciones?submitted=1')
  } catch (err: any) {
    submitError.value = err?.data?.message || t('apply.errors.failed')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  // 1. Check for existing application (duplicate guard)
  try {
    const check = await get<{ exists: boolean; applicationId?: string }>(
      `/applications/check?animalId=${animalId.value}`
    )
    if (check.exists && check.applicationId) {
      await navigateTo(`/perfil/aplicaciones/${check.applicationId}`)
      return
    }
  } catch {
    // If check fails (unauthenticated), middleware will handle redirect
  }

  // 2. Load animal data
  try {
    const animalData = await get<{ id: string; name: string; status: string }>(`/animals/${animalId.value}`)
    if (animalData.status !== 'AVAILABLE') {
      await navigateTo(`/animales/${animalId.value}`)
      return
    }
    animal.value = animalData
  } catch {
    await navigateTo(`/animales/${animalId.value}`)
    return
  }

  // 3. Fetch profile — redirect if incomplete (completionPct < 100)
  try {
    const profileData = await get<AdopterProfile>('/profile/me')
    if (!profileData || profileData.completionPct < 100) {
      await navigateTo('/perfil/?incomplete=1')
      return
    }
    profile.value = profileData
  } catch {
    // Profile not found or error — redirect to profile page
    await navigateTo('/perfil/?incomplete=1')
    return
  }

  // 4. Load extras template for this animal
  try {
    const template = await get<{ questions: ExtrasQuestion[] }>(`/extras-templates/${animalId.value}`)
    extrasTemplate.value = template
  } catch {
    // No template for this animal's category — empty questions, wizard still proceeds
    extrasTemplate.value = { questions: [] }
  }
})
</script>
