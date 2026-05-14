<template>
  <div>
    <!-- Not found (also covers 404 from D-07 fail-closed: dossierComplete=false) -->
    <UCard v-if="!animal" class="text-center py-12">
      <KIcon name="paw-print" :size="64" class="text-gray-300 mx-auto mb-4" />
      <h2 class="text-xl font-bold text-[--color-text]/70 mb-2">
        {{ $t('detail.notFound') }}
      </h2>
      <p class="text-gray-500 mb-6">{{ $t('detail.notFoundMessage') }}</p>
      <UButton to="/animales" variant="outline" :label="$t('detail.breadcrumb')">
        <template #leading><KIcon name="arrow-left" /></template>
      </UButton>
    </UCard>

    <!-- Long-form dossier (D-20: single-column max-w-2xl reading layout) -->
    <div v-else class="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 space-y-8">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-sm text-gray-500">
        <NuxtLink to="/animales" class="hover:text-primary transition-colors">
          {{ $t('detail.breadcrumb') }}
        </NuxtLink>
        <KIcon name="chevron-right" :size="16" />
        <span class="text-[--color-text] font-medium">{{ animal.name }}</span>
      </nav>

      <!-- 1. PhotoGallery -->
      <PhotoGallery :photos="animal.photos" :animal-name="animal.name" />

      <!-- 2. Animal name + species + breed
           (3. Status badge omitted: GET /public/animals/:id pre-filters to
           status='AVAILABLE' AND dossierComplete=true — D-07 fail-closed. The
           public detail DTO carries no `status` field, so a non-AVAILABLE row
           returns 404 and renders the not-found UCard at the top.) -->
      <header class="space-y-2">
        <h1 class="text-4xl font-bold font-display text-[--color-text]">
          {{ animal.name }}
        </h1>
        <div class="flex flex-wrap gap-2">
          <UBadge color="primary" variant="soft">{{ animal.species.name }}</UBadge>
          <UBadge v-if="animal.breed" color="neutral" variant="soft">{{ animal.breed }}</UBadge>
        </div>
      </header>

      <!-- 4. GuidancePill (dossier variant) -->
      <GuidancePill
        v-if="animal.guidance"
        :guidance="animal.guidance"
        variant="dossier"
        size="md"
      />

      <!-- 5. Evaluación conductual -->
      <DossierSection :heading="$t('dossier.behavioral.heading')">
        <p>{{ animal.behavioralEvaluation }}</p>
      </DossierSection>

      <!-- 6. Historial médico -->
      <DossierSection :heading="$t('dossier.medical.heading')">
        <p>{{ animal.medicalHistory }}</p>
      </DossierSection>

      <!-- 7. Costo mensual estimado -->
      <DossierSection :heading="$t('dossier.cost.heading')">
        <p>{{ costCopy }}</p>
      </DossierSection>

      <!-- 8. Disparadores conocidos -->
      <DossierSection :heading="$t('dossier.triggers.heading')">
        <ul v-if="animal.knownTriggers && animal.knownTriggers.length" class="list-disc pl-6 space-y-1">
          <li v-for="(t, i) in animal.knownTriggers" :key="i">{{ t }}</li>
        </ul>
        <p v-else>{{ $t('dossier.triggers.empty') }}</p>
      </DossierSection>

      <!-- 9. Regla 3-3-3 (LOCKED es-SV body per D-06 — comes from i18n only) -->
      <DossierSection :heading="$t('dossier.regla333.heading')">
        <p>{{ $t('dossier.regla333.body') }}</p>
      </DossierSection>

      <!-- 10. Tiempo en refugio (coral when > 60 days per UI-SPEC §Color reserved-for #4) -->
      <DossierSection :heading="$t('dossier.timeAtShelter.heading')">
        <p :class="daysAtShelter > 60 ? 'text-[color:var(--color-coral-electrico)] font-semibold' : ''">
          {{ timeAtShelterCopy }}
        </p>
      </DossierSection>

      <!-- 11. Organization -->
      <div class="border-t pt-6">
        <h3 class="font-semibold text-[--color-text] mb-3">
          {{ $t('detail.organization') }}
        </h3>
        <NuxtLink
          :to="`/org/${animal.organization.slug}`"
          class="flex items-center gap-3 group"
        >
          <div class="w-12 h-12 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
            <img
              v-if="animal.organization.logoUrl"
              :src="animal.organization.logoUrl"
              :alt="animal.organization.name"
              class="w-full h-full object-cover"
            />
            <UIcon v-else name="building-2" class="w-6 h-6 text-primary" />
          </div>
          <span class="font-medium text-[--color-text] group-hover:text-primary transition-colors">
            {{ animal.organization.name }}
          </span>
          <KIcon name="arrow-right" :size="16" class="text-gray-400 group-hover:text-primary transition-colors ml-auto" />
        </NuxtLink>
      </div>

      <!-- 12. DossierAckCheckbox -->
      <DossierAckCheckbox v-model="ackChecked" />

      <!-- 13. Aplicar CTA — ack-gated per D-10.
           Both `disabled` AND `aria-disabled` are bound so the @phase15
           playwright spec (15-08) can assert the gate via either ARIA or the
           native DOM attribute. -->
      <UButton
        size="lg"
        color="primary"
        block
        class="rounded-[--radius-pill]"
        :disabled="!ackChecked"
        :aria-disabled="!ackChecked"
        :label="$t('dossier.apply.cta')"
        @click="handleApplyClick"
      >
        <template #leading><KIcon name="heart" /></template>
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import GuidancePill from '~/components/animals/GuidancePill.vue'
import DossierSection from '~/components/animals/DossierSection.vue'
import DossierAckCheckbox from '~/components/animals/DossierAckCheckbox.vue'
import type { AnimalPublicDetail } from '~/types/public-animal'

/**
 * Phase 15-06 — Long-form dossier page (PUBLIC-04 + PUBLIC-05).
 *
 * Rewrites the prior two-column detail into a single-column max-w-2xl
 * long-form reading layout (D-20 + UI-SPEC §Bento Grid lines 55-59) with
 * the 6 dossier sections in the locked order (UI-SPEC §Copywriting Contract
 * §Dossier sections).
 *
 * Data source: GET /public/animals/:id from PublicAnimalsController (15-03).
 * Server filters fail-closed on `dossierComplete=false` (D-07) — those rows
 * 404, rendering the same not-found UCard as a missing-id.
 *
 * Ack flow (D-10 + D-11):
 *   - Tick the checkbox → ackChecked = true → Aplicar enabled.
 *   - Aplicar (authenticated): POST /public/animals/:id/acknowledge-dossier
 *     then navigate to /animales/:id/aplicar (Phase 16 owns that route).
 *   - Aplicar (unauthenticated): persist ack state to sessionStorage keyed by
 *     `kovia.dossierAck.{id}` then redirect to /login?redirect=/animales/{id}.
 *     On return, onMounted rehydrates and one-shot removes the entry.
 *
 * Frontend disable is UX only — the backend DossierAckGuard (15-03) is the
 * security boundary; it gets bound to the apply endpoint in Phase 16.
 *
 * Section order is LOCKED — do not reorder. Regla 3-3-3 body comes from
 * i18n only (D-06); never hardcoded.
 */

definePageMeta({ layout: 'default' })

const route = useRoute()
const config = useRuntimeConfig()
const authStore = useAuthStore()

const { data: animal } = await useFetch<AnimalPublicDetail>(
  `/public/animals/${route.params.id}`,
  {
    baseURL: config.public.apiUrl as string,
  },
).catch(() => ({ data: ref(null) }))

// OG meta tags — critical for social sharing
useSeoMeta({
  title: () =>
    animal.value
      ? `${animal.value.name} - Adopcion | Kovia`
      : 'Animal | Kovia',
  ogTitle: () => animal.value?.name || 'Animal en adopcion',
  description: () =>
    animal.value
      ? `Conoce a ${animal.value.name}, disponible para adopcion en Kovia`
      : 'Animal disponible para adopcion en Kovia',
  ogDescription: () =>
    animal.value
      ? `Conoce a ${animal.value.name}, disponible para adopcion en Kovia`
      : 'Animal disponible para adopcion en Kovia',
  ogImage: () => animal.value?.photos?.[0]?.url || '/og-default.png',
  ogType: 'article',
  twitterCard: 'summary_large_image',
})

// --- Ack state + rehydration ---
const ackChecked = ref(false)

const STORAGE_KEY = computed(() => `kovia.dossierAck.${route.params.id}`)

onMounted(() => {
  if (typeof window === 'undefined') return
  if (sessionStorage.getItem(STORAGE_KEY.value) === 'true') {
    ackChecked.value = true
  }
  // One-shot: clear after rehydration regardless of value, so a later visit
  // doesn't auto-tick from a prior session.
  sessionStorage.removeItem(STORAGE_KEY.value)
})

// Local handle on $t for use in computed properties (template uses $t directly).
const { t } = useI18n()

// --- Cost copy ---
const costCopy = computed(() => {
  if (!animal.value) return ''
  const min = animal.value.monthlyCostUsdMin
  const max = animal.value.monthlyCostUsdMax
  if (max !== null && max !== undefined) {
    return t('dossier.cost.range', { min, max })
  }
  return t('dossier.cost.single', { min })
})

// --- Time-at-shelter computed at render ---
const daysAtShelter = computed(() => {
  if (!animal.value?.shelterEntryDate) return 0
  const ms = Date.now() - new Date(animal.value.shelterEntryDate).getTime()
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)))
})

// Pluralized "{n} día | {n} días" via the composable's count-aware overload.
// vue-i18n picks the singular form when count === 1 and the plural otherwise.
const timeAtShelterCopy = computed(() =>
  t('dossier.timeAtShelter.days', { n: daysAtShelter.value }, daysAtShelter.value),
)

// Click handler shim — UButton's typed `onClick` expects `(e: MouseEvent) => void`;
// `onApply` returns a navigation promise, so wrap to drop the event arg and
// swallow the return value at the boundary.
function handleApplyClick() {
  void onApply()
}

// --- Apply CTA handler ---
async function onApply() {
  if (!animal.value) return
  if (!authStore.isAuthenticated) {
    // Persist current ack state for rehydration after login (D-11).
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        STORAGE_KEY.value,
        ackChecked.value ? 'true' : 'false',
      )
    }
    return navigateTo(`/login?redirect=/animales/${route.params.id}`)
  }
  try {
    await $fetch(
      `/public/animals/${route.params.id}/acknowledge-dossier`,
      {
        method: 'POST',
        baseURL: config.public.apiUrl as string,
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
      },
    )
    return navigateTo(`/animales/${route.params.id}/aplicar`)
  } catch {
    // Surface non-blocking feedback via toast. Use the locked es-SV copy
    // (`dossier.apply.ackError`) so the user sees the same message verbatim
    // every time the POST fails.
    const toast = useToast()
    toast.add({
      title: t('dossier.apply.ackError'),
      color: 'error',
    })
  }
}
</script>
