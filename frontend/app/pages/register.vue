<template>
  <div v-if="registered" class="text-center space-y-4">
    <UIcon name="i-lucide-mail-check" class="w-16 h-16 text-primary mx-auto" />
    <h2 class="text-xl font-semibold">{{ $t('auth.checkEmail') }}</h2>
    <p class="text-gray-600 dark:text-gray-400">{{ $t('auth.checkEmailDescription') }}</p>
    <p class="text-xs text-gray-400 dark:text-gray-500">{{ $t('auth.checkEmailDevHint') }}</p>
    <UButton variant="outline" to="/login" :label="$t('auth.goToLogin')" />
  </div>

  <UAuthForm
    v-else
    :title="$t('auth.registerTitle')"
    :description="$t('auth.registerDescription')"
    :fields="fields"
    :providers="providers"
    :submit="{ label: $t('auth.registerSubmit') }"
    :schema="schema"
    :separator="$t('common.or')"
    :loading="loading"
    @submit="onSubmit"
  >
    <template #footer>
      <div class="text-center text-sm">
        {{ $t('auth.hasAccount') }}
        <NuxtLink to="/login" class="text-primary font-medium hover:underline">
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
const toast = useToast()
const loading = ref(false)
const registered = ref(false)

const schema = z.object({
  firstName: z.string().default('').min(1, t('validation.required')),
  lastName: z.string().default('').min(1, t('validation.required')),
  email: z.string().default('').email(t('validation.email')),
  password: z.string().default('')
    .min(8, t('validation.minLength', { min: 8 }))
    .regex(/[A-Z]/, t('validation.passwordComplexity'))
    .regex(/[a-z]/, t('validation.passwordComplexity'))
    .regex(/[0-9]/, t('validation.passwordComplexity')),
  confirmPassword: z.string().default('').min(1, t('validation.required')),
}).refine(data => data.password === data.confirmPassword, {
  message: t('validation.passwordMismatch'),
  path: ['confirmPassword'],
})

const fields = computed(() => [
  {
    name: 'firstName',
    label: t('auth.firstName'),
    type: 'text' as const,
    placeholder: t('auth.firstNamePlaceholder'),
    required: true,
  },
  {
    name: 'lastName',
    label: t('auth.lastName'),
    type: 'text' as const,
    placeholder: t('auth.lastNamePlaceholder'),
    required: true,
  },
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
  {
    name: 'confirmPassword',
    label: t('auth.confirmPassword'),
    type: 'password' as const,
    placeholder: t('auth.confirmPasswordPlaceholder'),
    required: true,
  },
])

const providers = computed(() => [
  {
    label: t('auth.googleRegister'),
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
    await authStore.register({
      firstName: event.data.firstName,
      lastName: event.data.lastName,
      email: event.data.email,
      password: event.data.password,
    })
    registered.value = true
  }
  catch {
    toast.add({
      title: t('auth.registerError'),
      color: 'error',
    })
  }
  finally {
    loading.value = false
  }
}
</script>
