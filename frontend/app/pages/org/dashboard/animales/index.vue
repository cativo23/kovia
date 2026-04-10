<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold">{{ $t('animals.title') }}</h2>
      <UButton
        icon="i-lucide-plus"
        :label="$t('animals.create')"
        to="/org/dashboard/animales/nuevo"
      />
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <!-- Status filter tabs -->
      <div class="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          class="px-3 py-1.5 text-sm rounded-md transition-colors"
          :class="[
            activeStatus === tab.value
              ? 'bg-white dark:bg-gray-900 text-primary font-medium shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          ]"
          @click="setStatusFilter(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Search -->
      <div class="flex-1 min-w-[200px] max-w-sm">
        <UInput
          v-model="searchQuery"
          :placeholder="$t('animals.search')"
          icon="i-lucide-search"
          @update:model-value="debouncedSearch"
        />
      </div>
    </div>

    <!-- Table -->
    <UCard>
      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin" />
      </div>

      <div v-else-if="animals.length === 0" class="text-center py-12">
        <UIcon name="i-lucide-paw-print" class="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p class="text-gray-500 mb-4">{{ $t('animals.empty') }}</p>
        <UButton
          icon="i-lucide-plus"
          :label="$t('animals.create')"
          to="/org/dashboard/animales/nuevo"
        />
      </div>

      <UTable v-else :data="animals" :columns="columns">
        <template #photo-cell="{ row }">
          <img
            v-if="row.original.coverPhotoUrl"
            :src="row.original.coverPhotoUrl"
            :alt="row.original.name"
            class="w-12 h-12 rounded-lg object-cover"
          />
          <div v-else class="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <UIcon name="i-lucide-paw-print" class="w-6 h-6 text-gray-400" />
          </div>
        </template>

        <template #name-cell="{ row }">
          <span class="font-medium">{{ row.original.name }}</span>
        </template>

        <template #species-cell="{ row }">
          {{ row.original.species?.name ?? '-' }}
        </template>

        <template #status-cell="{ row }">
          <AnimalsStatusBadge :status="row.original.status" />
        </template>

        <template #age-cell="{ row }">
          {{ formatAge(row.original.ageMonths) }}
        </template>

        <template #actions-cell="{ row }">
          <UDropdownMenu :items="getActionItems(row.original)">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-more-horizontal"
              size="sm"
            />
          </UDropdownMenu>
        </template>
      </UTable>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
        <p class="text-sm text-gray-500">
          {{ total }} {{ $t('animals.title').toLowerCase() }}
        </p>
        <div class="flex gap-2">
          <UButton
            variant="outline"
            size="sm"
            icon="i-lucide-chevron-left"
            :disabled="page <= 1"
            @click="page--; loadAnimals()"
          />
          <span class="flex items-center px-3 text-sm text-gray-600 dark:text-gray-300">
            {{ page }} / {{ totalPages }}
          </span>
          <UButton
            variant="outline"
            size="sm"
            icon="i-lucide-chevron-right"
            :disabled="page >= totalPages"
            @click="page++; loadAnimals()"
          />
        </div>
      </div>
    </UCard>

    <!-- Archive Confirmation Modal -->
    <UModal v-model:open="showArchiveModal">
      <template #header>
        <h3 class="font-semibold">{{ $t('animals.actions.archive') }}</h3>
      </template>
      <template #body>
        <p>{{ $t('animals.confirm.archive') }}</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton variant="outline" :label="$t('common.cancel')" @click="showArchiveModal = false" />
          <UButton
            color="warning"
            :label="$t('common.confirm')"
            :loading="actionLoading"
            @click="executeArchive"
          />
        </div>
      </template>
    </UModal>

    <!-- Restore Confirmation Modal -->
    <UModal v-model:open="showRestoreModal">
      <template #header>
        <h3 class="font-semibold">{{ $t('animals.actions.restore') }}</h3>
      </template>
      <template #body>
        <p>{{ $t('animals.confirm.restore') }}</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton variant="outline" :label="$t('common.cancel')" @click="showRestoreModal = false" />
          <UButton
            color="primary"
            :label="$t('common.confirm')"
            :loading="actionLoading"
            @click="executeRestore"
          />
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <h3 class="font-semibold text-red-600">{{ $t('animals.actions.delete') }}</h3>
      </template>
      <template #body>
        <div class="space-y-2">
          <p>{{ $t('animals.confirm.delete') }}</p>
          <p class="text-sm text-red-600 font-medium">{{ $t('animals.confirm.deleteWarning') }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton variant="outline" :label="$t('common.cancel')" @click="showDeleteModal = false" />
          <UButton
            color="error"
            :label="$t('common.confirm')"
            :loading="actionLoading"
            @click="executeDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'org',
  middleware: ['auth', 'org'],
})

type AnimalStatus = 'AVAILABLE' | 'IN_PROCESS' | 'ADOPTED' | 'ARCHIVED'

interface Animal {
  id: string
  name: string
  status: AnimalStatus
  ageMonths: number | null
  coverPhotoUrl: string | null
  species: { name: string } | null
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const { t } = useI18n()
const { get, patch, del } = useApi()
const toast = useToast()

const animals = ref<Animal[]>([])
const loading = ref(true)
const page = ref(1)
const total = ref(0)
const totalPages = ref(0)
const activeStatus = ref<string>('')
const searchQuery = ref('')
const searchTerm = ref('')

const actionLoading = ref(false)
const showArchiveModal = ref(false)
const showRestoreModal = ref(false)
const showDeleteModal = ref(false)
const pendingAnimal = ref<Animal | null>(null)

const limit = 15

const statusTabs = computed(() => [
  { label: t('animals.filter.all'), value: '' },
  { label: t('animals.status.available'), value: 'AVAILABLE' },
  { label: t('animals.status.inProcess'), value: 'IN_PROCESS' },
  { label: t('animals.status.adopted'), value: 'ADOPTED' },
  { label: t('animals.status.archived'), value: 'ARCHIVED' },
])

const columns = [
  { accessorKey: 'photo', header: '' },
  { accessorKey: 'name', header: t('animals.table.name') },
  { accessorKey: 'species', header: t('animals.table.species') },
  { accessorKey: 'status', header: t('animals.table.status') },
  { accessorKey: 'age', header: t('animals.table.age') },
  { accessorKey: 'actions', header: t('common.actions') },
]

function formatAge(months: number | null): string {
  if (months == null) return '-'
  if (months < 1) return t('animals.age.newborn')
  if (months < 12) return `${months} ${t('animals.age.months')}`
  const years = Math.floor(months / 12)
  const remaining = months % 12
  if (remaining === 0) return `${years} ${t('animals.age.years')}`
  return `${years} ${t('animals.age.years')} ${remaining} ${t('animals.age.months')}`
}

let debounceTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedSearch() {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    searchTerm.value = searchQuery.value
    page.value = 1
    loadAnimals()
  }, 300)
}

function setStatusFilter(status: string) {
  activeStatus.value = status
  page.value = 1
  loadAnimals()
}

function getActionItems(animal: Animal) {
  const items: any[][] = [
    [{
      label: t('animals.actions.edit'),
      icon: 'i-lucide-pencil',
      to: `/org/dashboard/animales/${animal.id}/editar`,
    }],
  ]

  // Status change submenu
  if (animal.status !== 'ARCHIVED') {
    const statusOptions: any[] = []
    if (animal.status !== 'AVAILABLE') {
      statusOptions.push({
        label: t('animals.status.available'),
        icon: 'i-lucide-check-circle',
        onSelect: () => changeStatus(animal, 'AVAILABLE'),
      })
    }
    if (animal.status !== 'IN_PROCESS') {
      statusOptions.push({
        label: t('animals.status.inProcess'),
        icon: 'i-lucide-clock',
        onSelect: () => changeStatus(animal, 'IN_PROCESS'),
      })
    }
    if (animal.status !== 'ADOPTED') {
      statusOptions.push({
        label: t('animals.status.adopted'),
        icon: 'i-lucide-heart',
        onSelect: () => changeStatus(animal, 'ADOPTED'),
      })
    }
    if (statusOptions.length > 0) {
      items.push(statusOptions)
    }
  }

  // Archive/Restore
  const archiveActions: any[] = []
  if (animal.status !== 'ARCHIVED') {
    archiveActions.push({
      label: t('animals.actions.archive'),
      icon: 'i-lucide-archive',
      onSelect: () => confirmArchive(animal),
    })
  } else {
    archiveActions.push({
      label: t('animals.actions.restore'),
      icon: 'i-lucide-archive-restore',
      onSelect: () => confirmRestore(animal),
    })
  }
  items.push(archiveActions)

  // Delete
  items.push([{
    label: t('animals.actions.delete'),
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect: () => confirmDelete(animal),
  }])

  return items
}

async function changeStatus(animal: Animal, status: AnimalStatus) {
  try {
    await patch(`/animals/${animal.id}/status`, { status })
    toast.add({ title: t('common.success'), color: 'success' })
    await loadAnimals()
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  }
}

function confirmArchive(animal: Animal) {
  pendingAnimal.value = animal
  showArchiveModal.value = true
}

function confirmRestore(animal: Animal) {
  pendingAnimal.value = animal
  showRestoreModal.value = true
}

function confirmDelete(animal: Animal) {
  pendingAnimal.value = animal
  showDeleteModal.value = true
}

async function executeArchive() {
  if (!pendingAnimal.value) return
  actionLoading.value = true
  try {
    await patch(`/animals/${pendingAnimal.value.id}/archive`)
    toast.add({ title: t('common.success'), color: 'success' })
    showArchiveModal.value = false
    await loadAnimals()
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  } finally {
    actionLoading.value = false
  }
}

async function executeRestore() {
  if (!pendingAnimal.value) return
  actionLoading.value = true
  try {
    await patch(`/animals/${pendingAnimal.value.id}/restore`)
    toast.add({ title: t('common.success'), color: 'success' })
    showRestoreModal.value = false
    await loadAnimals()
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  } finally {
    actionLoading.value = false
  }
}

async function executeDelete() {
  if (!pendingAnimal.value) return
  actionLoading.value = true
  try {
    await del(`/animals/${pendingAnimal.value.id}`)
    toast.add({ title: t('common.success'), color: 'success' })
    showDeleteModal.value = false
    await loadAnimals()
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  } finally {
    actionLoading.value = false
  }
}

async function loadAnimals() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', String(page.value))
    params.set('limit', String(limit))
    if (activeStatus.value) params.set('status', activeStatus.value)
    if (searchTerm.value.length >= 2) params.set('search', searchTerm.value)

    const result = await get<PaginatedResponse<Animal>>(`/animals/org?${params.toString()}`)
    animals.value = result.data
    total.value = result.total
    totalPages.value = result.totalPages
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAnimals()
})
</script>
