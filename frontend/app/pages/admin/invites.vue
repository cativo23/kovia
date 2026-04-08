<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold">{{ $t('admin.invites.title') }}</h2>
        <p class="text-gray-500 mt-1">{{ $t('admin.invites.description') }}</p>
      </div>
      <UButton
        icon="i-lucide-plus"
        :label="$t('admin.invites.create')"
        @click="showCreateModal = true"
      />
    </div>

    <!-- Create Invite Modal -->
    <USlideover v-model:open="showCreateModal">
      <template #header>
        <h3 class="font-semibold text-lg">{{ $t('admin.invites.create') }}</h3>
      </template>
      <template #body>
        <form class="space-y-4" @submit.prevent="createInvite">
          <UFormField :label="$t('auth.email')">
            <UInput
              v-model="inviteForm.email"
              type="email"
              :placeholder="$t('auth.emailPlaceholder')"
              required
            />
          </UFormField>
          <UFormField :label="$t('org.name')">
            <UInput
              v-model="inviteForm.orgName"
              :placeholder="$t('admin.invites.orgNamePlaceholder')"
              required
            />
          </UFormField>
          <div class="flex justify-end gap-3">
            <UButton variant="outline" :label="$t('common.cancel')" @click="showCreateModal = false" />
            <UButton type="submit" :label="$t('common.submit')" :loading="creating" />
          </div>
        </form>
      </template>
    </USlideover>

    <!-- Created Invite Link -->
    <UAlert
      v-if="createdInviteLink"
      color="info"
      icon="i-lucide-link"
      :title="$t('admin.invites.linkCreated')"
      :description="createdInviteLink"
      class="mb-6"
      :close-button="{ onClick: () => createdInviteLink = '' }"
    />

    <!-- Invites Table -->
    <UCard>
      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin" />
      </div>
      <UTable v-else :data="invites" :columns="columns">
        <template #status-cell="{ row }">
          <UBadge
            :color="statusColor(row.original.status)"
            :label="statusLabel(row.original.status)"
            variant="subtle"
          />
        </template>
        <template #createdAt-cell="{ row }">
          {{ formatDate(row.original.createdAt) }}
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-2">
            <UButton
              v-if="row.original.status !== 'accepted'"
              size="xs"
              variant="outline"
              icon="i-lucide-send"
              :label="$t('admin.invites.resend')"
              :loading="resending === row.original.id"
              @click="resendInvite(row.original.id)"
            />
            <UButton
              v-if="row.original.status === 'pending'"
              size="xs"
              variant="outline"
              color="error"
              icon="i-lucide-trash-2"
              @click="deleteInvite(row.original.id)"
            />
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
})

const { t } = useI18n()
const { get, post, del } = useApi()
const toast = useToast()

const invites = ref<any[]>([])
const loading = ref(true)
const showCreateModal = ref(false)
const creating = ref(false)
const resending = ref<string | null>(null)
const createdInviteLink = ref('')

const inviteForm = reactive({
  email: '',
  orgName: '',
})

const columns = [
  { accessorKey: 'email', header: t('auth.email') },
  { accessorKey: 'orgName', header: t('org.name') },
  { accessorKey: 'status', header: t('common.status') },
  { accessorKey: 'createdAt', header: t('admin.invites.createdAt') },
  { accessorKey: 'actions', header: t('common.actions') },
]

function statusColor(status: string) {
  switch (status) {
    case 'pending': return 'warning' as const
    case 'accepted': return 'success' as const
    case 'expired': return 'error' as const
    default: return 'neutral' as const
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending': return t('admin.invites.statusPending')
    case 'accepted': return t('admin.invites.statusAccepted')
    case 'expired': return t('admin.invites.statusExpired')
    default: return status
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-SV', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

async function loadInvites() {
  try {
    invites.value = await get<any[]>('/admin/invites')
  } catch {
    // Silently handle
  } finally {
    loading.value = false
  }
}

async function createInvite() {
  creating.value = true
  try {
    const result = await post<any>('/admin/invites', inviteForm)
    const config = useRuntimeConfig()
    createdInviteLink.value = `${config.public.apiUrl.replace('/api', '').replace(':3000', ':3001')}/invite/${result.token}`
    inviteForm.email = ''
    inviteForm.orgName = ''
    showCreateModal.value = false
    toast.add({ title: t('admin.invites.createSuccess'), color: 'success' })
    await loadInvites()
  } catch {
    toast.add({ title: t('admin.invites.createError'), color: 'error' })
  } finally {
    creating.value = false
  }
}

async function resendInvite(id: string) {
  resending.value = id
  try {
    await post(`/admin/invites/${id}/resend`)
    toast.add({ title: t('admin.invites.resendSuccess'), color: 'success' })
    await loadInvites()
  } catch {
    toast.add({ title: t('admin.invites.resendError'), color: 'error' })
  } finally {
    resending.value = null
  }
}

async function deleteInvite(id: string) {
  try {
    await del(`/admin/invites/${id}`)
    toast.add({ title: t('admin.invites.deleteSuccess'), color: 'success' })
    await loadInvites()
  } catch {
    toast.add({ title: t('admin.invites.deleteError'), color: 'error' })
  }
}

onMounted(() => {
  loadInvites()
})
</script>
