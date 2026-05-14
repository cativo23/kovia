<!--
  StoriesStrip — Phase 15-07 landing stories cluster (parent); 15-08 fix.

  Renders up to 3 StoryCard children, one per story1/story2/story3 named
  grid area declared on pages/index.vue. Each child is wrapped in a
  Motion component (capital M — auto-imported by the `motion-v/nuxt`
  module) with `whileInView` and a per-index delay for the 80 ms stagger
  per UI-SPEC §Motion line 377. The Motion wrapper carries one of three
  statically-spelled Tailwind arbitrary classes
  `[grid-area:story1|story2|story3]` so it becomes a direct grid child
  of `.bento-grid` — StoryCard stays simple (no grid awareness).

  15-08 fix: previously used `motion.div` (lowercase dot-notation) with
  an inline `:style="{ gridArea: \`story${i+1}\` }"`. Two issues:
    1. `motion.div` is not template-resolvable — the Nuxt module only
       auto-imports CAPITAL-CASE components. The element rendered as
       an empty comment (Vue "Failed to resolve component" warning),
       breaking the bento layout.
    2. Dynamic Tailwind class strings (`\`[grid-area:story${i+1}]\``) are
       silently dropped by Tailwind v4's JIT. The inline-style fallback
       worked structurally but bound the grid placement to a JS-side
       application by Motion's `onVnodeUpdated`, applying ONLY after
       hydration — causing layout collapse during initial paint.
  Fix: STATIC class list `[grid-area:story1]` / `[grid-area:story2]` /
  `[grid-area:story3]` (all three strings appear verbatim in the source
  so Tailwind JIT detects them) + Motion (capital) so the component
  actually resolves. See 15-08-SUMMARY §Regression Diagnosis.

  When stories is empty the parent renders nothing (Day-1 zero-state per
  CONTEXT D-13 — index.vue also hides the strip until 15-08 seeds rows).
-->
<template>
  <template v-if="stories.length > 0">
    <Motion
      v-for="(story, i) in displayedStories"
      :key="story.id"
      data-testid="bento-stories"
      :class="STORY_AREA_CLASSES[i]"
      :initial="{ opacity: 0, y: 16 }"
      :while-in-view="{ opacity: 1, y: 0 }"
      :viewport="{ once: true }"
      :transition="{ type: 'spring', stiffness: 100, damping: 18, delay: 0.32 + i * 0.08 }"
    >
      <StoryCard :story="story" />
    </Motion>
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

// Each class string MUST appear verbatim in the SFC source so Tailwind v4's
// JIT compiler emits its arbitrary-value CSS rule at build time. Dynamic
// construction (`[grid-area:story${i+1}]`) would be silently dropped — see
// 15-07 SUMMARY deviation §3.
const STORY_AREA_CLASSES = [
  '[grid-area:story1]',
  '[grid-area:story2]',
  '[grid-area:story3]',
] as const

// Cap at 3 — bento has exactly 3 story-N areas declared per UI-SPEC.
const displayedStories = computed(() => props.stories.slice(0, 3))
</script>
