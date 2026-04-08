<template>
  <div class="flex min-h-screen flex-col items-center justify-center">
    <h1 class="text-4xl font-bold">{{ $t('landing.title') }}</h1>
    <p class="mt-4 text-lg text-gray-600">{{ $t('landing.subtitle') }}</p>
    <UButton class="mt-8" size="lg">{{ $t('landing.cta') }}</UButton>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Kovia - Plataforma inteligente de adopcion de mascotas',
});
</script>
