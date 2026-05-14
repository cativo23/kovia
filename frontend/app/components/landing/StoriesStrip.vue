<!--
  StoriesStrip — Phase 15-07 landing stories cluster (parent).

  Renders up to 3 StoryCard children, one per story1/story2/story3 named
  grid area declared on pages/index.vue. The parent itself does NOT have
  its own grid-area — each child positions itself into its named area via
  the `grid-area` prop forwarded to StoryCard. This keeps the bento
  layout flat (no nested grid context) per UI-SPEC §Bento Layout.

  When stories is empty the parent renders nothing (Day-1 zero-state
  per CONTEXT D-13 — page hides the strip until 15-08 seeds the rows).
-->
<template>
  <template v-if="stories.length > 0">
    <StoryCard
      v-for="(story, i) in stories"
      :key="story.id"
      :story="story"
      :grid-area="`story${i + 1}`"
    />
  </template>
</template>

<script setup lang="ts">
import StoryCard from './StoryCard.vue'

interface AdoptionStoryPublic {
  id: string
  adopterFirstName: string
  city: string
  testimonial: string
  photoUrl: string | null
  publishedAt: string
}

defineProps<{
  stories: AdoptionStoryPublic[]
}>()
</script>
