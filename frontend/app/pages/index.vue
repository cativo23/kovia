<template>
  <div>
    <!-- Hero section -->
    <section class="py-16 text-center">
      <div class="max-w-3xl mx-auto">
        <UIcon name="i-lucide-paw-print" class="w-16 h-16 text-primary mx-auto mb-4" />
        <h1 class="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          {{ $t('landing.hero.title') }}
        </h1>
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">
          {{ $t('landing.hero.subtitle') }}
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <UButton size="xl" to="/animales" icon="i-lucide-search" :label="$t('landing.hero.cta')" />
          <UButton
            v-if="!isAuthenticated"
            size="xl"
            variant="outline"
            to="/register"
            :label="$t('nav.register')"
          />
        </div>
      </div>
    </section>

    <!-- Featured animals section -->
    <section v-if="featuredAnimals.length" class="py-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ $t('landing.featured.title') }}
        </h2>
        <NuxtLink
          to="/animales"
          class="text-primary hover:underline text-sm font-medium flex items-center gap-1"
        >
          {{ $t('landing.featured.viewAll') }}
          <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
        </NuxtLink>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimalCard
          v-for="animal in featuredAnimals"
          :key="animal.id"
          :animal="animal"
          mode="grid"
        />
      </div>
    </section>

    <!-- Org CTA section -->
    <section class="py-12 bg-amber-50 dark:bg-amber-900/10 rounded-2xl px-8 text-center mt-8">
      <UIcon name="i-lucide-building-2" class="w-12 h-12 text-primary mx-auto mb-4" />
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {{ $t('landing.orgCta.title') }}
      </h2>
      <p class="text-gray-600 dark:text-gray-400 mb-6">
        {{ $t('landing.orgCta.description') }}
      </p>

      <!-- Alert on redirect from denied access -->
      <div v-if="deniedAccess" class="mb-4">
        <UAlert color="error" :title="$t('landing.deniedAccess')" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'default' })

useHead({ title: 'Kovia - Plataforma inteligente de adopcion de mascotas' })

const config = useRuntimeConfig()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const deniedAccess = ref(false)

const { data: featuredData } = await useFetch<{ data: any[] }>('/animals', {
  baseURL: config.public.apiUrl as string,
  query: { limit: 6, page: 1 },
})

const featuredAnimals = computed(() => featuredData.value?.data || [])

onMounted(() => {
  if (route.query.denied) {
    deniedAccess.value = true
    toast.add({
      title: 'No tenes acceso a esta seccion',
      color: 'error',
    })
    router.replace({ path: '/', query: {} })
  }
})
</script>
