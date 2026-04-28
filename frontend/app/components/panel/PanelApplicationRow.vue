<template>
  <NuxtLink
    :to="`/perfil/aplicaciones/${app.id}`"
    class="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
  >
    <UCard class="hover:shadow-md transition-shadow">
      <div class="flex items-center gap-4">
        <!-- Animal thumbnail -->
        <div class="w-12 h-12 rounded-lg overflow-hidden bg-[--color-border]/40 flex-shrink-0">
          <img
            v-if="app.animal?.coverPhoto?.url"
            :src="app.animal.coverPhoto.url"
            :alt="app.animal?.name || ''"
            class="w-full h-full object-cover"
          />
          <KIcon
            v-else
            name="paw-print"
            :size="24"
            class="text-gray-400 m-auto mt-3"
          />
        </div>

        <!-- Info column -->
        <div class="flex-1 min-w-0">
          <p class="font-medium text-[--color-text] truncate">
            {{ app.animal?.name || '—' }}
          </p>
          <div class="flex items-center gap-2 text-xs text-[--color-text]/70 mt-0.5">
            <UAvatar
              v-if="app.animal?.organization?.logoUrl"
              :src="app.animal.organization.logoUrl"
              size="2xs"
              :alt="app.animal.organization.name"
            />
            <KIcon
              v-else
              name="building-2"
              :size="12"
            />
            <span class="truncate">{{ app.animal?.organization?.name || '—' }}</span>
          </div>
          <p class="text-xs text-gray-500 mt-0.5">
            {{ $t('applications.history.submittedAt') }} {{ formatDate(app.submittedAt) }}
          </p>
        </div>

        <ApplicationStatusBadge :status="app.status" />
      </div>
    </UCard>
  </NuxtLink>
</template>

<script setup lang="ts">
type ApplicationStatus =
  | 'ENVIADA' | 'REVISANDO' | 'APROBADA' | 'RECHAZADA'
  | 'SEGUIMIENTO' | 'ADOPTADA' | 'RETIRADA' | 'DEVUELTA'

export interface ApplicationRow {
  id: string
  status: ApplicationStatus
  submittedAt: string
  animal: {
    id: string
    name: string
    coverPhoto?: { url: string } | null
    organization?: {
      id: string
      name: string
      slug: string
      logoUrl: string | null
    } | null
  } | null
}

defineProps<{ app: ApplicationRow }>()

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-SV', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>
