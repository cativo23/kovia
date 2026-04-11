<template>
  <div class="space-y-4">
    <h3 class="text-lg font-bold mb-2">{{ $t('applications.steps.photos.title') }}</h3>

    <PhotoUploader
      ref="photoUploaderRef"
      :max-photos="8"
      folder="applications"
    />

    <p class="text-sm text-gray-500">{{ $t('applications.steps.photos.requirement') }}</p>

    <p v-if="photoError" class="text-sm text-red-500">{{ photoError }}</p>
  </div>
</template>

<script setup lang="ts">
const photoUploaderRef = ref<any>(null)
const photoError = ref('')

const { t } = useI18n()

function getPhotos() {
  return photoUploaderRef.value?.getUploadedPhotos() || []
}

function validate(): boolean {
  const photos = getPhotos()
  if (photos.length < 2) {
    photoError.value = t('applications.steps.photos.minPhotosError')
    return false
  }
  photoError.value = ''
  return true
}

defineExpose({ validate, getPhotos })
</script>
