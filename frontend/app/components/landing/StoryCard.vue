<!--
  StoryCard — Phase 15-07 individual adoption-story cell.

  Renders one AdoptionStoryPublic row in a KSpringCard:
    - Photo at the top (paw-print KIcon fallback when photoUrl is null)
    - 3-line clamped testimonial
    - Attribution "{firstName}, {city}" via landing.stories.attribution key

  `gridArea` prop assigns this card to the named bento area (story1/story2/
  story3) so the parent StoriesStrip can position three children with
  area names declared in pages/index.vue's grid-template-areas.
-->
<template>
  <KSpringCard
    class="story-card rounded-[var(--radius-card,24px)] p-4"
    :style="gridArea ? { gridArea } : undefined"
  >
    <div
      v-if="story.photoUrl"
      class="story-card__photo w-full h-32 rounded-[var(--radius-card,24px)] overflow-hidden"
    >
      <img
        :src="story.photoUrl"
        alt=""
        class="w-full h-full object-cover"
      />
    </div>
    <div
      v-else
      class="story-card__photo-fallback h-32 w-full flex items-center justify-center bg-[var(--color-bg-secondary,#faf3e8)] rounded-[var(--radius-card,24px)]"
    >
      <KIcon name="paw-print" :size="48" class="text-[var(--color-text)]/40" aria-hidden="true" />
    </div>

    <p class="story-card__testimonial line-clamp-3 mt-3 text-sm text-[var(--color-text)]/90">
      {{ story.testimonial }}
    </p>

    <p class="story-card__attribution text-sm font-semibold mt-2">
      {{ $t('landing.stories.attribution', { firstName: story.adopterFirstName, city: story.city }) }}
    </p>
  </KSpringCard>
</template>

<script setup lang="ts">
interface AdoptionStoryPublic {
  id: string
  adopterFirstName: string
  city: string
  testimonial: string
  photoUrl: string | null
  publishedAt: string
}

defineProps<{
  story: AdoptionStoryPublic
  gridArea?: string
}>()
</script>
