<!--
  StoriesStrip — Phase 15-07 landing stories cluster (parent).

  Renders up to 3 StoryCard children, one per story1/story2/story3 named
  grid area declared on pages/index.vue. Each child is wrapped in a
  motion.div with `whileInView` and a per-index delay for the 80ms
  stagger per UI-SPEC §Motion line 377. The motion.div itself carries
  the named grid-area inline-style so it becomes the direct grid child
  of `.bento-grid` — StoryCard stays simple (no grid awareness).

  When stories is empty the parent renders nothing (Day-1 zero-state per
  CONTEXT D-13 — index.vue also hides the strip until 15-08 seeds rows).
-->
<template>
  <template v-if="stories.length > 0">
    <motion.div
      v-for="(story, i) in displayedStories"
      :key="story.id"
      :style="{ gridArea: `story${i + 1}` }"
      :initial="{ opacity: 0, y: 16 }"
      :while-in-view="{ opacity: 1, y: 0 }"
      :viewport="{ once: true }"
      :transition="{ type: 'spring', stiffness: 100, damping: 18, delay: 0.32 + i * 0.08 }"
    >
      <StoryCard :story="story" />
    </motion.div>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import StoryCard from './StoryCard.vue'

interface AdoptionStoryPublic {
  id: string
  adopterFirstName: string
  city: string
  testimonial: string
  photoUrl: string | null
  publishedAt: string
}

const props = defineProps<{
  stories: AdoptionStoryPublic[]
}>()

// Cap at 3 — bento has exactly 3 story-N areas declared per UI-SPEC.
const displayedStories = computed(() => props.stories.slice(0, 3))
</script>
