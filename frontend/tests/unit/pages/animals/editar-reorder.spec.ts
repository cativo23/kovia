import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'

// Unit tests for the reorderExistingPhotos logic on the animal edit page.
// We extract and test the function's contract directly without mounting the page.

interface AnimalPhoto {
  id: string
  url: string
  key: string
  caption: string | null
  isCover: boolean
  position: number
}

function makeReorderExistingPhotos(
  animal: ReturnType<typeof ref<{ photos: AnimalPhoto[] } | null>>,
  patchFn: (url: string, body: any) => Promise<void>,
  toastAdd: (opts: any) => void,
  animalId: string,
) {
  return async function reorderExistingPhotos(photoIds: string[]) {
    if (!animal.value) return

    const previousPhotos = [...animal.value.photos]

    const byId = new Map(previousPhotos.map(p => [p.id, p]))
    const reordered: AnimalPhoto[] = []
    for (const id of photoIds) {
      const photo = byId.get(id)
      if (photo) {
        reordered.push({ ...photo, position: reordered.length })
        byId.delete(id)
      }
    }
    for (const leftover of previousPhotos) {
      if (byId.has(leftover.id)) {
        reordered.push({ ...leftover, position: reordered.length })
      }
    }

    animal.value.photos = reordered

    try {
      await patchFn(`/animals/${animalId}/photos/reorder`, { photoIds })
      toastAdd({ title: 'common.success', color: 'success' })
    } catch (err: any) {
      if (animal.value) {
        animal.value.photos = previousPhotos
      }
      toastAdd({ title: 'common.error', description: err?.data?.message || '', color: 'error' })
    }
  }
}

const basePhotos: AnimalPhoto[] = [
  { id: 'p-1', url: 'http://s3/p1.jpg', key: 'p1', caption: null, isCover: true, position: 0 },
  { id: 'p-2', url: 'http://s3/p2.jpg', key: 'p2', caption: null, isCover: false, position: 1 },
  { id: 'p-3', url: 'http://s3/p3.jpg', key: 'p3', caption: null, isCover: false, position: 2 },
]

describe('reorderExistingPhotos — edit page logic', () => {
  let animal: ReturnType<typeof ref<{ photos: AnimalPhoto[] } | null>>
  let patchFn: ReturnType<typeof vi.fn>
  let toastAdd: ReturnType<typeof vi.fn>
  let reorder: ReturnType<typeof makeReorderExistingPhotos>

  beforeEach(() => {
    animal = ref({ photos: basePhotos.map(p => ({ ...p })) })
    patchFn = vi.fn().mockResolvedValue(undefined)
    toastAdd = vi.fn()
    reorder = makeReorderExistingPhotos(animal, patchFn, toastAdd, 'a-1')
  })

  it('optimistically reorders animal.value.photos before awaiting PATCH', async () => {
    const patchOrder: string[] = []
    patchFn.mockImplementation(async (_url: string, body: { photoIds: string[] }) => {
      // Capture the local state at the moment patch is called
      patchOrder.push(...(animal.value?.photos.map(p => p.id) ?? []))
    })

    await reorder(['p-3', 'p-1', 'p-2'])

    // The state captured during the PATCH call should already be the new order
    expect(patchOrder).toEqual(['p-3', 'p-1', 'p-2'])
  })

  it('animal.value.photos ends in the NEW order after a successful PATCH', async () => {
    await reorder(['p-3', 'p-1', 'p-2'])

    const ids = animal.value!.photos.map(p => p.id)
    expect(ids).toEqual(['p-3', 'p-1', 'p-2'])
  })

  it('position fields are updated to reflect new indices', async () => {
    await reorder(['p-3', 'p-1', 'p-2'])

    const positions = animal.value!.photos.map(p => p.position)
    expect(positions).toEqual([0, 1, 2])
  })

  it('sends { photoIds } in the exact requested order to the backend', async () => {
    await reorder(['p-3', 'p-1', 'p-2'])

    expect(patchFn).toHaveBeenCalledWith('/animals/a-1/photos/reorder', { photoIds: ['p-3', 'p-1', 'p-2'] })
  })

  it('reverts animal.value.photos to the PREVIOUS order on PATCH failure', async () => {
    patchFn.mockRejectedValue({ data: { message: 'Server error' } })

    await reorder(['p-3', 'p-1', 'p-2'])

    const ids = animal.value!.photos.map(p => p.id)
    expect(ids).toEqual(['p-1', 'p-2', 'p-3'])
  })

  it('fires an error toast on PATCH failure', async () => {
    patchFn.mockRejectedValue({ data: { message: 'Oops' } })

    await reorder(['p-3', 'p-1', 'p-2'])

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
  })

  it('fires a success toast on PATCH success', async () => {
    await reorder(['p-3', 'p-1', 'p-2'])

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })
})
