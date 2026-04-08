<template>
  <div v-if="sent" class="text-center space-y-4">
    <UIcon name="i-lucide-mail-check" class="w-16 h-16 text-primary mx-auto" />
    <h2 class="text-xl font-semibold">{{ $t('auth.forgotPasswordTitle') }}</h2>
    <p class="text-gray-600 dark:text-gray-400">{{ $t('auth.forgotPasswordSent') }}</p>
    <UButton variant="outline" to="/login" :label="$t('auth.goToLogin')" />
  </div>

  <UAuthForm
    v-else
    :title="$t('auth.forgotPasswordTitle')"
    :description="$t('auth.forgotPasswordDescription')"
    :fields="fields"
    :submit="{ label: $t('auth.forgotPasswordSubmit') }"
    :schema="schema"
    :loading="loading"
    @submit="onSubmit"
  >
    <template #footer>
      <div class="text-center text-sm">
        <NuxtLink to="/login" class="text-primary hover:underline">
          {{ $t('auth.goToLogin') }}
        </NuxtLink>
      </div>
    </template>
  </UAuthForm>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

const { t } = useI18n()
const authStore = useAuthStore()
const loading = ref(false)
const sent = ref(false)

const schema = z.object({
  email: z.email(t('validation.email')),
})

const fields = computed(() => [
  {
    name: 'email',
    label: t('auth.email'),
    type: 'email' as const,
    placeholder: t('auth.emailPlaceholder'),
    required: true,
  },
])

async function onSubmit(event: any) {
  loading.value = true
  try {
    await authStore.forgotPassword(event.data.email)
  }
  catch {
    // Show success regardless to avoid email enumeration
  }
  finally {
    loading.value = false
    sent.value = true
  }
}
</script>
