<template>
  <div class="text-center space-y-4">
    <template v-if="status === 'loading'">
      <UIcon name="i-lucide-loader-2" class="w-12 h-12 text-primary mx-auto animate-spin" />
      <h2 class="text-xl font-semibold">{{ $t('auth.oauthCallback') }}</h2>
    </template>

    <template v-else>
      <UIcon name="i-lucide-x-circle" class="w-16 h-16 text-error mx-auto" />
      <h2 class="text-xl font-semibold">{{ $t('auth.oauthError') }}</h2>
      <UButton variant="outline" to="/login" :label="$t('auth.goToLogin')" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'auth',
})

const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()

const status = ref<'loading' | 'error'>('loading')

onMounted(async () => {
  const token = route.query.token as string
  if (!token) {
    status.value = 'error'
    return
  }

  try {
    await authStore.handleOAuthCallback(token) // populates authStore.user

    if (route.query.new === 'true') {
      toast.add({
        title: t('auth.welcomeToKovia', { firstName: authStore.user?.firstName ?? '' }),
        color: 'success',
      })
    }
    else if (route.query.linked === 'true') {
      toast.add({ title: t('auth.googleLinked'), color: 'info' })
    }

    const dest = sessionStorage.getItem('kovia:oauth_redirect') ?? '/'
    sessionStorage.removeItem('kovia:oauth_redirect')
    await navigateTo(dest)
  }
  catch {
    status.value = 'error'
  }
})
</script>
