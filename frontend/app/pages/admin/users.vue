<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold">{{ $t('admin.users.title') }}</h2>
      <p class="text-gray-500 mt-1">{{ $t('admin.users.description') }}</p>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 mb-4">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        :placeholder="$t('admin.users.searchPlaceholder')"
        class="w-64"
      />
      <USelectMenu
        v-model="roleFilter"
        :items="roleOptions"
        :placeholder="$t('admin.users.filterByRole')"
        class="w-48"
      />
    </div>

    <UCard>
      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin" />
      </div>
      <UTable v-else :data="filteredUsers" :columns="columns">
        <template #role-cell="{ row }">
          <UBadge
            :color="roleBadgeColor(row.original.role)"
            :label="roleLabel(row.original.role)"
            variant="subtle"
          />
        </template>
        <template #organization-cell="{ row }">
          <template v-if="row.original.role === 'ORG_ADMIN'">
            <UBadge v-if="row.original.organization" color="success" :label="row.original.organization.name" variant="subtle" />
            <UBadge v-else color="warning" label="Sin organizacion" variant="subtle" />
          </template>
          <span v-else class="text-gray-400">—</span>
        </template>
        <template #isActive-cell="{ row }">
          <UBadge
            :color="row.original.isActive ? 'success' : 'error'"
            :label="row.original.isActive ? $t('common.active') : $t('common.inactive')"
            variant="subtle"
          />
        </template>
        <template #createdAt-cell="{ row }">
          {{ formatDate(row.original.createdAt) }}
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-2">
            <UButton
              size="xs"
              :variant="row.original.isActive ? 'outline' : 'solid'"
              :color="row.original.isActive ? 'warning' : 'success'"
              :label="row.original.isActive ? $t('admin.users.deactivate') : $t('admin.users.reactivate')"
              @click="toggleUserStatus(row.original)"
            />
            <UButton
              size="xs"
              variant="outline"
              color="error"
              icon="i-lucide-trash-2"
              @click="confirmDelete(row.original)"
            />
          </div>
        </template>
      </UTable>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center mt-4">
        <UPagination v-model="currentPage" :total="total" :items-per-page="limit" />
      </div>
    </UCard>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteConfirm">
      <template #header>
        <h3 class="font-semibold text-error">{{ $t('admin.users.deleteTitle') }}</h3>
      </template>
      <template #body>
        <p class="text-gray-600 dark:text-gray-300">
          {{ $t('admin.users.deleteWarning', { email: pendingDeleteUser?.email }) }}
        </p>
        <p class="mt-2 text-sm text-error font-medium">
          {{ $t('admin.users.deletePermanent') }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton variant="outline" :label="$t('common.cancel')" @click="showDeleteConfirm = false" />
          <UButton
            color="error"
            :label="$t('common.delete')"
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
const { get, patch, del } = useApi()
const toast = useToast()

const users = ref<any[]>([])
const loading = ref(true)
const total = ref(0)
const currentPage = ref(1)
const limit = 20
const searchQuery = ref('')
const roleFilter = ref<string | undefined>(undefined)
const showDeleteConfirm = ref(false)
const pendingDeleteUser = ref<any>(null)
const deleting = ref(false)

const totalPages = computed(() => Math.ceil(total.value / limit))

const roleOptions = [
  { label: t('admin.users.allRoles'), value: undefined },
  { label: t('admin.users.roleAdopter'), value: 'ADOPTER' },
  { label: t('admin.users.roleOrgAdmin'), value: 'ORG_ADMIN' },
  { label: t('admin.users.rolePlatformAdmin'), value: 'PLATFORM_ADMIN' },
]

const filteredUsers = computed(() => {
  let result = users.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(u =>
      u.email.toLowerCase().includes(q)
      || (u.firstName || '').toLowerCase().includes(q)
      || (u.lastName || '').toLowerCase().includes(q),
    )
  }
  if (roleFilter.value) {
    result = result.filter(u => u.role === roleFilter.value)
  }
  return result
})

const columns = [
  { accessorKey: 'firstName', header: t('auth.firstName') },
  { accessorKey: 'lastName', header: t('auth.lastName') },
  { accessorKey: 'email', header: t('auth.email') },
  { accessorKey: 'role', header: t('admin.users.role') },
  { accessorKey: 'organization', header: t('admin.orgs.title') },
  { accessorKey: 'isActive', header: t('common.status') },
  { accessorKey: 'createdAt', header: t('admin.users.createdAt') },
  { accessorKey: 'actions', header: t('common.actions') },
]

function roleBadgeColor(role: string) {
  switch (role) {
    case 'PLATFORM_ADMIN': return 'error' as const
    case 'ORG_ADMIN': return 'info' as const
    default: return 'neutral' as const
  }
}

function roleLabel(role: string) {
  switch (role) {
    case 'PLATFORM_ADMIN': return t('admin.users.rolePlatformAdmin')
    case 'ORG_ADMIN': return t('admin.users.roleOrgAdmin')
    default: return t('admin.users.roleAdopter')
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-SV', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

async function loadUsers() {
  loading.value = true
  try {
    const result = await get<{ data: any[]; total: number }>(`/admin/users?page=${currentPage.value}&limit=${limit}`)
    users.value = result.data
    total.value = result.total
  } catch {
    // Silently handle
  } finally {
    loading.value = false
  }
}

async function toggleUserStatus(user: any) {
  try {
    await patch(`/admin/users/${user.id}/status`, { isActive: !user.isActive })
    toast.add({
      title: user.isActive ? t('admin.users.deactivateSuccess') : t('admin.users.reactivateSuccess'),
      color: 'success',
    })
    await loadUsers()
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  }
}

function confirmDelete(user: any) {
  pendingDeleteUser.value = user
  showDeleteConfirm.value = true
}

async function executeDelete() {
  if (!pendingDeleteUser.value) return
  deleting.value = true
  try {
    await del(`/admin/users/${pendingDeleteUser.value.id}`)
    toast.add({ title: t('admin.users.deleteSuccess'), color: 'success' })
    showDeleteConfirm.value = false
    await loadUsers()
  } catch {
    toast.add({ title: t('admin.users.deleteError'), color: 'error' })
  } finally {
    deleting.value = false
  }
}

watch(currentPage, () => loadUsers())

onMounted(() => {
  loadUsers()
})
</script>
