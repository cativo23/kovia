<template>
  <UAuthForm
    :title="$t('auth.loginTitle')"
    :description="$t('auth.loginDescription')"
    :fields="fields"
    :providers="providers"
    :submit="{ label: $t('auth.loginSubmit') }"
    :schema="schema"
    :separator="$t('common.or')"
    :loading="loading"
    @submit="onSubmit"
  >
    <template #footer>
      <div class="space-y-3">
        <div v-if="showVerificationError" class="rounded-md bg-warning-50 dark:bg-warning-950 p-3 text-sm text-warning-700 dark:text-warning-300">
          <p>{{ $t('auth.emailNotVerified') }}</p>
          <button
            class="mt-2 text-primary font-medium hover:underline disabled:opacity-50"
            :disabled="resendingVerification"
            @click="resendVerification"
          >
            {{ resendingVerification ? $t('common.loading') : $t('auth.resendLink') }}
          </button>
        </div>
        <div class="text-center text-sm space-y-2">
          <div>
            <NuxtLink to="/forgot-password" class="text-primary hover:underline">
              {{ $t('auth.forgotPassword') }}
            </NuxtLink>
          </div>
          <div>
            {{ $t('auth.noAccount') }}
            <NuxtLink to="/register" class="text-primary font-medium hover:underline">
              {{ $t('auth.createAccount') }}
            </NuxtLink>
          </div>
        </div>
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
const toast = useToast()
const loading = ref(false)
const resendingVerification = ref(false)
const showVerificationError = ref(false)
const unverifiedEmail = ref('')

const schema = z.object({
  email: z.email(t('validation.email')),
  password: z.string(t('validation.required')).min(1, t('validation.required')),
})

const fields = computed(() => [
  {
    name: 'email',
    label: t('auth.email'),
    type: 'email' as const,
    placeholder: t('auth.emailPlaceholder'),
    required: true,
  },
  {
    name: 'password',
    label: t('auth.password'),
    type: 'password' as const,
    placeholder: t('auth.passwordPlaceholder'),
    required: true,
  },
])

const providers = computed(() => [
  {
    label: t('auth.googleLogin'),
    icon: 'i-simple-icons-google',
    color: 'neutral' as const,
    variant: 'subtle' as const,
    block: true,
    onClick: () => authStore.loginWithGoogle(),
  },
])

async function onSubmit(event: any) {
  loading.value = true
  showVerificationError.value = false
  try {
    await authStore.login(event.data.email, event.data.password)
    await navigateTo(authStore.isAdmin ? '/admin' : '/')
  }
  catch (err: any) {
    const status = err?.response?.status || err?.statusCode
    if (status === 403) {
      showVerificationError.value = true
      unverifiedEmail.value = event.data.email
    } else {
      toast.add({
        title: t('auth.loginError'),
        color: 'error',
      })
    }
  }
  finally {
    loading.value = false
  }
}

async function resendVerification() {
  resendingVerification.value = true
  try {
    const { post } = useApi()
    await post('/auth/resend-verification', { email: unverifiedEmail.value })
    toast.add({
      title: t('auth.resendLinkSuccess'),
      color: 'success',
    })
    showVerificationError.value = false
  }
  catch {
    toast.add({
      title: t('auth.resendError'),
      color: 'error',
    })
  }
  finally {
    resendingVerification.value = false
  }
}
</script>
