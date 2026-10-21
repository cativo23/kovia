<template>
  <NuxtLayout name="default">
    <div class="max-w-2xl mx-auto py-8 px-4">
      <h1 class="text-2xl font-bold mb-6">{{ $t('profile.title') }}</h1>

      <!-- Loading skeleton -->
      <div v-if="loading" class="space-y-6">
        <UCard v-for="i in 5" :key="i" class="animate-pulse">
          <div class="h-6 bg-[var(--color-border)]/40 rounded w-1/3 mb-3" />
          <div class="h-4 bg-[var(--color-border)]/40 rounded w-2/3" />
        </UCard>
      </div>

      <!-- Error -->
      <UAlert
        v-else-if="error"
        color="error"
        :title="$t('profile.errors.loadFailed')"
        class="mb-4"
      >
        <template #actions>
          <UButton :label="$t('common.retry')" @click="loadProfile" />
        </template>
      </UAlert>

      <!-- Empty state (no profile created yet) -->
      <div v-else-if="!profile" class="text-center py-12">
        <KMascot variant="empty-state" class="mx-auto mb-6" />
        <h2 class="text-xl font-bold mb-2">{{ $t('profile.empty.heading') }}</h2>
        <p class="text-gray-500">{{ $t('profile.empty.body') }}</p>
      </div>

      <!-- Profile content -->
      <div v-else>
        <ProfileCompletionBar
          :completion-pct="profile.completionPct"
          :sections="sectionCompletionPips"
        />

        <div class="space-y-6">
          <ProfileSection
            v-for="(section, index) in sectionDefs"
            :key="section.key"
            :ref="(el) => setSectionRef(el, index)"
            :section="section"
            :is-complete="isSectionComplete(section.key)"
            :saving="savingSection === section.key"
            :error-message="sectionErrors[section.key]"
            @save="saveSection(section.key)"
            @cancel="onSectionCancel(section.key)"
          >
            <template #view>
              <!-- datos-basicos view -->
              <div v-if="section.key === 'datos-basicos'" class="space-y-2">
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.phone') }}:</span> {{ profile.phone || '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.occupation') }}:</span> {{ profile.occupation || '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.birthDate') }}:</span> {{ profile.birthDate || '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.city') }}:</span> {{ profile.city || '—' }}</p>
              </div>

              <!-- hogar view -->
              <div v-else-if="section.key === 'hogar'" class="space-y-2">
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.housingType') }}:</span> {{ profile.housingType || '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.ownership') }}:</span> {{ profile.ownership || '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.exteriorSpace') }}:</span> {{ profile.exteriorSpace !== null ? (profile.exteriorSpace ? $t('common.yes') : $t('common.no')) : '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.petPermission') }}:</span> {{ profile.petPermission !== null ? (profile.petPermission ? $t('common.yes') : $t('common.no')) : '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.adults') }}:</span> {{ profile.adults !== null ? profile.adults : '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.children') }}:</span> {{ profile.children !== null ? profile.children : '—' }}</p>
              </div>

              <!-- estilo-de-vida view -->
              <div v-else-if="section.key === 'estilo-de-vida'" class="space-y-2">
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.activityLevel') }}:</span> {{ profile.activityLevel || '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.hoursAlone') }}:</span> {{ profile.hoursAlone !== null ? profile.hoursAlone : '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.adoptionReason') }}:</span> {{ profile.adoptionReason || '—' }}</p>
              </div>

              <!-- experiencia view -->
              <div v-else-if="section.key === 'experiencia'" class="space-y-2">
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.speciesExperience') }}:</span> {{ profile.speciesExperience !== null ? (profile.speciesExperience ? $t('common.yes') : $t('common.no')) : '—' }}</p>
                <p class="text-sm"><span class="font-medium">{{ $t('profile.fields.additionalContext') }}:</span> {{ profile.additionalContext || '—' }}</p>
              </div>

              <!-- fotos view -->
              <div v-else-if="section.key === 'fotos'">
                <ProfilePhotoManager
                  :photos="profile.photos"
                  @photo-added="loadProfile"
                  @photo-removed="loadProfile"
                />
              </div>
            </template>

            <template #edit>
              <!-- datos-basicos edit — hidden edit button for fotos (editing = view for photos) -->
              <div v-if="section.key === 'datos-basicos'" class="space-y-4">
                <UFormField :label="$t('profile.fields.phone')">
                  <UInput v-model="editBuffers['datos-basicos'].phone" />
                </UFormField>
                <UFormField :label="$t('profile.fields.occupation')">
                  <UInput v-model="editBuffers['datos-basicos'].occupation" />
                </UFormField>
                <UFormField :label="$t('profile.fields.birthDate')">
                  <UInput v-model="editBuffers['datos-basicos'].birthDate" type="date" />
                </UFormField>
                <UFormField :label="$t('profile.fields.city')">
                  <UInput v-model="editBuffers['datos-basicos'].city" />
                </UFormField>
              </div>

              <!-- hogar edit -->
              <div v-else-if="section.key === 'hogar'" class="space-y-4">
                <UFormField :label="$t('profile.fields.housingType')">
                  <UInput v-model="editBuffers['hogar'].housingType" />
                </UFormField>
                <UFormField :label="$t('profile.fields.ownership')">
                  <UInput v-model="editBuffers['hogar'].ownership" />
                </UFormField>
                <UFormField :label="$t('profile.fields.exteriorSpace')">
                  <UCheckbox v-model="editBuffers['hogar'].exteriorSpace" />
                </UFormField>
                <UFormField :label="$t('profile.fields.petPermission')">
                  <UCheckbox v-model="editBuffers['hogar'].petPermission" />
                </UFormField>
                <UFormField :label="$t('profile.fields.adults')">
                  <UInput v-model.number="editBuffers['hogar'].adults" type="number" />
                </UFormField>
                <UFormField :label="$t('profile.fields.children')">
                  <UInput v-model.number="editBuffers['hogar'].children" type="number" />
                </UFormField>
              </div>

              <!-- estilo-de-vida edit -->
              <div v-else-if="section.key === 'estilo-de-vida'" class="space-y-4">
                <UFormField :label="$t('profile.fields.activityLevel')">
                  <UInput v-model="editBuffers['estilo-de-vida'].activityLevel" />
                </UFormField>
                <UFormField :label="$t('profile.fields.hoursAlone')">
                  <UInput v-model.number="editBuffers['estilo-de-vida'].hoursAlone" type="number" />
                </UFormField>
                <UFormField :label="$t('profile.fields.adoptionReason')">
                  <UInput v-model="editBuffers['estilo-de-vida'].adoptionReason" />
                </UFormField>
              </div>

              <!-- experiencia edit -->
              <div v-else-if="section.key === 'experiencia'" class="space-y-4">
                <UFormField :label="$t('profile.fields.speciesExperience')">
                  <UCheckbox v-model="editBuffers['experiencia'].speciesExperience" />
                </UFormField>
                <UFormField :label="$t('profile.fields.additionalContext')">
                  <UInput v-model="editBuffers['experiencia'].additionalContext" />
                </UFormField>
              </div>

              <!-- fotos edit — same as view (photo management is always inline per D-03) -->
              <div v-else-if="section.key === 'fotos'">
                <ProfilePhotoManager
                  :photos="profile.photos"
                  @photo-added="loadProfile"
                  @photo-removed="loadProfile"
                />
              </div>
            </template>
          </ProfileSection>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const { t } = useI18n()
const { get, patch } = useApi()
const toast = useToast()

interface ProfilePhoto {
  id: string
  url: string
  key: string
  position: number
}

interface AdopterProfile {
  id: string
  phone: string | null
  occupation: string | null
  birthDate: string | null
  city: string | null
  housingType: string | null
  ownership: string | null
  exteriorSpace: boolean | null
  petPermission: boolean | null
  adults: number | null
  children: number | null
  currentPets: unknown[] | null
  activityLevel: string | null
  hoursAlone: number | null
  adoptionReason: string | null
  speciesExperience: boolean | null
  previousPets: unknown[] | null
  additionalContext: string | null
  photos: ProfilePhoto[]
  completionPct: number
}

const sectionDefs = [
  { key: 'datos-basicos', labelKey: 'profile.sections.datos-basicos', icon: 'user' },
  { key: 'hogar', labelKey: 'profile.sections.hogar', icon: 'building' },
  { key: 'estilo-de-vida', labelKey: 'profile.sections.estilo-de-vida', icon: 'activity' },
  { key: 'experiencia', labelKey: 'profile.sections.experiencia', icon: 'paw-print' },
  { key: 'fotos', labelKey: 'profile.sections.fotos', icon: 'upload-cloud' },
]

const profile = ref<AdopterProfile | null>(null)
const loading = ref(true)
const error = ref(false)
const savingSection = ref<string | null>(null)
const sectionErrors = ref<Record<string, string | null>>({
  'datos-basicos': null,
  'hogar': null,
  'estilo-de-vida': null,
  'experiencia': null,
  'fotos': null,
})

// Edit buffers — copy of profile data for each section, committed on save
const editBuffers = ref<Record<string, Record<string, unknown>>>({
  'datos-basicos': {},
  'hogar': {},
  'estilo-de-vida': {},
  'experiencia': {},
  'fotos': {},
})

// Section refs for calling exitEditMode() after successful save
const sectionRefs = ref<(InstanceType<typeof import('../../../components/profile/ProfileSection.vue').default> | null)[]>([])

function setSectionRef(el: unknown, index: number) {
  sectionRefs.value[index] = el as InstanceType<typeof import('../../../components/profile/ProfileSection.vue').default> | null
}

function isSectionComplete(key: string): boolean {
  if (!profile.value) return false
  const p = profile.value
  switch (key) {
    case 'datos-basicos': return Boolean(p.phone && p.occupation && p.birthDate)
    case 'hogar': return Boolean(p.housingType && p.ownership && p.adults !== null && p.adults !== undefined)
    case 'estilo-de-vida': return Boolean(p.activityLevel && p.hoursAlone !== null && p.adoptionReason)
    case 'experiencia': return p.speciesExperience !== null && p.speciesExperience !== undefined
    case 'fotos': return (p.photos?.length ?? 0) >= 1
    default: return false
  }
}

const sectionCompletionPips = computed(() =>
  sectionDefs.map(s => ({ key: s.key, complete: isSectionComplete(s.key) }))
)

function initEditBuffers(p: AdopterProfile) {
  editBuffers.value = {
    'datos-basicos': { phone: p.phone, occupation: p.occupation, birthDate: p.birthDate, city: p.city },
    'hogar': { housingType: p.housingType, ownership: p.ownership, exteriorSpace: p.exteriorSpace, petPermission: p.petPermission, adults: p.adults, children: p.children },
    'estilo-de-vida': { activityLevel: p.activityLevel, hoursAlone: p.hoursAlone, adoptionReason: p.adoptionReason },
    'experiencia': { speciesExperience: p.speciesExperience, additionalContext: p.additionalContext },
    'fotos': {},
  }
}

async function loadProfile() {
  loading.value = true
  error.value = false
  try {
    const result = await get<AdopterProfile>('/profile/me')
    profile.value = result
    initEditBuffers(result)
  } catch (err: unknown) {
    const apiErr = err as { status?: number }
    if (apiErr?.status === 404) {
      profile.value = null
    } else {
      error.value = true
    }
  } finally {
    loading.value = false
  }
}

async function saveSection(key: string) {
  savingSection.value = key
  sectionErrors.value[key] = null
  try {
    await patch(`/profile/section/${key}`, editBuffers.value[key])
    await loadProfile()
    // Find the section ref by key and exit edit mode
    const sectionIndex = sectionDefs.findIndex(s => s.key === key)
    if (sectionIndex !== -1) {
      sectionRefs.value[sectionIndex]?.exitEditMode()
    }
    toast.add({ title: t('common.success'), color: 'success' })
  } catch (err: unknown) {
    const apiErr = err as { data?: { message?: string } }
    sectionErrors.value[key] = apiErr?.data?.message || t('profile.errors.saveFailed')
  } finally {
    savingSection.value = null
  }
}

function onSectionCancel(key: string) {
  // Re-initialize buffer from current profile
  if (profile.value) {
    initEditBuffers(profile.value)
  }
  sectionErrors.value[key] = null
}

onMounted(() => {
  loadProfile()
})
</script>
