<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
    <div class="max-w-sm w-full mx-auto mt-16 px-4">

      <!-- Loading -->
      <div v-if="loading" class="text-center py-8">
        <KIcon name="loader-2" :size="32" class="animate-spin text-primary mx-auto mb-4" />
      </div>

      <!-- Confirmed (after CTA click) -->
      <div v-else-if="confirmed" class="text-center py-8">
        <KIcon name="check-circle" :size="64" class="text-[var(--color-verde-forestal-500)] mx-auto mb-4" />
        <h1 class="text-xl font-bold mb-2">{{ $t('coapplicant.confirm.successHeading') }}</h1>
        <p class="text-base text-gray-500">{{ $t('coapplicant.confirm.successBody') }}</p>
      </div>

      <!-- Expired or Invalid (visually identical per D-12) -->
      <div v-else-if="expired || invalid" class="text-center py-8">
        <KIcon name="alert-circle" :size="48" class="text-[var(--color-ambar-500)] mx-auto mb-4" />
        <h1 class="text-xl font-bold mb-2">{{ $t('coapplicant.confirm.expiredHeading') }}</h1>
        <p class="text-base text-gray-500">{{ $t('coapplicant.confirm.expiredBody') }}</p>
      </div>

      <!-- Valid token — show confirmation CTA -->
      <div v-else-if="context" class="text-center py-8">
        <h1 class="text-xl font-bold mb-4">{{ $t('coapplicant.confirm.heading') }}</h1>
        <p class="text-base text-gray-500 mb-6">
          {{ $t('coapplicant.confirm.body', { adopterFirstName: context.adopterFirstName, animalName: context.animalName }) }}
        </p>
        <UButton
          color="primary"
          size="lg"
          :label="$t('coapplicant.confirm.cta')"
          :loading="confirming"
          @click="confirm"
        />
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

definePageMeta({
  layout: false,
})

const route = useRoute()
const config = useRuntimeConfig()

const token = computed(() => route.params.token as string)

// State machine refs
const loading = ref(true)
const expired = ref(false)
const invalid = ref(false)
const confirmed = ref(false)
const confirming = ref(false)
const context = ref<{ animalName: string; adopterFirstName: string } | null>(null)

async function loadContext() {
  loading.value = true
  expired.value = false
  invalid.value = false
  context.value = null

  try {
    const result = await $fetch<{ animalName: string; adopterFirstName: string }>(
      `/co-aplicante/confirmar/${token.value}`,
      { baseURL: config.public.apiUrl as string }
    )
    context.value = result
  } catch (err: any) {
    const msg = err?.data?.message ?? ''
    if (typeof msg === 'string' && msg.toLowerCase().includes('expirado')) {
      expired.value = true
    } else {
      invalid.value = true
    }
  } finally {
    loading.value = false
  }
}

async function confirm() {
  confirming.value = true
  try {
    await $fetch(`/co-aplicante/confirmar/${token.value}`, {
      method: 'POST',
      baseURL: config.public.apiUrl as string,
    })
    confirmed.value = true
  } catch (err: any) {
    const msg = err?.data?.message ?? ''
    if (typeof msg === 'string' && msg.toLowerCase().includes('expirado')) {
      expired.value = true
    } else {
      invalid.value = true
    }
    context.value = null
  } finally {
    confirming.value = false
  }
}

onMounted(loadContext)
</script>
