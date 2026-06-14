<!--
  /verificacion — Phase 15-07 static methodology page (D-14).

  Renders Kovia's "Cómo verificamos a los refugios" methodology body
  from a static es-SV string set (split into multiple paragraphs so we
  rely on auto-escaped Vue interpolation only per T-15-03 mitigation).
  NO data fetches, NO dynamic content — this is pure content rendered
  from i18n keys per CONTEXT D-14.

  Linked from BentoStatsBlock and VerifiedRescuesBlock via the
  `landing.stats.methodologyLink` text.
-->
<template>
  <article class="verificacion-page max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
    <h1 class="text-3xl sm:text-4xl font-bold font-display leading-tight">
      {{ $t('verificacion.title') }}
    </h1>

    <p class="text-base text-[var(--color-text)]/80 leading-relaxed">
      {{ $t('verificacion.body.intro') }}
    </p>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">{{ $t('verificacion.body.section1Heading') }}</h2>
      <p class="text-base text-[var(--color-text)]/80 leading-relaxed">
        {{ $t('verificacion.body.section1Body') }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">{{ $t('verificacion.body.section2Heading') }}</h2>
      <p class="text-base text-[var(--color-text)]/80 leading-relaxed">
        {{ $t('verificacion.body.section2Body') }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">{{ $t('verificacion.body.section3Heading') }}</h2>
      <p class="text-base text-[var(--color-text)]/80 leading-relaxed">
        {{ $t('verificacion.body.section3Body') }}
      </p>
    </section>

    <p class="text-base text-[var(--color-text)]/80 leading-relaxed">
      {{ $t('verificacion.body.outro') }}
    </p>
  </article>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

useHead({ title: 'Cómo verificamos a los refugios — Kovia' })
</script>
