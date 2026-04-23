<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
    <div class="mb-8">
      <NuxtLink to="/" class="text-3xl font-bold text-primary">
        Kovia
      </NuxtLink>
    </div>

    <div class="w-full max-w-md">
      <!-- Loading -->
      <UCard v-if="loading">
        <div class="flex flex-col items-center py-8">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary mb-4" />
          <p class="text-sm text-gray-500">{{ t('invite.validating') }}</p>
        </div>
      </UCard>

      <!-- Expired -->
      <UCard v-else-if="expired">
        <div class="text-center py-6">
          <UIcon name="i-lucide-clock" class="w-12 h-12 text-error mx-auto mb-4" />
          <h2 class="text-xl font-bold mb-2">{{ t('teamInvite.expired') }}</h2>
          <p class="text-sm text-gray-500">{{ t('teamInvite.expiredDescription') }}</p>
        </div>
      </UCard>

      <!-- Invalid -->
      <UCard v-else-if="invalid">
        <div class="text-center py-6">
          <UIcon name="i-lucide-x-circle" class="w-12 h-12 text-error mx-auto mb-4" />
          <h2 class="text-xl font-bold mb-2">{{ t('teamInvite.invalid') }}</h2>
          <p class="text-sm text-gray-500">{{ t('teamInvite.invalidDescription') }}</p>
        </div>
      </UCard>

      <!-- Valid invite -->
      <UCard v-else-if="invite">
        <div class="text-center mb-6">
          <UIcon name="i-lucide-party-popper" class="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 class="text-xl font-bold">{{ t('teamInvite.heading') }}</h2>
          <p class="text-sm text-gray-500 mt-2">
            {{ t('teamInvite.description', { role: roleLabel, orgName: invite.orgName }) }}
          </p>
        </div>

        <UFormField :label="t('auth.email')" class="mb-4">
          <UInput
            :model-value="invite.email"
            disabled
            class="bg-gray-50 dark:bg-gray-900"
          />
        </UFormField>

        <!-- Authenticated branch -->
        <div v-if="authStore.isAuthenticated" class="space-y-3">
          <p class="text-sm text-gray-600 text-center">
            {{ t('teamInvite.alreadyLoggedIn', { email: authStore.user?.email }) }}
          </p>
          <UButton
            block
            color="primary"
            :loading="accepting"
            :label="t('teamInvite.accept')"
            @click="acceptInvite"
          />
        </div>

        <!-- Unauthenticated branch -->
        <div v-else class="space-y-3">
          <UButton
            block
            color="primary"
            :label="t('auth.register')"
            @click="goRegister"
          />
          <div class="text-center text-xs text-gray-400">
            {{ t('common.or') }}
          </div>
          <UButton
            block
            variant="outline"
            :label="t('auth.login')"
            @click="goLogin"
          />
          <UButton
            block
            variant="outline"
            icon="i-simple-icons-google"
            :label="t('auth.googleLogin')"
            @click="continueWithGoogle"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

interface InviteData {
  id: string
  email: string
  role: 'ORG_STAFF' | 'ORG_ADMIN'
  orgId: string
  orgName: string
  expiresAt: string
}

const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()
const config = useRuntimeConfig()
const toast = useToast()
const { post } = useApi()

const token = computed(() => route.params.token as string)

const loading = ref(true)
const expired = ref(false)
const invalid = ref(false)
const invite = ref<InviteData | null>(null)
const accepting = ref(false)

const roleLabel = computed(() => (invite.value?.role === 'ORG_STAFF' ? 'Staff' : invite.value?.role ?? ''))

async function validateInvite() {
  loading.value = true
  expired.value = false
  invalid.value = false
  try {
    const result = await $fetch<InviteData>('/team/invites/validate', {
      method: 'POST',
      baseURL: config.public.apiUrl as string,
      body: { token: token.value },
    })
    invite.value = result
  } catch (err: any) {
    const msg = err?.data?.message ?? ''
    if (typeof msg === 'string' && (msg.includes('expirado') || msg.includes('ya fue aceptada'))) {
      expired.value = true
    } else {
      invalid.value = true
    }
  } finally {
    loading.value = false
  }
}

async function acceptInvite() {
  accepting.value = true
  try {
    const result = await post<{ accessToken: string }>('/team/invites/accept', { token: token.value })
    // Backend returns a freshly signed token with the new role + orgId
    if (result?.accessToken) {
      authStore.accessToken = result.accessToken
    }
    await authStore.fetchProfile()
    toast.add({ title: t('teamInvite.success'), color: 'success' })
    await navigateTo('/org/dashboard')
  } catch (err: any) {
    const backendMsg = err?.data?.message
    toast.add({
      title: typeof backendMsg === 'string' ? backendMsg : t('team.inviteError'),
      color: 'error',
    })
  } finally {
    accepting.value = false
  }
}

function goRegister() {
  navigateTo(`/register?teamInvite=${token.value}`)
}

function goLogin() {
  navigateTo(`/login?redirect=/team/accept/${token.value}`)
}

function continueWithGoogle() {
  // Persist accept-URL so the OAuth callback returns the user here after Google sign-in
  if (import.meta.client) {
    sessionStorage.setItem('kovia:oauth_redirect', `/team/accept/${token.value}`)
  }
  authStore.loginWithGoogle()
}

onMounted(validateInvite)
</script>
