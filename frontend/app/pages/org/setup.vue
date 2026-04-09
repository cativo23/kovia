<template>
  <div class="max-w-2xl mx-auto py-8">
    <div class="mb-8">
      <h1 class="text-2xl font-bold">{{ $t('org.setup.title') }}</h1>
      <p class="text-gray-500 mt-1">{{ $t('org.setup.description') }}</p>
    </div>

    <UCard>
      <form class="space-y-6" @submit.prevent="submitOrg">
        <UFormField :label="$t('org.name')" required>
          <UInput
            v-model="form.name"
            :placeholder="$t('org.setup.namePlaceholder')"
            required
          />
        </UFormField>

        <UFormField :label="$t('org.description')">
          <UTextarea
            v-model="form.description"
            :placeholder="$t('org.setup.descriptionPlaceholder')"
            :rows="3"
          />
        </UFormField>

        <UFormField :label="$t('org.logo')">
          <UInput
            v-model="form.logoUrl"
            type="url"
            :placeholder="$t('org.setup.logoPlaceholder')"
          />
          <template #hint>
            <span class="text-xs text-gray-400">{{ $t('org.setup.logoHint') }}</span>
          </template>
        </UFormField>

        <UFormField :label="$t('org.contactEmail')" required>
          <UInput
            v-model="form.contactEmail"
            type="email"
            :placeholder="$t('auth.emailPlaceholder')"
            required
          />
        </UFormField>

        <UFormField :label="$t('org.phone')">
          <UInput
            v-model="form.phone"
            type="tel"
            :placeholder="$t('org.setup.phonePlaceholder')"
          />
        </UFormField>

        <div class="border-t border-gray-200 dark:border-gray-800 pt-6">
          <h3 class="font-semibold mb-4">{{ $t('org.setup.socialTitle') }}</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField :label="$t('org.instagram')">
              <UInput
                v-model="form.instagram"
                :placeholder="$t('org.setup.instagramPlaceholder')"
                icon="i-lucide-instagram"
              />
            </UFormField>
            <UFormField :label="$t('org.facebook')">
              <UInput
                v-model="form.facebook"
                :placeholder="$t('org.setup.facebookPlaceholder')"
                icon="i-lucide-facebook"
              />
            </UFormField>
            <UFormField :label="$t('org.whatsapp')">
              <UInput
                v-model="form.whatsapp"
                :placeholder="$t('org.setup.whatsappPlaceholder')"
                icon="i-lucide-message-circle"
              />
            </UFormField>
          </div>
        </div>

        <div v-if="error" class="text-error text-sm">
          {{ error }}
        </div>

        <div class="flex justify-end">
          <UButton
            type="submit"
            :label="$t('org.setup.submit')"
            :loading="submitting"
            size="lg"
          />
        </div>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { t } = useI18n()
const { post } = useApi()
const toast = useToast()

const submitting = ref(false)
const error = ref('')

const form = reactive({
  name: '',
  description: '',
  logoUrl: '',
  contactEmail: '',
  phone: '',
  instagram: '',
  facebook: '',
  whatsapp: '',
})

onMounted(() => {
  if (import.meta.client) {
    const orgName = sessionStorage.getItem('inviteOrgName')
    if (orgName) {
      form.name = orgName
    }
    const email = sessionStorage.getItem('inviteEmail')
    if (email) {
      form.contactEmail = email
    }
  }
})

async function submitOrg() {
  submitting.value = true
  error.value = ''

  try {
    await post('/organizations', form)

    // Clean up session storage
    if (import.meta.client) {
      sessionStorage.removeItem('inviteToken')
      sessionStorage.removeItem('inviteOrgName')
      sessionStorage.removeItem('inviteEmail')
    }

    toast.add({ title: t('org.setup.success'), color: 'success' })
    await navigateTo('/')
  } catch (err: any) {
    error.value = err?.data?.message || t('common.error')
  } finally {
    submitting.value = false
  }
}
</script>
