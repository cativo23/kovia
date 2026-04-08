export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const api = $fetch.create({
    baseURL: config.public.apiUrl as string,

    async onRequest({ options }) {
      const { useAuthStore } = await import('~/stores/auth')
      const authStore = useAuthStore()

      const token = authStore.accessToken
      if (token) {
        const headers = new Headers(options.headers as HeadersInit | undefined)
        headers.set('Authorization', `Bearer ${token}`)
        options.headers = headers
      }
    },

    async onResponseError({ request, options, response }) {
      // Only attempt refresh on 401, and only once (no retry loop)
      if (response.status === 401 && !(options as any)._retry) {
        const { useAuthStore } = await import('~/stores/auth')
        const authStore = useAuthStore()

        try {
          await authStore.refreshToken()

          // Retry the original request with the new token
          return await $fetch(request as string, {
            ...(options as any),
            baseURL: config.public.apiUrl as string,
            _retry: true,
            headers: {
              ...(options.headers as Record<string, string>),
              Authorization: `Bearer ${authStore.accessToken}`,
            },
          })
        }
        catch {
          authStore.$reset()
          await navigateTo('/login')
        }
      }
    },
  })

  return {
    provide: {
      api,
    },
  }
})
