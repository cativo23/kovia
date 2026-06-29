<template>
  <div class="grid grid-cols-3 gap-3">
    <div
      v-for="photo in photos"
      :key="photo.id"
      class="relative aspect-square overflow-hidden"
      :style="{ borderRadius: 'var(--radius-card)' }"
    >
      <img :src="photo.url" :alt="$t('profile.photos.alt')" class="w-full h-full object-cover" />
      <UButton
        class="absolute top-1 right-1 min-w-[44px] min-h-[44px]"
        color="error"
        variant="solid"
        size="xs"
        :aria-label="$t('profile.photos.remove')"
        @click="removePhoto(photo.id)"
      >
        <KIcon name="trash-2" :size="16" />
      </UButton>
    </div>
    <button
      v-if="photos.length < maxPhotos"
      type="button"
      class="aspect-square border-2 border-dashed flex flex-col items-center justify-center gap-1"
      :style="{ borderRadius: 'var(--radius-card)', borderColor: 'var(--color-border)' }"
      :aria-label="$t('profile.photos.add')"
      @click="openFilePicker"
    >
      <KIcon name="upload-cloud" :size="24" />
      <span class="text-sm">{{ $t('profile.photos.add') }}</span>
    </button>
    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileSelected" />
  </div>
</template>

<script setup lang="ts">
import { ref, withDefaults } from 'vue'

interface ProfilePhoto {
  id: string
  url: string
  key: string
  position: number
}

const props = withDefaults(defineProps<{
  photos: ProfilePhoto[]
  maxPhotos?: number
  folder?: string
}>(), {
  maxPhotos: 5,
  folder: 'profiles',
})

const emit = defineEmits<{
  'photo-added': [photo: ProfilePhoto]
  'photo-removed': [photoId: string]
}>()

const { t } = useI18n()
const { post, del } = useApi()
const toast = useToast()
const fileInput = ref<HTMLInputElement | null>(null)

function openFilePicker() {
  fileInput.value?.click()
}

async function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement
  if (!target.files?.[0]) return
  const file = target.files[0]
  target.value = '' // Reset so same file can be selected again

  try {
    // 1. Resize image client-side to max 1200px
    const resized = await resizeImage(file)

    // 2. Get presigned URL
    const { url: presignedUrl, key, publicUrl } = await post<{ url: string; key: string; publicUrl: string }>(
      '/upload/presigned-url',
      { filename: file.name, contentType: file.type, folder: props.folder }
    )

    // 3. Upload directly to MinIO
    await fetch(presignedUrl, {
      method: 'PUT',
      body: resized,
      headers: { 'Content-Type': file.type },
    })

    // 4. Register photo in backend
    const newPhoto = await post<ProfilePhoto>('/profile/photos', {
      key,
      url: publicUrl,
      position: props.photos.length,
    })

    emit('photo-added', newPhoto)
  } catch {
    toast.add({ title: t('profile.errors.photoUploadFailed'), color: 'error' })
  }
}

async function removePhoto(photoId: string) {
  try {
    await del(`/profile/photos/${photoId}`)
    emit('photo-removed', photoId)
  } catch {
    toast.add({ title: t('profile.errors.photoRemoveFailed'), color: 'error' })
  }
}

async function resizeImage(file: File, maxWidth: number = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.width <= maxWidth) {
        resolve(file)
        return
      }
      const ratio = maxWidth / img.width
      const canvas = document.createElement('canvas')
      canvas.width = maxWidth
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        blob => blob ? resolve(blob) : resolve(file),
        file.type,
        0.85
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}
</script>
