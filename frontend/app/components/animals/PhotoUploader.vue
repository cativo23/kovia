<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">{{ $t('animals.photos.title') }}</h3>
      <span class="text-sm text-gray-500">
        {{ $t('animals.photos.counter', { count: allPhotos.length, max: maxPhotos }) }}
      </span>
    </div>

    <!-- Drop Zone -->
    <div
      v-if="allPhotos.length < maxPhotos"
      class="relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer"
      :class="[
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-gray-300 dark:border-gray-700 hover:border-primary/50'
      ]"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="fileInput?.click()"
    >
      <UIcon name="i-lucide-upload-cloud" class="w-10 h-10 mx-auto mb-3 text-gray-400" />
      <p class="text-gray-600 dark:text-gray-300">{{ $t('animals.photos.dragDrop') }}</p>
      <p class="text-sm text-gray-400 mt-1">{{ $t('animals.photos.maxSize') }}</p>
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        class="hidden"
        @change="handleFileSelect"
      />
    </div>

    <div v-else class="text-center py-4 text-amber-600 dark:text-amber-400 text-sm">
      {{ $t('animals.photos.maxReached') }}
    </div>

    <!-- Photo Grid -->
    <div v-if="allPhotos.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <div
        v-for="(photo, index) in allPhotos"
        :key="photo.id || photo.tempId"
        class="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
        draggable="true"
        @dragstart="handlePhotoDragStart(index)"
        @dragover.prevent
        @drop.prevent="handlePhotoDrop(index)"
      >
        <!-- Photo -->
        <div class="aspect-square bg-gray-100 dark:bg-gray-800">
          <img
            v-if="photo.url"
            :src="photo.url"
            :alt="photo.caption || ''"
            class="w-full h-full object-cover"
          />
          <!-- Upload progress -->
          <div v-else-if="photo.uploading" class="w-full h-full flex flex-col items-center justify-center">
            <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary mb-2" />
            <span class="text-xs text-gray-500">{{ $t('animals.photos.uploading') }}</span>
          </div>
          <!-- Upload error -->
          <div v-else-if="photo.error" class="w-full h-full flex flex-col items-center justify-center p-2">
            <UIcon name="i-lucide-alert-circle" class="w-6 h-6 text-red-500 mb-2" />
            <span class="text-xs text-red-500 text-center">{{ $t('animals.photos.error') }}</span>
            <UButton
              size="xs"
              variant="ghost"
              :label="$t('animals.photos.retryUpload')"
              class="mt-1"
              @click.stop="retryUpload(photo)"
            />
          </div>
        </div>

        <!-- Overlay actions -->
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-start justify-between p-2 opacity-0 group-hover:opacity-100">
          <!-- Cover star -->
          <button
            class="p-1 rounded-full transition-colors"
            :class="photo.isCover ? 'text-yellow-400' : 'text-white hover:text-yellow-400'"
            :title="$t('animals.photos.setCover')"
            @click.stop="setCover(photo)"
          >
            <UIcon :name="photo.isCover ? 'i-lucide-star' : 'i-lucide-star'" class="w-5 h-5" :class="photo.isCover ? 'fill-yellow-400' : ''" />
          </button>

          <!-- Remove -->
          <button
            class="p-1 rounded-full text-white hover:text-red-400 transition-colors"
            :title="$t('animals.photos.remove')"
            @click.stop="removePhoto(photo, index)"
          >
            <UIcon name="i-lucide-x" class="w-5 h-5" />
          </button>
        </div>

        <!-- Cover badge -->
        <div v-if="photo.isCover" class="absolute bottom-0 left-0 right-0 bg-yellow-500/90 text-white text-xs text-center py-0.5">
          {{ $t('animals.photos.setCover') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface PhotoItem {
  id?: string
  tempId?: string
  url: string
  key: string
  caption: string
  isCover: boolean
  uploading?: boolean
  error?: boolean
  file?: File
}

const props = withDefaults(defineProps<{
  photos?: PhotoItem[]
  maxPhotos?: number
  maxSizeMB?: number
  folder?: string
}>(), {
  photos: () => [],
  maxPhotos: 10,
  maxSizeMB: 5,
  folder: 'animals',
})

const emit = defineEmits<{
  upload: [photos: PhotoItem[]]
  remove: [photoId: string]
  setCover: [photoId: string]
  reorder: [photoIds: string[]]
  photosChanged: [photos: PhotoItem[]]
}>()

const { t } = useI18n()
const { post } = useApi()
const toast = useToast()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const localPhotos = ref<PhotoItem[]>([])
const dragIndex = ref<number | null>(null)

// All photos: existing props + locally uploaded
const allPhotos = computed(() => {
  return [...props.photos, ...localPhotos.value]
})

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files) processFiles(Array.from(files))
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) {
    processFiles(Array.from(target.files))
    target.value = '' // Reset so same file can be selected again
  }
}

function processFiles(files: File[]) {
  const remaining = props.maxPhotos - allPhotos.value.length
  const validFiles = files
    .filter(f => {
      if (!f.type.match(/^image\/(jpeg|png|webp)$/)) {
        toast.add({ title: t('animals.photos.error'), description: `${f.name}: tipo no soportado`, color: 'error' })
        return false
      }
      if (f.size > props.maxSizeMB * 1024 * 1024) {
        toast.add({ title: t('animals.photos.error'), description: `${f.name}: excede ${props.maxSizeMB}MB`, color: 'error' })
        return false
      }
      return true
    })
    .slice(0, remaining)

  validFiles.forEach(file => uploadFile(file))
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

async function uploadFile(file: File) {
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const photo: PhotoItem = {
    tempId,
    url: '',
    key: '',
    caption: '',
    isCover: allPhotos.value.length === 0 && localPhotos.value.length === 0,
    uploading: true,
    error: false,
    file,
  }
  localPhotos.value.push(photo)

  try {
    // 1. Resize image client-side
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

    // Update the photo entry
    const idx = localPhotos.value.findIndex(p => p.tempId === tempId)
    const existing = localPhotos.value[idx]
    if (idx !== -1 && existing) {
      localPhotos.value[idx] = {
        ...existing,
        url: publicUrl,
        key,
        uploading: false,
        error: false,
      }
    }

    emitPhotosChanged()
  } catch {
    const idx = localPhotos.value.findIndex(p => p.tempId === tempId)
    const failedPhoto = localPhotos.value[idx]
    if (idx !== -1 && failedPhoto) {
      failedPhoto.uploading = false
      failedPhoto.error = true
    }
    toast.add({ title: t('animals.photos.error'), color: 'error' })
  }
}

async function retryUpload(photo: PhotoItem) {
  if (!photo.file) return
  // Remove failed photo and re-upload
  const idx = localPhotos.value.findIndex(p => p.tempId === photo.tempId)
  if (idx !== -1) localPhotos.value.splice(idx, 1)
  await uploadFile(photo.file)
}

function setCover(photo: PhotoItem) {
  // Update local state
  localPhotos.value.forEach(p => p.isCover = false)
  const idx = localPhotos.value.findIndex(p => (p.id || p.tempId) === (photo.id || photo.tempId))
  const target = localPhotos.value[idx]
  if (idx !== -1 && target) target.isCover = true

  // Emit for existing photos
  if (photo.id) {
    emit('setCover', photo.id)
  }

  emitPhotosChanged()
}

function removePhoto(photo: PhotoItem, index: number) {
  if (photo.id) {
    // Existing photo — emit removal for parent to handle API call
    emit('remove', photo.id)
  } else {
    // Local photo — remove from local list
    const localIdx = localPhotos.value.findIndex(p => p.tempId === photo.tempId)
    if (localIdx !== -1) localPhotos.value.splice(localIdx, 1)
  }
  emitPhotosChanged()
}

function handlePhotoDragStart(index: number) {
  dragIndex.value = index
}

function handlePhotoDrop(dropIndex: number) {
  if (dragIndex.value === null || dragIndex.value === dropIndex) return

  // Only handle reorder within local photos for now
  const totalExisting = props.photos.length
  const fromLocal = dragIndex.value - totalExisting
  const toLocal = dropIndex - totalExisting

  if (fromLocal >= 0 && toLocal >= 0 && fromLocal < localPhotos.value.length) {
    const removed = localPhotos.value.splice(fromLocal, 1)
    const item = removed[0]
    if (item) {
      localPhotos.value.splice(toLocal < 0 ? 0 : toLocal, 0, item)
    }
    emitPhotosChanged()
  }

  // For existing photos, emit reorder
  if (dragIndex.value < totalExisting && dropIndex < totalExisting) {
    const reordered = [...props.photos]
    const removed = reordered.splice(dragIndex.value, 1)
    const moved = removed[0]
    if (moved) {
      reordered.splice(dropIndex, 0, moved)
    }
    const ids = reordered.filter(p => p.id).map(p => p.id!)
    emit('reorder', ids)
  }

  dragIndex.value = null
}

function emitPhotosChanged() {
  emit('photosChanged', [...allPhotos.value])
}

// Expose local photos for parent component
function getUploadedPhotos(): PhotoItem[] {
  return localPhotos.value.filter(p => !p.uploading && !p.error && p.url)
}

function getCoverPhoto(): PhotoItem | undefined {
  return allPhotos.value.find(p => p.isCover)
}

defineExpose({ getUploadedPhotos, getCoverPhoto, localPhotos })
</script>
