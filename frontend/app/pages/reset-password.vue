<template>
  <!-- Expired link state -->
  <div v-if="status === 'expired'" class="text-center space-y-4">
    <UIcon name="i-lucide-clock" class="w-16 h-16 text-amber-500 mx-auto" />
    <h2 class="text-xl font-semibold">{{ $t('auth.linkExpired') }}</h2>
    <p class="text-gray-600 dark:text-gray-400">{{ $t('auth.linkExpiredDescription') }}</p>
    <UButton
      :label="$t('auth.resendLink')"
      to="/forgot-password"
    />
  </div>

  <!-- Reset form -->
  <UAuthForm
    v-else
    :title="$t('auth.resetPasswordTitle')"
    :description="$t('auth.resetPasswordDescription')"
    :fields="fields"
    :submit="{ label: $t('auth.resetPasswordSubmit') }"
    :schema="schema"
    :loading="loading"
    @submit="onSubmit"
  />
</template>

<script setup lang="ts">
import { z } from 'zod'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'auth',
})

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()
const loading = ref(false)
const status = ref<'form' | 'expired'>('form')

const token = route.query.token as string

const schema = z.object({
  password: z.string()
    .min(8, t('validation.minLength', { min: 8 }))
    .regex(/[A-Z]/, t('validation.passwordComplexity'))
    .regex(/[a-z]/, t('validation.passwordComplexity'))
    .regex(/[0-9]/, t('validation.passwordComplexity')),
  confirmPassword: z.string().min(1, t('validation.required')),
}).refine(data => data.password === data.confirmPassword, {
  message: t('validation.passwordMismatch'),
  path: ['confirmPassword'],
})

const fields = computed(() => [
  {
    name: 'password',
    label: t('auth.newPassword'),
    type: 'password' as const,
    placeholder: t('auth.newPasswordPlaceholder'),
    required: true,
  },
  {
    name: 'confirmPassword',
    label: t('auth.confirmPassword'),
    type: 'password' as const,
    placeholder: t('auth.confirmPasswordPlaceholder'),
    required: true,
  },
])

async function onSubmit(event: any) {
  loading.value = true
  try {
    await authStore.resetPassword(token, event.data.password)
    await navigateTo('/')
  }
  catch (error: any) {
    const errorCode = error?.data?.code || error?.data?.message || ''
    if (errorCode === 'TOKEN_EXPIRED' || errorCode.includes('expired')) {
      status.value = 'expired'
    }
    else {
      toast.add({
        title: t('auth.resetError'),
        color: 'error',
      })
    }
  }
  finally {
    loading.value = false
  }
}
</script>
