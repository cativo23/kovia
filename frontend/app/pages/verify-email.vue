<template>
  <div class="text-center space-y-4">
    <!-- Loading state -->
    <template v-if="status === 'loading'">
      <UIcon name="i-lucide-loader-2" class="w-12 h-12 text-primary mx-auto animate-spin" />
      <h2 class="text-xl font-semibold">{{ $t('auth.verifyEmailTitle') }}</h2>
      <p class="text-gray-600 dark:text-gray-400">{{ $t('common.loading') }}</p>
    </template>

    <!-- Success state -->
    <template v-else-if="status === 'success'">
      <UIcon name="i-lucide-check-circle" class="w-16 h-16 text-green-500 mx-auto" />
      <h2 class="text-xl font-semibold">{{ $t('auth.verifyEmailSuccess') }}</h2>
      <p class="text-gray-600 dark:text-gray-400">{{ $t('auth.verifyEmailRedirect') }}</p>
    </template>

    <!-- Expired link state -->
    <template v-else-if="status === 'expired'">
      <UIcon name="i-lucide-clock" class="w-16 h-16 text-amber-500 mx-auto" />
      <h2 class="text-xl font-semibold">{{ $t('auth.linkExpired') }}</h2>
      <p class="text-gray-600 dark:text-gray-400">{{ $t('auth.linkExpiredDescription') }}</p>
      <UButton
        :label="$t('auth.resendLink')"
        :loading="resending"
        @click="resendVerification"
      />
    </template>

    <!-- Generic error state -->
    <template v-else>
      <UIcon name="i-lucide-x-circle" class="w-16 h-16 text-red-500 mx-auto" />
      <h2 class="text-xl font-semibold">{{ $t('auth.verifyError') }}</h2>
      <p class="text-gray-600 dark:text-gray-400">{{ errorMessage }}</p>
      <UButton variant="outline" to="/login" :label="$t('auth.goToLogin')" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'auth',
})

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()

const status = ref<'loading' | 'success' | 'expired' | 'error'>('loading')
const errorMessage = ref('')
const resending = ref(false)

onMounted(async () => {
  const token = route.query.token as string
  if (!token) {
    status.value = 'error'
    errorMessage.value = t('auth.verifyError')
    return
  }

  try {
    await authStore.verifyEmail(token)
    status.value = 'success'
    setTimeout(async () => {
      const inviteToken = import.meta.client ? sessionStorage.getItem('inviteToken') : null
      if (inviteToken) {
        try {
          const config = useRuntimeConfig()
          await $fetch('/organizations/claim-invite', {
            method: 'POST',
            baseURL: config.public.apiUrl as string,
            body: { token: inviteToken },
            headers: { Authorization: `Bearer ${authStore.accessToken}` },
            credentials: 'include',
          })
          // Refresh tokens to get updated role in JWT
          await authStore.refreshToken()
          await authStore.fetchProfile()
        } catch {
          // If claim fails, still redirect to setup — it will show error
        }
        navigateTo('/org/setup')
      } else {
        navigateTo('/')
      }
    }, 2000)
  }
  catch (error: any) {
    const errorCode = error?.data?.code || error?.data?.message || ''
    if (errorCode === 'TOKEN_EXPIRED' || errorCode.includes('expired')) {
      status.value = 'expired'
    }
    else {
      status.value = 'error'
      errorMessage.value = error?.data?.message || t('auth.verifyError')
    }
  }
})

async function resendVerification() {
  resending.value = true
  try {
    const email = route.query.email as string
    if (email) {
      const config = useRuntimeConfig()
      await $fetch('/auth/resend-verification', {
        method: 'POST',
        baseURL: config.public.apiUrl as string,
        body: { email },
      })
      toast.add({
        title: t('auth.resendLinkSuccess'),
        color: 'success',
      })
    }
  }
  catch {
    toast.add({
      title: t('common.error'),
      color: 'error',
    })
  }
  finally {
    resending.value = false
  }
}
</script>
