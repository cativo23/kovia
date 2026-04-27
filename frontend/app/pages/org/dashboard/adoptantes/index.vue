<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold">{{ t('org.nav.adopters') }}</h2>
        <p class="text-gray-500 mt-1">
          Para ver los adoptantes que han aplicado a tus animales, revisa la cola de aplicaciones.
        </p>
      </div>
      <UButton
        to="/org/dashboard/aplicaciones"
        color="primary"
        icon="i-lucide-clipboard-list"
        label="Ir a aplicaciones"
      />
    </div>

    <UCard>
      <div class="py-12 text-center">
        <UIcon name="i-lucide-users" class="w-12 h-12 text-gray-300 mx-auto" />
        <p class="text-lg font-bold mt-4">Vista detallada por adoptante</p>
        <p class="text-sm text-gray-500 mt-2 max-w-md mx-auto">
          Desde la cola de aplicaciones puedes abrir la ficha de cada adoptante con su historial completo.
        </p>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'org',
  middleware: ['auth'],
})

const { t } = useI18n()
</script>
