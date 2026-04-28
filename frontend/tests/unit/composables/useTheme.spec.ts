import { describe, it, expect, beforeEach } from 'vitest'

/**
 * RED: Wave 0 stub for DESIGN-01 theme behavior.
 *
 * Plan 02 lands `useTheme()` (or wires `@nuxtjs/color-mode`'s `useColorMode()`)
 * with localStorage persistence under key `kovia-theme`. This spec MUST fail
 * today because the composable does not yet exist.
 */

// @ts-expect-error - composable does not exist until Plan 02 (RED gate)
import { useTheme } from '~/composables/useTheme'

describe('useTheme (DESIGN-01) [RED — Plan 02 turns GREEN]', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('exposes a toggleable theme state defaulting to light', () => {
    const theme = useTheme()
    expect(theme).toBeDefined()
    expect(theme.value).toBe('light')
  })

  it('persists toggled value to localStorage under "kovia-theme"', () => {
    const theme = useTheme()
    theme.toggle()
    expect(localStorage.getItem('kovia-theme')).toBe('dark')
  })

  it('adds .dark class to <html> when toggled to dark', () => {
    const theme = useTheme()
    theme.toggle()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
