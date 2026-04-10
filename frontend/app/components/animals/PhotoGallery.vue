<template>
  <div class="space-y-3">
    <!-- Main image -->
    <div
      class="relative aspect-[4/3] overflow-hidden rounded-xl bg-amber-50 cursor-pointer"
      @click="openLightbox"
    >
      <img
        v-if="activePhoto"
        :src="activePhoto.url"
        :alt="animalName"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <UIcon name="i-lucide-paw-print" class="w-20 h-20 text-amber-300" />
      </div>

      <!-- Caption overlay -->
      <div
        v-if="activePhoto?.caption"
        class="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-sm px-3 py-2"
      >
        {{ activePhoto.caption }}
      </div>

      <!-- Expand hint -->
      <div
        v-if="activePhoto"
        class="absolute top-2 right-2 bg-black/30 rounded-lg p-1.5 text-white opacity-0 hover:opacity-100 transition-opacity"
      >
        <UIcon name="i-lucide-expand" class="w-4 h-4" />
      </div>
    </div>

    <!-- Thumbnail strip (only when multiple photos) -->
    <div v-if="photos.length > 1" class="flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="(photo, idx) in photos"
        :key="photo.id"
        class="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors"
        :class="activeIndex === idx ? 'border-primary' : 'border-transparent hover:border-gray-300'"
        @click="activeIndex = idx"
      >
        <img
          :src="photo.url"
          :alt="`${animalName} foto ${idx + 1}`"
          class="w-full h-full object-cover"
        />
      </button>
    </div>

    <!-- Lightbox overlay -->
    <Teleport to="body">
      <div
        v-if="lightboxOpen"
        class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
        @click.self="lightboxOpen = false"
      >
        <button
          class="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          @click="lightboxOpen = false"
        >
          <UIcon name="i-lucide-x" class="w-8 h-8" />
        </button>

        <button
          v-if="photos.length > 1"
          class="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
          @click="prevPhoto"
        >
          <UIcon name="i-lucide-chevron-left" class="w-10 h-10" />
        </button>

        <img
          v-if="activePhoto"
          :src="activePhoto.url"
          :alt="animalName"
          class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
        />

        <button
          v-if="photos.length > 1"
          class="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
          @click="nextPhoto"
        >
          <UIcon name="i-lucide-chevron-right" class="w-10 h-10" />
        </button>

        <div
          v-if="activePhoto?.caption"
          class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-lg"
        >
          {{ activePhoto.caption }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
interface AnimalPhoto {
  id: string
  url: string
  caption: string | null
  position: number
}

const props = defineProps<{
  photos: AnimalPhoto[]
  animalName: string
}>()

const activeIndex = ref(0)
const lightboxOpen = ref(false)

const sortedPhotos = computed(() =>
  [...props.photos].sort((a, b) => a.position - b.position)
)

const activePhoto = computed(() =>
  sortedPhotos.value.length > 0 ? sortedPhotos.value[activeIndex.value] : null
)

function openLightbox() {
  if (activePhoto.value) lightboxOpen.value = true
}

function prevPhoto() {
  activeIndex.value = (activeIndex.value - 1 + sortedPhotos.value.length) % sortedPhotos.value.length
}

function nextPhoto() {
  activeIndex.value = (activeIndex.value + 1) % sortedPhotos.value.length
}

// Keyboard navigation in lightbox
onMounted(() => {
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})

function onKey(e: KeyboardEvent) {
  if (!lightboxOpen.value) return
  if (e.key === 'Escape') lightboxOpen.value = false
  if (e.key === 'ArrowLeft') prevPhoto()
  if (e.key === 'ArrowRight') nextPhoto()
}
</script>
