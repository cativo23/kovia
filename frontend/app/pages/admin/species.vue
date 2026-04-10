<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold">{{ $t('admin.species.title') }}</h2>
        <p class="text-gray-500 mt-1">{{ $t('admin.species.description') }}</p>
      </div>
      <UButton
        icon="i-lucide-plus"
        :label="$t('admin.species.create')"
        @click="openCreateModal"
      />
    </div>

    <UCard>
      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin" />
      </div>
      <div v-else-if="speciesList.length === 0" class="text-center py-8 text-gray-500">
        {{ $t('common.noResults') }}
      </div>
      <UTable v-else :data="speciesList" :columns="columns">
        <template #slug-cell="{ row }">
          <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {{ row.original.slug }}
          </code>
        </template>
        <template #animals-cell="{ row }">
          {{ row.original._count?.animals ?? 0 }}
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-2">
            <UButton
              size="xs"
              variant="ghost"
              color="primary"
              icon="i-lucide-pencil"
              :label="$t('admin.species.edit')"
              @click="openEditModal(row.original)"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              :label="$t('admin.species.delete')"
              :disabled="(row.original._count?.animals ?? 0) > 0"
              @click="confirmDelete(row.original)"
            />
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- Create/Edit Modal -->
    <UModal v-model:open="showFormModal">
      <template #header>
        <h3 class="font-semibold">
          {{ isEditing ? $t('admin.species.edit') : $t('admin.species.create') }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">{{ $t('admin.species.name') }}</label>
            <UInput
              v-model="formName"
              :placeholder="$t('admin.species.namePlaceholder')"
              autofocus
            />
          </div>
          <div v-if="formName" class="text-sm text-gray-500">
            Slug: <code class="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{{ slugPreview }}</code>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton variant="outline" :label="$t('common.cancel')" @click="showFormModal = false" />
          <UButton
            :label="$t('common.save')"
            :loading="saving"
            :disabled="!formName.trim()"
            @click="saveSpecies"
          />
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <h3 class="font-semibold">{{ $t('admin.species.delete') }}</h3>
      </template>
      <template #body>
        <p>{{ $t('admin.species.deleteConfirm', { name: pendingDelete?.name }) }}</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton variant="outline" :label="$t('common.cancel')" @click="showDeleteModal = false" />
          <UButton
            color="error"
            :label="$t('common.confirm')"
            :loading="deleting"
            @click="executeDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
})

const { t } = useI18n()
const { get, post, patch, del } = useApi()
const toast = useToast()

interface SpeciesItem {
  id: string
  name: string
  slug: string
  createdAt: string
  _count?: { animals: number }
}

const speciesList = ref<SpeciesItem[]>([])
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)

const showFormModal = ref(false)
const showDeleteModal = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const formName = ref('')
const pendingDelete = ref<SpeciesItem | null>(null)

const columns = [
  { accessorKey: 'name', header: t('admin.species.name') },
  { accessorKey: 'slug', header: 'Slug' },
  { accessorKey: 'animals', header: t('admin.species.animalsCount') },
  { accessorKey: 'actions', header: t('common.actions') },
]

const slugPreview = computed(() => {
  return formName.value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
})

async function loadSpecies() {
  try {
    speciesList.value = await get<SpeciesItem[]>('/species')
  } catch {
    // Silently handle
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  isEditing.value = false
  editingId.value = null
  formName.value = ''
  showFormModal.value = true
}

function openEditModal(species: SpeciesItem) {
  isEditing.value = true
  editingId.value = species.id
  formName.value = species.name
  showFormModal.value = true
}

function confirmDelete(species: SpeciesItem) {
  pendingDelete.value = species
  showDeleteModal.value = true
}

async function saveSpecies() {
  saving.value = true
  try {
    if (isEditing.value && editingId.value) {
      await patch(`/admin/species/${editingId.value}`, { name: formName.value.trim() })
      toast.add({ title: t('admin.species.editSuccess'), color: 'success' })
    } else {
      await post('/admin/species', { name: formName.value.trim() })
      toast.add({ title: t('admin.species.createSuccess'), color: 'success' })
    }
    showFormModal.value = false
    await loadSpecies()
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function executeDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    await del(`/admin/species/${pendingDelete.value.id}`)
    toast.add({ title: t('admin.species.deleteSuccess'), color: 'success' })
    showDeleteModal.value = false
    await loadSpecies()
  } catch {
    toast.add({ title: t('admin.species.hasAnimals'), color: 'error' })
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  loadSpecies()
})
</script>
