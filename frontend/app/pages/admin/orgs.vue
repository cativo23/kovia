<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold">{{ $t('admin.orgs.title') }}</h2>
      <p class="text-gray-500 mt-1">{{ $t('admin.orgs.description') }}</p>
    </div>

    <UCard>
      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin" />
      </div>
      <div v-else-if="orgs.length === 0" class="text-center py-8 text-gray-500">
        {{ $t('common.noResults') }}
      </div>
      <UTable v-else :data="orgs" :columns="columns">
        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.status === 'ACTIVE' ? 'success' : 'error'"
            :label="row.original.status === 'ACTIVE' ? $t('org.active') : $t('org.inactive')"
            variant="subtle"
          />
        </template>
        <template #admin-cell="{ row }">
          {{ row.original.admin?.email || '-' }}
        </template>
        <template #createdAt-cell="{ row }">
          {{ formatDate(row.original.createdAt) }}
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-2">
            <UButton
              size="xs"
              variant="ghost"
              color="primary"
              icon="i-lucide-external-link"
              :label="$t('common.view')"
              :to="`/org/${row.original.slug}`"
              target="_blank"
            />
            <UButton
              size="xs"
              :variant="row.original.status === 'ACTIVE' ? 'outline' : 'solid'"
              :color="row.original.status === 'ACTIVE' ? 'error' : 'success'"
              :label="row.original.status === 'ACTIVE' ? $t('admin.orgs.deactivate') : $t('admin.orgs.reactivate')"
              :loading="toggling === row.original.id"
              @click="toggleStatus(row.original)"
            />
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- Confirmation Modal -->
    <UModal v-model:open="showConfirm">
      <template #header>
        <h3 class="font-semibold">{{ $t('common.confirm') }}</h3>
      </template>
      <template #body>
        <p>{{ confirmMessage }}</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton variant="outline" :label="$t('common.cancel')" @click="showConfirm = false" />
          <UButton
            :color="confirmAction === 'deactivate' ? 'error' : 'success'"
            :label="$t('common.confirm')"
            @click="executeToggle"
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
const { get, post } = useApi()
const toast = useToast()

const orgs = ref<any[]>([])
const loading = ref(true)
const toggling = ref<string | null>(null)
const showConfirm = ref(false)
const confirmMessage = ref('')
const confirmAction = ref<'deactivate' | 'reactivate'>('deactivate')
const pendingOrg = ref<any>(null)

const columns = [
  { accessorKey: 'name', header: t('org.name') },
  { accessorKey: 'admin', header: t('admin.orgs.adminEmail') },
  { accessorKey: 'status', header: t('common.status') },
  { accessorKey: 'createdAt', header: t('admin.orgs.createdAt') },
  { accessorKey: 'actions', header: t('common.actions') },
]

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-SV', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

async function loadOrgs() {
  try {
    orgs.value = await get<any[]>('/admin/orgs')
  } catch {
    // Silently handle
  } finally {
    loading.value = false
  }
}

function toggleStatus(org: any) {
  pendingOrg.value = org
  confirmAction.value = org.status === 'ACTIVE' ? 'deactivate' : 'reactivate'
  confirmMessage.value = org.status === 'ACTIVE'
    ? t('admin.orgs.confirmDeactivate', { name: org.name })
    : t('admin.orgs.confirmReactivate', { name: org.name })
  showConfirm.value = true
}

async function executeToggle() {
  const org = pendingOrg.value
  if (!org) return

  showConfirm.value = false
  toggling.value = org.id

  const newStatus = org.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE'
  try {
    await post(`/admin/orgs/${org.id}/status`, { status: newStatus })
    toast.add({
      title: newStatus === 'ACTIVE'
        ? t('admin.orgs.reactivateSuccess')
        : t('admin.orgs.deactivateSuccess'),
      color: 'success',
    })
    await loadOrgs()
  } catch {
    toast.add({ title: t('common.error'), color: 'error' })
  } finally {
    toggling.value = null
  }
}

onMounted(() => {
  loadOrgs()
})
</script>
