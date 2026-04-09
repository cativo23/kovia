import type { $Fetch, FetchOptions } from 'ofetch'

export function useApi() {
  const { $api } = useNuxtApp()
  const api = $api as $Fetch

  async function get<T>(url: string, options?: FetchOptions) {
    return api<T>(url, { ...options, method: 'GET' })
  }

  async function post<T>(url: string, body?: unknown, options?: FetchOptions) {
    return api<T>(url, { ...options, method: 'POST', body })
  }

  async function put<T>(url: string, body?: unknown, options?: FetchOptions) {
    return api<T>(url, { ...options, method: 'PUT', body })
  }

  async function patch<T>(url: string, body?: unknown, options?: FetchOptions) {
    return api<T>(url, { ...options, method: 'PATCH', body })
  }

  async function del<T>(url: string, options?: FetchOptions) {
    return api<T>(url, { ...options, method: 'DELETE' })
  }

  return {
    get,
    post,
    put,
    patch,
    del,
    api,
  }
}
