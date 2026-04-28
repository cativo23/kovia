import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Phase 14-02 / DESIGN-01 — token registry contract.
 *
 * Asserts the `main.css` declaration order, the presence of every required
 * 50–950 shade for terracota / verde-forestal / ambar / rojo, the raw brand
 * tokens, the radius scale, and the `.dark` override block sitting OUTSIDE
 * the `@theme` block (Pitfall 6).
 *
 * Acts as a fast TDD gate so we can iterate on the CSS contract without
 * spinning up `nuxi prepare` in Docker.
 */

const CSS_PATH = resolve(__dirname, '../../../app/assets/css/main.css')
const APP_CONFIG_PATH = resolve(__dirname, '../../../app/app.config.ts')
const NUXT_CONFIG_PATH = resolve(__dirname, '../../../nuxt.config.ts')

const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const
const PALETTE_COLORS = ['terracota', 'verde-forestal', 'ambar', 'rojo'] as const

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

describe('main.css token registry', () => {
  const css = read(CSS_PATH)

  it('imports tailwindcss and @nuxt/ui in the correct order', () => {
    const tailwindIdx = css.indexOf('@import "tailwindcss"')
    const nuxtUiIdx = css.indexOf('@import "@nuxt/ui"')
    expect(tailwindIdx).toBeGreaterThanOrEqual(0)
    expect(nuxtUiIdx).toBeGreaterThan(tailwindIdx)
  })

  it('declares @custom-variant dark AFTER both imports and BEFORE @theme (Pitfall 6)', () => {
    const nuxtUiIdx = css.indexOf('@import "@nuxt/ui"')
    const customVariantIdx = css.indexOf('@custom-variant dark')
    const themeIdx = css.indexOf('@theme')
    expect(customVariantIdx).toBeGreaterThan(nuxtUiIdx)
    expect(themeIdx).toBeGreaterThan(customVariantIdx)
  })

  it.each(PALETTE_COLORS)('declares all 11 shades for %s', (color) => {
    for (const shade of SHADES) {
      const re = new RegExp(`--color-${color}-${shade}\\s*:`)
      expect(css, `missing --color-${color}-${shade}`).toMatch(re)
    }
  })

  it('uses the documented brand anchor for terracota-500', () => {
    expect(css).toMatch(/--color-terracota-500\s*:\s*#[dD]97706/)
  })

  it('uses the documented brand anchor for verde-forestal-500', () => {
    expect(css).toMatch(/--color-verde-forestal-500\s*:\s*#16[aA]34[aA]/)
  })

  it('uses the documented brand anchor for ambar-500', () => {
    expect(css).toMatch(/--color-ambar-500\s*:\s*#[fF]59[eE]0[bB]/)
  })

  it('uses the documented brand anchor for rojo-500', () => {
    expect(css).toMatch(/--color-rojo-500\s*:\s*#[eE][fF]4444/)
  })

  it('declares raw single-value brand tokens (cream, coral-electrico, marron-profundo)', () => {
    expect(css).toMatch(/--color-cream\s*:\s*#[fF][eE][fF]3[eE]2/)
    expect(css).toMatch(/--color-coral-electrico\s*:\s*#[fF][fF]6[bB]47/)
    expect(css).toMatch(/--color-marron-profundo\s*:\s*#1[aA]0[fF]06/)
  })

  it('declares the 5 radius tokens', () => {
    expect(css).toMatch(/--radius-icon\s*:\s*14px/)
    expect(css).toMatch(/--radius-chip\s*:\s*18px/)
    expect(css).toMatch(/--radius-card\s*:\s*24px/)
    expect(css).toMatch(/--radius-card-lg\s*:\s*32px/)
    expect(css).toMatch(/--radius-pill\s*:\s*9999px/)
  })

  it('declares semantic aliases (bg, bg-secondary, text, border, accent)', () => {
    expect(css).toMatch(/--color-bg\s*:/)
    expect(css).toMatch(/--color-bg-secondary\s*:/)
    expect(css).toMatch(/--color-text\s*:/)
    expect(css).toMatch(/--color-border\s*:/)
    expect(css).toMatch(/--color-accent\s*:/)
  })

  it('places the .dark override block OUTSIDE the @theme block', () => {
    // Find the @theme block boundaries.
    const themeStart = css.indexOf('@theme')
    expect(themeStart).toBeGreaterThanOrEqual(0)
    const openBrace = css.indexOf('{', themeStart)
    let depth = 1
    let i = openBrace + 1
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') depth--
      i++
    }
    const themeEnd = i // position just after the closing brace of @theme
    const darkIdx = css.indexOf('.dark')
    expect(darkIdx).toBeGreaterThan(themeEnd - 1)
  })
})

describe('app.config.ts brand semantic remap', () => {
  const config = read(APP_CONFIG_PATH)

  it("maps primary to 'terracota' (replaces the legacy 'amber' binding)", () => {
    expect(config).toMatch(/primary\s*:\s*['"]terracota['"]/)
    expect(config).not.toMatch(/primary\s*:\s*['"]amber['"]/)
  })

  it("maps success to 'verde-forestal'", () => {
    expect(config).toMatch(/success\s*:\s*['"]verde-forestal['"]/)
  })

  it("maps warning to 'ambar'", () => {
    expect(config).toMatch(/warning\s*:\s*['"]ambar['"]/)
  })

  it("maps error to 'rojo'", () => {
    expect(config).toMatch(/error\s*:\s*['"]rojo['"]/)
  })
})

describe('nuxt.config.ts colorMode + viewTransition', () => {
  const config = read(NUXT_CONFIG_PATH)

  it("declares colorMode with storageKey 'kovia-theme'", () => {
    expect(config).toMatch(/storageKey\s*:\s*['"]kovia-theme['"]/)
  })

  it("declares colorMode preference 'system' and fallback 'light'", () => {
    expect(config).toMatch(/preference\s*:\s*['"]system['"]/)
    expect(config).toMatch(/fallback\s*:\s*['"]light['"]/)
  })

  it("declares colorMode classSuffix '' so the class is .dark (not .dark-mode)", () => {
    expect(config).toMatch(/classSuffix\s*:\s*['"]['"]/)
  })

  it('enables experimental.viewTransition', () => {
    expect(config).toMatch(/viewTransition\s*:\s*true/)
  })
})
