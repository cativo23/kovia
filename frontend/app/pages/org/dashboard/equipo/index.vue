<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold">{{ t('team.title') }}</h2>
        <p class="text-gray-500 mt-1">{{ t('team.description') }}</p>
      </div>
      <UButton
        icon="i-lucide-user-plus"
        color="primary"
        :label="t('team.invite')"
        @click="openInviteSlider"
      />
    </div>

    <!-- Loading -->
    <UCard v-if="loading" class="py-12">
      <div class="flex justify-center">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
      </div>
    </UCard>

    <!-- Empty state -->
    <UCard v-else-if="rows.length === 0">
      <div class="py-12 text-center">
        <UIcon name="i-lucide-users" class="w-12 h-12 text-gray-300 mx-auto" />
        <p class="text-lg font-bold mt-4">{{ t('team.empty.heading') }}</p>
        <p class="text-sm text-gray-500 mt-2">{{ t('team.empty.body') }}</p>
        <UButton
          icon="i-lucide-user-plus"
          class="mt-6"
          :label="t('team.invite')"
          @click="openInviteSlider"
        />
      </div>
    </UCard>

    <!-- Table -->
    <UCard v-else>
      <UTable :data="rows" :columns="columns">
        <template #name-cell="{ row }">
          <span v-if="row.original.type === 'invite'" class="text-gray-400">—</span>
          <span v-else class="font-medium">{{ row.original.name }}</span>
        </template>
        <template #email-cell="{ row }">
          <span class="text-sm">{{ row.original.email }}</span>
        </template>
        <template #role-cell="{ row }">
          <UBadge
            v-if="row.original.type === 'invite'"
            color="neutral"
            variant="subtle"
            :label="row.original.role === 'ORG_STAFF' ? t('team.roles.staff') : row.original.role"
          />
          <UTooltip v-else-if="isLastAdmin(row.original)" :text="t('team.lastAdminTooltip')">
            <USelect
              :model-value="row.original.role"
              :items="roleItems"
              disabled
            />
          </UTooltip>
          <USelect
            v-else
            :model-value="row.original.role"
            :items="roleItems"
            :loading="changingRole === row.original.id"
            :aria-label="`Cambiar rol de ${row.original.name}`"
            @update:model-value="(v: string) => handleRoleChange(row.original, v)"
          />
        </template>
        <template #date-cell="{ row }">
          {{ formatDate(row.original.date) }}
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.status === 'pending' ? 'warning' : 'success'"
            variant="subtle"
            :label="row.original.status === 'pending' ? t('team.status.pending') : t('team.status.active')"
          />
        </template>
        <template #actions-cell="{ row }">
          <div v-if="row.original.type === 'invite'" class="flex gap-2">
            <UButton
              size="xs"
              variant="outline"
              icon="i-lucide-send"
              :loading="resending === row.original.id"
              :label="t('team.resendInvite')"
              @click="handleResend(row.original)"
            />
            <UButton
              size="xs"
              color="error"
              variant="outline"
              icon="i-lucide-x"
              :loading="revoking === row.original.id"
              :label="t('team.revokeInvite')"
              @click="handleRevoke(row.original)"
            />
          </div>
          <div v-else>
            <UTooltip v-if="isLastAdmin(row.original)" :text="t('team.lastAdminTooltip')">
              <UButton
                size="xs"
                color="error"
                variant="outline"
                icon="i-lucide-user-minus"
                disabled
                :label="t('team.removeMember')"
              />
            </UTooltip>
            <UButton
              v-else
              size="xs"
              color="error"
              variant="outline"
              icon="i-lucide-user-minus"
              :label="t('team.removeMember')"
              @click="openRemoveModal(row.original)"
            />
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- Invite slideover -->
    <USlideover v-model:open="showInviteSlider">
      <template #header>
        <h3 class="text-lg font-bold">{{ t('team.inviteHeading') }}</h3>
      </template>
      <template #body>
        <form class="space-y-4" @submit.prevent="submitInvite">
          <UFormField :label="t('team.columns.email')">
            <UInput
              v-model="inviteForm.email"
              type="email"
              placeholder="colaborador@correo.com"
              required
            />
          </UFormField>
          <UFormField :label="t('team.role')">
            <USelect
              v-model="inviteForm.role"
              :items="[{ label: t('team.roles.staff'), value: 'ORG_STAFF' }]"
            />
          </UFormField>
          <UAlert
            v-if="conflictError"
            color="error"
            icon="i-lucide-alert-circle"
            :title="t('team.inviteConflict')"
          />
        </form>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton
            variant="outline"
            :label="t('team.discardInvite')"
            @click="showInviteSlider = false"
          />
          <UButton
            color="primary"
            :label="t('team.sendInvite')"
            :loading="submitting"
            @click="submitInvite"
          />
        </div>
      </template>
    </USlideover>

    <!-- Remove member modal -->
    <UModal v-model:open="showRemoveModal">
      <template #header>
        <h3 class="text-lg font-bold">{{ t('team.removeModal.heading') }}</h3>
      </template>
      <template #body>
        <div class="space-y-3">
          <p class="text-sm text-gray-600">
            {{ t('team.removeModal.body', { name: memberFullName }) }}
          </p>
          <p class="text-sm font-medium">
            {{ t('team.removeModal.confirmPrompt', { name: memberFullName }) }}
          </p>
          <UInput
            v-model="confirmName"
            :placeholder="memberFullName"
            aria-label="Nombre del miembro a remover"
            aria-required="true"
          />
          <p
            v-if="confirmName.length > 0 && !canConfirmRemove"
            class="text-xs text-error"
          >
            {{ t('team.removeModal.mismatch') }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton
            variant="outline"
            :label="t('team.removeModal.cancel')"
            @click="showRemoveModal = false"
          />
          <UButton
            color="error"
            :disabled="!canConfirmRemove"
            :loading="removing"
            :label="t('team.removeModal.confirm')"
            @click="handleRemove"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'org',
  middleware: ['auth', 'org-admin'],
})

interface TeamMember {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  role: 'ORG_ADMIN' | 'ORG_STAFF'
  createdAt: string
}

interface TeamInvite {
  id: string
  email: string
  role: 'ORG_STAFF' | 'ORG_ADMIN'
  status: 'pending' | 'accepted' | 'expired'
  createdAt: string
  expiresAt: string
}

interface Row {
  type: 'invite' | 'member'
  id: string
  name: string
  firstName?: string | null
  lastName?: string | null
  email: string
  role: string
  date: string
  status: 'pending' | 'accepted'
}

const { t } = useI18n()
const { get, post, patch, del } = useApi()
const toast = useToast()

const loading = ref(true)
const members = ref<TeamMember[]>([])
const invites = ref<TeamInvite[]>([])

// Invite slideover state
const showInviteSlider = ref(false)
const submitting = ref(false)
const inviteForm = reactive<{ email: string, role: 'ORG_STAFF' }>({
  email: '',
  role: 'ORG_STAFF',
})
const conflictError = ref(false)

// Remove modal state
const showRemoveModal = ref(false)
const memberToRemove = ref<TeamMember | null>(null)
const confirmName = ref('')
const removing = ref(false)

// Per-row loading trackers
const resending = ref<string | null>(null)
const revoking = ref<string | null>(null)
const changingRole = ref<string | null>(null)

const roleItems = computed(() => [
  { label: 'Admin', value: 'ORG_ADMIN' },
  { label: t('team.roles.staff'), value: 'ORG_STAFF' },
])

const columns = [
  { accessorKey: 'name', header: t('team.columns.name') },
  { accessorKey: 'email', header: t('team.columns.email') },
  { accessorKey: 'role', header: t('team.columns.role') },
  { accessorKey: 'date', header: t('team.columns.date') },
  { accessorKey: 'status', header: t('team.columns.status') },
  { accessorKey: 'actions', header: t('common.actions') },
]

const rows = computed<Row[]>(() => [
  ...invites.value
    .filter(i => i.status === 'pending')
    .map((i): Row => ({
      type: 'invite',
      id: i.id,
      name: '—',
      email: i.email,
      role: i.role,
      date: i.createdAt,
      status: 'pending',
    })),
  ...members.value.map((m): Row => ({
    type: 'member',
    id: m.id,
    name: `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || m.email,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    role: m.role,
    date: m.createdAt,
    status: 'accepted',
  })),
])

const orgAdminCount = computed(() => members.value.filter(m => m.role === 'ORG_ADMIN').length)

function isLastAdmin(row: Row): boolean {
  return row.role === 'ORG_ADMIN' && orgAdminCount.value <= 1
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-SV', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

async function load() {
  loading.value = true
  try {
    const [ms, invs] = await Promise.all([
      get<TeamMember[]>('/team/members'),
      get<TeamInvite[]>('/team/invites'),
    ])
    members.value = ms
    invites.value = invs
  } catch {
    toast.add({ title: t('team.loadError'), color: 'error' })
  } finally {
    loading.value = false
  }
}

function openInviteSlider() {
  inviteForm.email = ''
  inviteForm.role = 'ORG_STAFF'
  conflictError.value = false
  showInviteSlider.value = true
}

async function submitInvite() {
  submitting.value = true
  conflictError.value = false
  try {
    await post('/team/invites', { email: inviteForm.email, role: inviteForm.role })
    showInviteSlider.value = false
    toast.add({ title: t('team.inviteSent'), color: 'success' })
    await load()
  } catch (err: any) {
    const msg = err?.data?.message ?? ''
    if (typeof msg === 'string' && msg.includes('solicitud pendiente')) {
      conflictError.value = true
    } else {
      toast.add({ title: t('team.inviteError'), color: 'error' })
    }
  } finally {
    submitting.value = false
  }
}

async function handleRoleChange(member: TeamMember, newRole: string) {
  const prev = member.role
  // Optimistic
  member.role = newRole as 'ORG_ADMIN' | 'ORG_STAFF'
  changingRole.value = member.id
  try {
    await patch(`/team/members/${member.id}/role`, { role: newRole })
    toast.add({ title: t('team.roleUpdated'), color: 'success' })
  } catch (err: any) {
    member.role = prev
    const backendMsg = err?.data?.message
    toast.add({
      title: typeof backendMsg === 'string' ? backendMsg : t('team.roleUpdateError'),
      color: 'error',
    })
  } finally {
    changingRole.value = null
  }
}

async function handleResend(invite: { id: string }) {
  resending.value = invite.id
  try {
    await post(`/team/invites/${invite.id}/resend`)
    toast.add({ title: t('team.resendSuccess'), color: 'success' })
    await load()
  } catch {
    toast.add({ title: t('team.resendError'), color: 'error' })
  } finally {
    resending.value = null
  }
}

async function handleRevoke(invite: { id: string }) {
  revoking.value = invite.id
  try {
    await del(`/team/invites/${invite.id}`)
    invites.value = invites.value.filter(i => i.id !== invite.id)
    toast.add({ title: t('team.revokeSuccess'), color: 'success' })
  } catch {
    toast.add({ title: t('team.revokeError'), color: 'error' })
  } finally {
    revoking.value = null
  }
}

function openRemoveModal(row: Row) {
  const member = members.value.find(m => m.id === row.id)
  if (!member) return
  memberToRemove.value = member
  confirmName.value = ''
  showRemoveModal.value = true
}

const memberFullName = computed(() => {
  if (!memberToRemove.value) return ''
  return `${memberToRemove.value.firstName ?? ''} ${memberToRemove.value.lastName ?? ''}`.trim()
})

const canConfirmRemove = computed(() =>
  confirmName.value.length > 0 && confirmName.value === memberFullName.value,
)

async function handleRemove() {
  if (!canConfirmRemove.value || !memberToRemove.value) return
  removing.value = true
  try {
    await del(`/team/members/${memberToRemove.value.id}`)
    showRemoveModal.value = false
    toast.add({ title: t('team.removeSuccess'), color: 'success' })
    await load()
  } catch (err: any) {
    const backendMsg = err?.data?.message
    showRemoveModal.value = false
    toast.add({
      title: typeof backendMsg === 'string' ? backendMsg : t('team.removeError'),
      color: 'error',
    })
  } finally {
    removing.value = false
  }
}

onMounted(load)
</script>
