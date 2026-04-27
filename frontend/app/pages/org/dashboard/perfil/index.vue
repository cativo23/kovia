<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold">{{ t('org.nav.profile') }}</h2>
        <p class="text-gray-500 mt-1">
          Información de tu organización en Kovia.
        </p>
      </div>
    </div>

    <UCard>
      <div class="space-y-3 py-4">
        <div v-if="org">
          <p class="text-sm text-gray-500">Nombre</p>
          <p class="font-medium">{{ org.firstName }} {{ org.lastName }}</p>
          <p class="text-sm text-gray-500 mt-3">Correo</p>
          <p class="font-medium">{{ org.email }}</p>
          <p class="text-sm text-gray-500 mt-3">Rol</p>
          <p class="font-medium">{{ org.role }}</p>
        </div>
        <div v-else class="text-center py-8">
          <UIcon name="i-lucide-building-2" class="w-12 h-12 text-gray-300 mx-auto" />
          <p class="text-sm text-gray-500 mt-4">
            La edición del perfil de organización estará disponible próximamente.
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'org',
  middleware: ['auth'],
})

const { t } = useI18n()
const authStore = useAuthStore()
const org = computed(() => authStore.user)
</script>
