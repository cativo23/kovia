export function useApplicationDraft(animalId: string, userId: string) {
  const key = `aplicacion_draft_${animalId}_${userId}`

  function saveDraft(currentStep: number, data: Record<string, any>) {
    if (import.meta.server) return
    const existing = loadDraft() || { steps: {} as Record<string, any>, currentStep: 0, savedAt: 0 }
    existing.steps[`step${currentStep}`] = data
    existing.currentStep = currentStep
    existing.savedAt = Date.now()
    localStorage.setItem(key, JSON.stringify(existing))
  }

  function loadDraft(): { steps: Record<string, any>; currentStep: number; savedAt: number } | null {
    if (import.meta.server) return null
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  }

  function clearDraft() {
    if (import.meta.server) return
    localStorage.removeItem(key)
  }

  return { saveDraft, loadDraft, clearDraft }
}
