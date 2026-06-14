<script setup lang="ts">
/**
 * KMascot — Kovia brand mascot (DESIGN-04, Plan 14-06).
 *
 * Single-component variant strategy (D-11): one SFC, four variants
 * (hero | empty-state | loading | status), with status sub-variants for
 * pending / approved / rejected.
 *
 * Idle animations (ear-flick, tail-wag, blush-pulse) are pure CSS
 * keyframes (D-12). NO JS scheduler — zero JS timer APIs used. The
 * 8-second cadence is achieved via the periodic-keyframe trick
 * (RESEARCH Pattern 9): the animation is mostly at the resting state
 * and "wags" briefly near the end of the loop.
 *
 * Visual touch-points: BARK sticker mascots, Petfolk clinical-warm.
 */
type MascotVariant = 'hero' | 'empty-state' | 'loading' | 'status'
type MascotStatus = 'pending' | 'approved' | 'rejected'

withDefaults(
  defineProps<{
    variant: MascotVariant
    status?: MascotStatus
    size?: number
    ariaLabel?: string
  }>(),
  {
    status: 'pending',
    size: 200,
    ariaLabel: 'Mascota Kovia',
  },
)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 200 200"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    :aria-label="ariaLabel"
    class="k-mascot"
    :data-variant="variant"
    :data-status="variant === 'status' ? status : undefined"
  >
    <!-- Shared base: body + head -->
    <g class="mascot-base">
      <!-- Body -->
      <ellipse cx="100" cy="135" rx="48" ry="42" fill="var(--color-terracota-500, #c97c5d)" />
      <!-- Head -->
      <circle cx="100" cy="85" r="42" fill="var(--color-terracota-400, #d99478)" />
      <!-- Ears -->
      <ellipse class="mascot-ear-left" cx="72" cy="58" rx="11" ry="18" fill="var(--color-terracota-600, #a85d40)" />
      <ellipse class="mascot-ear-right" cx="128" cy="58" rx="11" ry="18" fill="var(--color-terracota-600, #a85d40)" />
      <!-- Snout -->
      <ellipse cx="100" cy="98" rx="14" ry="10" fill="var(--color-cream-200, #f5e6d3)" />
      <!-- Nose -->
      <ellipse cx="100" cy="92" rx="4" ry="3" fill="var(--color-marron-900, #1a0f06)" />
      <!-- Eyes -->
      <circle cx="86" cy="80" r="3.5" fill="var(--color-marron-900, #1a0f06)" />
      <circle cx="114" cy="80" r="3.5" fill="var(--color-marron-900, #1a0f06)" />
      <!-- Blush -->
      <circle class="mascot-blush" cx="78" cy="92" r="4" fill="rgba(220, 100, 80, 0.4)" />
      <circle class="mascot-blush" cx="122" cy="92" r="4" fill="rgba(220, 100, 80, 0.4)" />
      <!-- Tail -->
      <path
        class="mascot-tail"
        d="M 148 130 Q 168 110 162 90"
        stroke="var(--color-terracota-600, #a85d40)"
        stroke-width="8"
        stroke-linecap="round"
        fill="none"
      />
    </g>

    <!-- Variant: hero — adds a friendly raised paw waving -->
    <g v-if="variant === 'hero'" class="mascot-hero">
      <ellipse cx="60" cy="125" rx="9" ry="14" fill="var(--color-terracota-600, #a85d40)" />
      <circle cx="60" cy="115" r="6" fill="var(--color-cream-200, #f5e6d3)" />
      <text x="100" y="195" text-anchor="middle" font-size="10" fill="var(--color-marron-700, #3a2515)">
        ¡Hola!
      </text>
    </g>

    <!-- Variant: empty-state — looking around, slight tilt cues -->
    <g v-else-if="variant === 'empty-state'" class="mascot-empty">
      <!-- Question mark above head -->
      <text x="100" y="35" text-anchor="middle" font-size="22" fill="var(--color-terracota-500, #c97c5d)">
        ?
      </text>
      <!-- Sitting paws -->
      <ellipse cx="78" cy="170" rx="10" ry="6" fill="var(--color-terracota-600, #a85d40)" />
      <ellipse cx="122" cy="170" rx="10" ry="6" fill="var(--color-terracota-600, #a85d40)" />
    </g>

    <!-- Variant: loading — three bouncing dots -->
    <g v-else-if="variant === 'loading'" class="mascot-loading">
      <circle cx="80" cy="180" r="4" fill="var(--color-terracota-500, #c97c5d)" />
      <circle cx="100" cy="180" r="4" fill="var(--color-terracota-500, #c97c5d)" />
      <circle cx="120" cy="180" r="4" fill="var(--color-terracota-500, #c97c5d)" />
    </g>

    <!-- Variant: status — sub-variant content -->
    <g v-else-if="variant === 'status'" class="mascot-status">
      <!-- pending: clock badge -->
      <g v-if="status === 'pending'" data-status="pending">
        <circle cx="150" cy="150" r="18" fill="var(--color-amber-500, #f5a524)" />
        <path d="M 150 140 L 150 150 L 158 154" stroke="white" stroke-width="3" stroke-linecap="round" fill="none" />
      </g>
      <!-- approved: check badge -->
      <g v-else-if="status === 'approved'" data-status="approved">
        <circle cx="150" cy="150" r="18" fill="var(--color-success-500, #4ade80)" />
        <path
          d="M 142 150 L 148 156 L 158 144"
          stroke="white"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />
      </g>
      <!-- rejected: x badge -->
      <g v-else-if="status === 'rejected'" data-status="rejected">
        <circle cx="150" cy="150" r="18" fill="var(--color-danger-500, #ef4444)" />
        <path d="M 143 143 L 157 157 M 157 143 L 143 157" stroke="white" stroke-width="3" stroke-linecap="round" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.k-mascot {
  display: inline-block;
  vertical-align: middle;
}

@media (prefers-reduced-motion: no-preference) {
  /*
   * Periodic-keyframe trick (RESEARCH Pattern 9, D-12): the animation
   * spends 96% of its run at rest, then wags briefly. With infinite
   * iteration this yields ~one wag every 8s — no JS scheduler required.
   */
  @keyframes ear-flick-periodic {
    0%,
    96%,
    100% {
      transform: rotate(0deg);
    }
    97% {
      transform: rotate(-8deg);
    }
    98% {
      transform: rotate(0deg);
    }
    99% {
      transform: rotate(-6deg);
    }
  }

  @keyframes tail-wag-periodic {
    0%,
    94%,
    100% {
      transform: rotate(0deg);
    }
    95% {
      transform: rotate(15deg);
    }
    97% {
      transform: rotate(-10deg);
    }
    99% {
      transform: rotate(8deg);
    }
  }

  @keyframes blush-pulse-periodic {
    0%,
    90%,
    100% {
      opacity: 0.4;
      transform: scale(1);
    }
    95% {
      opacity: 0.7;
      transform: scale(1.15);
    }
  }

  .mascot-ear-left {
    animation: ear-flick-periodic 8s ease-in-out infinite;
    transform-origin: 72px 76px;
  }

  .mascot-ear-right {
    animation: ear-flick-periodic 8s ease-in-out infinite;
    animation-delay: 0.15s;
    transform-origin: 128px 76px;
  }

  .mascot-tail {
    animation: tail-wag-periodic 8s ease-in-out infinite;
    animation-delay: 1s;
    transform-origin: 148px 130px;
  }

  .mascot-blush {
    animation: blush-pulse-periodic 10s ease-in-out infinite;
    transform-origin: center;
  }
}
</style>
