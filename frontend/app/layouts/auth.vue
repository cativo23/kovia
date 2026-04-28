<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-[--color-bg-secondary] text-[--color-text] px-4 relative">
    <!-- Theme toggle (top-right of the auth shell — auth users still must be able to toggle) -->
    <div class="absolute top-4 right-4">
      <ThemeToggle />
    </div>

    <div class="mb-8">
      <NuxtLink to="/" class="flex items-center gap-2 text-3xl font-bold text-primary">
        <KIcon name="paw-print" :size="32" class="text-primary" />
        Kovia
      </NuxtLink>
    </div>

    <div class="w-full max-w-md">
      <slot />
    </div>

    <footer class="mt-12 text-sm text-[--color-text-muted]">
      &copy; {{ new Date().getFullYear() }} Kovia
    </footer>
  </div>
</template>
