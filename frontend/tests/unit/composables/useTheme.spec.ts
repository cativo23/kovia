import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

/**
 * Phase 14-02 / DESIGN-01 — useTheme + ThemeToggle behavior.
 *
 * The composable under test is `useColorMode()` from @nuxtjs/color-mode
 * (auto-registered by Nuxt UI v4). We can't pull the real Nuxt runtime
 * into vitest, so we simulate `useColorMode` with a reactive shim and
 * assert that ThemeToggle:
 *   - reads `colorMode.value` to decide which icon/aria to render,
 *   - writes `colorMode.preference = 'dark' | 'light'` on click,
 *   - exposes the i18n keys `common.theme.light` / `common.theme.dark`
 *     as the aria-label (action that would happen on click).
 */

interface FakeColorMode {
  preference: string
  value: string
}

const colorMode = ref<FakeColorMode>({ preference: 'light', value: 'light' })

// `useColorMode` is auto-imported in Nuxt — stub it as a global.
vi.stubGlobal('useColorMode', () => colorMode.value)

// `useI18n` is already stubbed in tests/setup.ts to identity-return the key,
// but be explicit so the spec reads cleanly.
vi.stubGlobal('useI18n', () => ({
  t: (key: string) => key,
}))

// Stub UButton so we can read the aria-label and trigger @click without UI runtime.
const UButton = {
  name: 'UButton',
  props: ['variant', 'color', 'ariaLabel'],
  emits: ['click'],
  template: '<button :aria-label="ariaLabel" @click="$emit(\'click\')"><slot /></button>',
}

// Stub ClientOnly to render eagerly in tests.
const ClientOnly = {
  name: 'ClientOnly',
  template: '<div><slot /></div>',
}

import ThemeToggle from '~/components/ThemeToggle.vue'

function mountToggle() {
  return mount(ThemeToggle, {
    global: { stubs: { UButton, ClientOnly } },
  })
}

describe('ThemeToggle (DESIGN-01)', () => {
  beforeEach(() => {
    colorMode.value = { preference: 'light', value: 'light' }
  })

  it('renders an aria-labelled button', () => {
    const wrapper = mountToggle()
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('aria-label')).toBeTruthy()
  })

  it('aria-label uses common.theme.dark when current mode is light (action = switch to dark)', () => {
    colorMode.value = { preference: 'light', value: 'light' }
    const wrapper = mountToggle()
    expect(wrapper.find('button').attributes('aria-label')).toBe('common.theme.dark')
  })

  it('aria-label uses common.theme.light when current mode is dark (action = switch to light)', () => {
    colorMode.value = { preference: 'dark', value: 'dark' }
    const wrapper = mountToggle()
    expect(wrapper.find('button').attributes('aria-label')).toBe('common.theme.light')
  })

  it('clicking from light flips colorMode.preference to dark', async () => {
    colorMode.value = { preference: 'light', value: 'light' }
    const wrapper = mountToggle()
    await wrapper.find('button').trigger('click')
    expect(colorMode.value.preference).toBe('dark')
  })

  it('clicking from dark flips colorMode.preference to light', async () => {
    colorMode.value = { preference: 'dark', value: 'dark' }
    const wrapper = mountToggle()
    await wrapper.find('button').trigger('click')
    expect(colorMode.value.preference).toBe('light')
  })
})

describe('ThemeToggle integration into layouts', () => {
  const layouts = ['default', 'auth', 'admin', 'org'] as const

  it.each(layouts)('layout %s mounts <ThemeToggle />', (name) => {
    const path = resolve(__dirname, `../../../app/layouts/${name}.vue`)
    const src = readFileSync(path, 'utf8')
    expect(src).toMatch(/<ThemeToggle/)
  })

  /**
   * Walks frontend/app recursively without spawning a subprocess.
   * Returns every .vue file path that contains a `dark:` Tailwind variant.
   */
  function findVueFilesWithDarkVariant(rootDir: string): string[] {
    const matches: string[] = []
    const stack: string[] = [rootDir]
    while (stack.length > 0) {
      const dir = stack.pop()!
      let entries: string[]
      try {
        entries = readdirSync(dir)
      }
      catch {
        continue
      }
      for (const entry of entries) {
        const full = join(dir, entry)
        let stat
        try {
          stat = statSync(full)
        }
        catch {
          continue
        }
        if (stat.isDirectory()) {
          stack.push(full)
        }
        else if (stat.isFile() && full.endsWith('.vue')) {
          const src = readFileSync(full, 'utf8')
          if (src.includes('dark:')) matches.push(full)
        }
      }
    }
    return matches
  }

  it('no .vue file under frontend/app contains a Tailwind dark: variant', () => {
    const root = resolve(__dirname, '../../../app')
    const offenders = findVueFilesWithDarkVariant(root)
    expect(offenders).toEqual([])
  })
})

describe('i18n theme keys', () => {
  const path = resolve(__dirname, '../../../i18n/locales/es-SV.json')
  const json = JSON.parse(readFileSync(path, 'utf8'))

  it('declares common.theme.light = "Modo claro"', () => {
    expect(json.common.theme.light).toBe('Modo claro')
  })

  it('declares common.theme.dark = "Modo oscuro"', () => {
    expect(json.common.theme.dark).toBe('Modo oscuro')
  })
})
