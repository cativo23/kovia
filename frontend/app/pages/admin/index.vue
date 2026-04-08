<template>
  <div>
    <div class="mb-8">
      <h2 class="text-2xl font-bold">{{ $t('admin.dashboardTitle') }}</h2>
      <p class="text-gray-500 mt-1">{{ $t('admin.dashboardDescription') }}</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <UCard v-for="stat in statsCards" :key="stat.label">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-primary/10">
            <UIcon :name="stat.icon" class="w-6 h-6 text-primary" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stat.value }}</p>
            <p class="text-sm text-gray-500">{{ stat.label }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Quick Actions -->
    <div class="flex gap-3 mb-8">
      <UButton
        icon="i-lucide-mail-plus"
        :label="$t('admin.invites.create')"
        to="/admin/invites"
      />
      <UButton
        variant="outline"
        icon="i-lucide-users"
        :label="$t('admin.users.viewAll')"
        to="/admin/users"
      />
    </div>

    <!-- Recent Activity -->
    <UCard>
      <template #header>
        <h3 class="font-semibold">{{ $t('admin.recentActivity') }}</h3>
      </template>
      <div v-if="auditLoading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin" />
      </div>
      <div v-else-if="auditEntries.length === 0" class="text-center py-8 text-gray-500">
        {{ $t('common.noResults') }}
      </div>
      <div v-else class="divide-y divide-gray-200 dark:divide-gray-800">
        <div v-for="entry in auditEntries" :key="entry.id" class="py-3 flex items-center justify-between">
          <div>
            <span class="font-medium">{{ formatAction(entry.action) }}</span>
            <span class="text-gray-500 text-sm ml-2">
              {{ entry.user?.firstName }} {{ entry.user?.lastName }}
            </span>
          </div>
          <span class="text-sm text-gray-400">
            {{ formatDate(entry.createdAt) }}
          </span>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
})

const { t } = useI18n()
const { get } = useApi()

const stats = ref<any>(null)
const statsLoading = ref(true)
const auditEntries = ref<any[]>([])
const auditLoading = ref(true)

const statsCards = computed(() => [
  {
    label: t('admin.stats.totalUsers'),
    value: stats.value?.totalUsers ?? 0,
    icon: 'i-lucide-users',
  },
  {
    label: t('admin.stats.activeOrgs'),
    value: stats.value?.activeOrgs ?? 0,
    icon: 'i-lucide-building-2',
  },
  {
    label: t('admin.stats.inactiveOrgs'),
    value: stats.value?.inactiveOrgs ?? 0,
    icon: 'i-lucide-building',
  },
  {
    label: t('admin.stats.pendingInvites'),
    value: stats.value?.pendingInvites ?? 0,
    icon: 'i-lucide-mail',
  },
])

async function loadStats() {
  try {
    stats.value = await get('/admin/stats')
  } catch {
    // Silently handle
  } finally {
    statsLoading.value = false
  }
}

async function loadAudit() {
  try {
    const result = await get<{ data: any[] }>('/admin/audit?limit=10')
    auditEntries.value = result.data
  } catch {
    // Silently handle
  } finally {
    auditLoading.value = false
  }
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    org_invited: t('admin.audit.orgInvited'),
    org_deactivated: t('admin.audit.orgDeactivated'),
    org_reactivated: t('admin.audit.orgReactivated'),
    user_deactivated: t('admin.audit.userDeactivated'),
    user_reactivated: t('admin.audit.userReactivated'),
    user_deleted: t('admin.audit.userDeleted'),
    invite_resent: t('admin.audit.inviteResent'),
  }
  return map[action] || action
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-SV', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  loadStats()
  loadAudit()
})
</script>
