<template>
  <UCard>
    <template #header>
      <h3 class="font-semibold text-base">{{ $t('notes.heading') }}</h3>
    </template>

    <!-- Note list: newest at top -->
    <div v-if="notes.length" class="space-y-3 mb-4">
      <div
        v-for="note in notes"
        :key="note.id"
        class="border-b border-gray-100 pb-3 last:border-0"
      >
        <p class="text-sm">{{ note.body }}</p>
        <p class="text-xs text-neutral-400 mt-1">
          {{ note.author.firstName }} {{ note.author.lastName }} · {{ formatRelative(note.createdAt) }}
        </p>
      </div>
    </div>
    <p v-else class="text-sm text-gray-400 italic text-center py-2 mb-4">
      {{ $t('notes.empty') }}
    </p>

    <!-- Add note form -->
    <div class="space-y-2">
      <UTextarea
        v-model="newNoteBody"
        :placeholder="$t('notes.placeholder')"
        :rows="3"
        :maxlength="2000"
      />
      <UButton
        :label="$t('notes.add')"
        color="primary"
        :disabled="!newNoteBody.trim()"
        :loading="addingNote"
        @click="addNote"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface NoteAuthor {
  firstName: string
  lastName: string
}

interface Note {
  id: string
  body: string
  author: NoteAuthor
  createdAt: string
}

const props = defineProps<{
  applicationId: string
}>()

const { t } = useI18n()
const { get, post } = useApi()
const toast = useToast()
const { formatRelative } = useRelativeTime()

const notes = ref<Note[]>([])
const newNoteBody = ref('')
const addingNote = ref(false)

async function loadNotes() {
  try {
    const result = await get<Note[]>(`/applications/${props.applicationId}/notes`)
    notes.value = result
  } catch {
    // non-critical — notes will show empty state
  }
}

async function addNote() {
  if (!newNoteBody.value.trim()) return
  addingNote.value = true
  try {
    const note = await post<Note>(
      `/applications/${props.applicationId}/notes`,
      { body: newNoteBody.value.trim() },
    )
    // Prepend new note (newest first)
    notes.value.unshift(note)
    newNoteBody.value = ''
  } catch {
    toast.add({ title: t('notes.error'), color: 'error' })
  } finally {
    addingNote.value = false
  }
}

onMounted(() => {
  loadNotes()
})
</script>
