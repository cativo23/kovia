<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
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
          <p class="text-gray-500">{{ $t('invite.validating') }}</p>
        </div>
      </UCard>

      <!-- Expired -->
      <UCard v-else-if="expired">
        <div class="text-center py-6">
          <UIcon name="i-lucide-clock" class="w-12 h-12 text-error mx-auto mb-4" />
          <h2 class="text-xl font-bold mb-2">{{ $t('invite.expired') }}</h2>
          <p class="text-gray-500 mb-4">{{ $t('invite.expiredDescription') }}</p>
        </div>
      </UCard>

      <!-- Invalid -->
      <UCard v-else-if="invalid">
        <div class="text-center py-6">
          <UIcon name="i-lucide-x-circle" class="w-12 h-12 text-error mx-auto mb-4" />
          <h2 class="text-xl font-bold mb-2">{{ $t('invite.invalid') }}</h2>
          <p class="text-gray-500">{{ $t('invite.invalidDescription') }}</p>
        </div>
      </UCard>

      <!-- Valid Invite -->
      <UCard v-else-if="invite">
        <div class="text-center mb-6">
          <UIcon name="i-lucide-party-popper" class="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 class="text-xl font-bold">{{ $t('invite.welcome') }}</h2>
          <p class="text-gray-500 mt-2">
            {{ $t('invite.welcomeDescription', { orgName: invite.orgName }) }}
          </p>
        </div>

        <div v-if="authStore.isAuthenticated" class="space-y-4">
          <p class="text-sm text-gray-600 text-center">
            {{ $t('invite.alreadyLoggedIn') }}
          </p>
          <UButton
            block
            :label="$t('invite.setupOrg')"
            @click="goToSetup"
          />
        </div>

        <div v-else class="space-y-4">
          <p class="text-sm text-gray-600 text-center">
            {{ $t('invite.createAccountFirst') }}
          </p>
          <UButton
            block
            :label="$t('auth.register')"
            @click="goToRegister"
          />
          <div class="text-center text-sm text-gray-500">
            {{ $t('auth.hasAccount') }}
            <UButton variant="link" :label="$t('auth.goToLogin')" @click="goToLogin" />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()

const loading = ref(true)
const expired = ref(false)
const invalid = ref(false)
const invite = ref<any>(null)

const token = computed(() => route.params.token as string)

async function validateInvite() {
  try {
    const config = useRuntimeConfig()
    const result = await $fetch<any>('/organizations/validate-invite', {
      method: 'POST',
      baseURL: config.public.apiUrl as string,
      body: { token: token.value },
    })
    invite.value = result

    // Store token in sessionStorage for org setup
    if (import.meta.client) {
      sessionStorage.setItem('inviteToken', token.value)
      sessionStorage.setItem('inviteOrgName', result.orgName)
      sessionStorage.setItem('inviteEmail', result.email)
    }
  } catch (error: any) {
    if (error?.data?.message?.includes('expirado') || error?.data?.message?.includes('expired')) {
      expired.value = true
    } else {
      invalid.value = true
    }
  } finally {
    loading.value = false
  }
}

function goToSetup() {
  navigateTo('/org/setup')
}

function goToRegister() {
  navigateTo(`/register?invite=${token.value}`)
}

function goToLogin() {
  navigateTo(`/login?redirect=/org/setup`)
}

onMounted(() => {
  validateInvite()
})
</script>
