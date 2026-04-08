<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
    <div class="mb-8">
      <NuxtLink to="/" class="text-3xl font-bold text-primary">
        Kovia
      </NuxtLink>
    </div>

    <div class="w-full max-w-md">
      <slot />
    </div>

    <footer class="mt-12 text-sm text-gray-500 dark:text-gray-400">
      &copy; {{ new Date().getFullYear() }} Kovia
    </footer>
  </div>
</template>
