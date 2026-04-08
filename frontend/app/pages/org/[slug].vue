<template>
  <div class="max-w-3xl mx-auto py-8">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <!-- Not Found -->
    <UCard v-else-if="notFound" class="text-center py-8">
      <UIcon name="i-lucide-building-2" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h2 class="text-xl font-bold mb-2">{{ $t('org.profile.notFound') }}</h2>
      <p class="text-gray-500">{{ $t('org.profile.notFoundDescription') }}</p>
    </UCard>

    <!-- Org Profile -->
    <div v-else-if="org">
      <!-- Header -->
      <div class="flex items-start gap-6 mb-8">
        <div v-if="org.logoUrl" class="flex-shrink-0">
          <img
            :src="org.logoUrl"
            :alt="org.name"
            class="w-24 h-24 rounded-xl object-cover"
          />
        </div>
        <div v-else class="flex-shrink-0 w-24 h-24 rounded-xl bg-primary/10 flex items-center justify-center">
          <UIcon name="i-lucide-building-2" class="w-10 h-10 text-primary" />
        </div>
        <div>
          <h1 class="text-3xl font-bold">{{ org.name }}</h1>
          <p v-if="org.description" class="text-gray-600 dark:text-gray-300 mt-2">
            {{ org.description }}
          </p>
        </div>
      </div>

      <!-- Contact Info -->
      <UCard class="mb-6">
        <template #header>
          <h3 class="font-semibold">{{ $t('org.profile.contactInfo') }}</h3>
        </template>
        <div class="space-y-3">
          <div v-if="org.contactEmail" class="flex items-center gap-3">
            <UIcon name="i-lucide-mail" class="w-5 h-5 text-gray-400" />
            <a :href="`mailto:${org.contactEmail}`" class="text-primary hover:underline">
              {{ org.contactEmail }}
            </a>
          </div>
          <div v-if="org.phone" class="flex items-center gap-3">
            <UIcon name="i-lucide-phone" class="w-5 h-5 text-gray-400" />
            <a :href="`tel:${org.phone}`" class="text-primary hover:underline">
              {{ org.phone }}
            </a>
          </div>
        </div>
      </UCard>

      <!-- Social Links -->
      <div v-if="org.instagram || org.facebook || org.whatsapp" class="flex gap-3 mb-8">
        <UButton
          v-if="org.instagram"
          variant="outline"
          color="neutral"
          icon="i-lucide-instagram"
          :label="$t('org.instagram')"
          :to="`https://instagram.com/${org.instagram.replace('@', '')}`"
          target="_blank"
        />
        <UButton
          v-if="org.facebook"
          variant="outline"
          color="neutral"
          icon="i-lucide-facebook"
          :label="$t('org.facebook')"
          :to="`https://facebook.com/${org.facebook}`"
          target="_blank"
        />
        <UButton
          v-if="org.whatsapp"
          variant="outline"
          color="neutral"
          icon="i-lucide-message-circle"
          :label="$t('org.whatsapp')"
          :to="`https://wa.me/${org.whatsapp.replace(/[^0-9+]/g, '')}`"
          target="_blank"
        />
      </div>

      <!-- Animals Placeholder -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">{{ $t('org.profile.availableAnimals') }}</h3>
        </template>
        <div class="text-center py-8 text-gray-500">
          <UIcon name="i-lucide-paw-print" class="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>{{ $t('org.profile.noAnimalsYet') }}</p>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const route = useRoute()
const { t } = useI18n()

const loading = ref(true)
const notFound = ref(false)
const org = ref<any>(null)

const slug = computed(() => route.params.slug as string)

async function loadOrg() {
  try {
    const config = useRuntimeConfig()
    org.value = await $fetch(`/organizations/${slug.value}`, {
      baseURL: config.public.apiUrl as string,
    })
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadOrg()
})
</script>
