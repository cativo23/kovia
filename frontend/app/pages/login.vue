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

const schema = z.object({
  email: z.string().default('').email(t('validation.email')),
  password: z.string().default('').min(1, t('validation.required')),
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
  try {
    await authStore.login(event.data.email, event.data.password)
    await navigateTo(authStore.isAdmin ? '/admin' : '/')
  }
  catch {
    toast.add({
      title: t('auth.loginError'),
      color: 'error',
    })
  }
  finally {
    loading.value = false
  }
}
</script>
