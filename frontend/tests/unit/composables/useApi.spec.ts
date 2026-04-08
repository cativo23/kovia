import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the useApi composable logic directly
// Since it wraps $api from useNuxtApp, we mock that

const mockApi = vi.fn()

vi.stubGlobal('useNuxtApp', () => ({
  $api: mockApi,
}))

// We need to import after mocks are set up
import { useApi } from '~/composables/useApi'

describe('useApi composable', () => {
  beforeEach(() => {
    mockApi.mockReset()
  })

  it('get: calls $api with GET method', async () => {
    mockApi.mockResolvedValueOnce({ data: 'test' })

    const { get } = useApi()
    const result = await get<{ data: string }>('/test')

    expect(mockApi).toHaveBeenCalledWith('/test', expect.objectContaining({
      method: 'GET',
    }))
    expect(result).toEqual({ data: 'test' })
  })

  it('post: calls $api with POST method and body', async () => {
    mockApi.mockResolvedValueOnce({ id: '1' })

    const { post } = useApi()
    const result = await post<{ id: string }>('/test', { name: 'test' })

    expect(mockApi).toHaveBeenCalledWith('/test', expect.objectContaining({
      method: 'POST',
      body: { name: 'test' },
    }))
    expect(result).toEqual({ id: '1' })
  })

  it('put: calls $api with PUT method and body', async () => {
    mockApi.mockResolvedValueOnce({ updated: true })

    const { put } = useApi()
    await put('/test/1', { name: 'updated' })

    expect(mockApi).toHaveBeenCalledWith('/test/1', expect.objectContaining({
      method: 'PUT',
      body: { name: 'updated' },
    }))
  })

  it('del: calls $api with DELETE method', async () => {
    mockApi.mockResolvedValueOnce({})

    const { del } = useApi()
    await del('/test/1')

    expect(mockApi).toHaveBeenCalledWith('/test/1', expect.objectContaining({
      method: 'DELETE',
    }))
  })

  it('propagates errors from $api', async () => {
    mockApi.mockRejectedValueOnce(new Error('Network error'))

    const { get } = useApi()
    await expect(get('/fail')).rejects.toThrow('Network error')
  })
})
