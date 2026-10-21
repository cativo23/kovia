<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold">{{ t('org.nav.adopters') }}</h2>
        <p class="text-gray-500 mt-1">
          {{ t('adoptantes.pageSubtitle') }}
        </p>
      </div>
      <UButton
        to="/org/dashboard/aplicaciones"
        color="primary"
       
        :label="t('adoptantes.goToApplications')">
          <template #leading><KIcon name="clipboard-list" /></template>
        </UButton>
    </div>

    <UCard>
      <div class="py-12 text-center">
        <KIcon name="users" :size="48" class="text-gray-300 mx-auto" />
        <p class="text-lg font-bold mt-4">{{ t('adoptantes.detailedViewHeading') }}</p>
        <p class="text-sm text-gray-500 mt-2 max-w-md mx-auto">
          {{ t('adoptantes.detailedViewBody') }}
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
