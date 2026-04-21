<template>
  <div class="max-w-3xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <NuxtLink
        to="/org/dashboard/animales"
        class="text-sm text-gray-500 hover:text-primary inline-flex items-center gap-1 mb-2"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        {{ $t('animals.title') }}
      </NuxtLink>
      <h2 class="text-2xl font-bold">{{ $t('animals.edit.title') }}</h2>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <!-- Not Found -->
    <UCard v-else-if="notFound" class="text-center py-8">
      <UIcon name="i-lucide-alert-circle" class="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <p class="text-gray-500">{{ $t('common.noResults') }}</p>
    </UCard>

    <template v-else>
      <!-- Form -->
      <UCard class="mb-6">
        <AnimalForm
          ref="formRef"
          mode="edit"
          :initial-data="initialData"
          :visible-sections="['basic', 'characteristics']"
          :show-section-headers="true"
          :show-actions="false"
          :submitting="submitting"
        />

        <div class="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
          <UButton
            :label="$t('animals.edit.save')"
            :loading="submitting"
            @click="saveAnimal"
          />
          <UButton
            variant="outline"
            :label="$t('animals.edit.cancel')"
            to="/org/dashboard/animales"
          />
        </div>
      </UCard>

      <!-- Photos -->
      <UCard>
        <PhotoUploader
          ref="photoUploaderRef"
          :photos="existingPhotos"
          @remove="removeExistingPhoto"
          @set-cover="setExistingCover"
          @reorder="reorderExistingPhotos"
          @photos-changed="onPhotosChanged"
        />

        <!-- Save new photos -->
        <div v-if="hasNewPhotos" class="flex gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <UButton
            :label="$t('animals.edit.save')"
            :loading="savingPhotos"
            @click="saveNewPhotos"
          />
        </div>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'org',
  middleware: ['auth', 'org'],
})

interface AnimalPhoto {
  id: string
  url: string
  key: string
  caption: string | null
  isCover: boolean
  position: number
}

interface AnimalDetail {
  id: string
  name: string
  description: string | null
  speciesId: string
  breed: string | null
  gender: string | null
  ageMonths: number | null
  size: string | null
  energyLevel: string | null
  goodWithKids: boolean
  goodWithDogs: boolean
  goodWithCats: boolean
  goodWithOtherPets: boolean
  specialNeeds: string | null
  vaccinated: boolean
  sterilized: boolean
  trained: boolean
  photos: AnimalPhoto[]
}

const { t } = useI18n()
const route = useRoute()
const { get, post, patch, del } = useApi()
const toast = useToast()

const animalId = computed(() => route.params.id as string)

const loading = ref(true)
const notFound = ref(false)
const submitting = ref(false)
const savingPhotos = ref(false)
const hasNewPhotos = ref(false)
const animal = ref<AnimalDetail | null>(null)
const formRef = ref<any>(null)
const photoUploaderRef = ref<any>(null)

const initialData = computed(() => {
  if (!animal.value) return undefined
  return {
    name: animal.value.name,
    speciesId: animal.value.speciesId,
    breed: animal.value.breed || '',
    gender: animal.value.gender || '',
    description: animal.value.description || '',
    ageMonths: animal.value.ageMonths,
    size: animal.value.size || '',
    energyLevel: animal.value.energyLevel || '',
    goodWithKids: animal.value.goodWithKids,
    goodWithDogs: animal.value.goodWithDogs,
    goodWithCats: animal.value.goodWithCats,
    goodWithOtherPets: animal.value.goodWithOtherPets,
    specialNeeds: animal.value.specialNeeds || '',
    vaccinated: animal.value.vaccinated,
    sterilized: animal.value.sterilized,
    trained: animal.value.trained,
  }
})

const existingPhotos = computed(() => {
  if (!animal.value) return []
  return animal.value.photos.map(p => ({
    id: p.id,
    url: p.url,
    key: p.key,
    caption: p.caption || '',
    isCover: p.isCover,
  }))
})

async function loadAnimal() {
  try {
    animal.value = await get<AnimalDetail>(`/animals/org/${animalId.value}`)
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

async function saveAnimal() {
  if (!formRef.value) return
  const valid = formRef.value.validate()
  if (!valid) return

  submitting.value = true
  try {
    const data = formRef.value.form
    // Build payload with only changed fields
    const payload: Record<string, any> = {}
    const fields = [
      'name', 'speciesId', 'breed', 'gender', 'description',
      'ageMonths', 'size', 'energyLevel',
      'goodWithKids', 'goodWithDogs', 'goodWithCats', 'goodWithOtherPets',
      'specialNeeds', 'vaccinated', 'sterilized', 'trained',
    ]

    for (const field of fields) {
      const value = data[field]
      if (value !== '' && value !== null && value !== undefined) {
        payload[field] = value
      }
    }

    await patch(`/animals/${animalId.value}`, payload)
    toast.add({ title: t('common.success'), color: 'success' })
  } catch (error: any) {
    toast.add({ title: t('common.error'), description: error?.data?.message || '', color: 'error' })
  } finally {
    submitting.value = false
  }
}

async function removeExistingPhoto(photoId: string) {
  try {
    await del(`/animals/${animalId.value}/photos/${photoId}`)
    // Reload animal to refresh photos
    if (animal.value) {
      animal.value.photos = animal.value.photos.filter(p => p.id !== photoId)
    }
    toast.add({ title: t('common.success'), color: 'success' })
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  }
}

async function setExistingCover(photoId: string) {
  try {
    await patch(`/animals/${animalId.value}/photos/cover`, { photoId })
    // Update local state
    if (animal.value) {
      animal.value.photos.forEach(p => {
        p.isCover = p.id === photoId
      })
    }
    toast.add({ title: t('common.success'), color: 'success' })
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  }
}

async function reorderExistingPhotos(photoIds: string[]) {
  if (!animal.value) return

  // Snapshot the current order so we can revert on failure
  const previousPhotos = [...animal.value.photos]

  // Build a map for O(1) lookup, then rebuild the array in the incoming order.
  // Any photo whose id is not in photoIds (shouldn't happen, but be defensive)
  // is appended at the end in its previous relative order.
  const byId = new Map(previousPhotos.map(p => [p.id, p]))
  const reordered: AnimalPhoto[] = []
  for (const id of photoIds) {
    const photo = byId.get(id)
    if (photo) {
      reordered.push({ ...photo, position: reordered.length })
      byId.delete(id)
    }
  }
  // Append any leftovers (defensive — preserves relative order)
  for (const leftover of previousPhotos) {
    if (byId.has(leftover.id)) {
      reordered.push({ ...leftover, position: reordered.length })
    }
  }

  // Optimistic update — this updates the computed `existingPhotos` and the
  // PhotoUploader re-renders in the new order immediately.
  animal.value.photos = reordered

  try {
    await patch(`/animals/${animalId.value}/photos/reorder`, { photoIds })
    toast.add({ title: t('common.success'), color: 'success' })
  } catch (err: any) {
    // Roll back
    if (animal.value) {
      animal.value.photos = previousPhotos
    }
    toast.add({
      title: t('common.error'),
      description: err?.data?.message || '',
      color: 'error',
    })
  }
}

function onPhotosChanged() {
  const newPhotos = photoUploaderRef.value?.getUploadedPhotos() || []
  hasNewPhotos.value = newPhotos.length > 0
}

async function saveNewPhotos() {
  const newPhotos = photoUploaderRef.value?.getUploadedPhotos() || []
  if (newPhotos.length === 0) return

  savingPhotos.value = true
  try {
    const photos = newPhotos.map((p: any) => ({
      url: p.url,
      key: p.key,
      caption: p.caption || undefined,
    }))
    await post(`/animals/${animalId.value}/photos`, { photos })

    // Reload animal to get new photo IDs
    const updated = await get<AnimalDetail>(`/animals/org/${animalId.value}`)
    animal.value = updated

    // Clear local uploaded photos
    if (photoUploaderRef.value?.localPhotos) {
      photoUploaderRef.value.localPhotos = []
    }
    hasNewPhotos.value = false

    toast.add({ title: t('common.success'), color: 'success' })
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  } finally {
    savingPhotos.value = false
  }
}

onMounted(() => {
  loadAnimal()
})
</script>
