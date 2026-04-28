import { test, expect } from '@playwright/test'

/**
 * RED: Wave 0 E2E stubs for Phase 14 design system foundation.
 *
 * Tag `@phase14` lets later waves filter execution via
 * `npx playwright test --grep @phase14`. All four tests MUST fail today —
 * the routes, theme toggle, KIcon component, and KSpringCard demo land in
 * Plans 02–07.
 *
 * Coverage map:
 *   - DESIGN-01 dark-mode toggle + localStorage persistence (Plan 02)
 *   - DESIGN-02 Inter body font on every page (Plan 03; rendered on `/`)
 *   - DESIGN-03 hand-authored 63-icon set (Plans 04/05; demo route Plan 07)
 *   - DESIGN-05 motion primitive without console errors (Plans 06/07)
 */
test.describe('Phase 14 design system @phase14', () => {
  test('toggles dark mode and persists to localStorage @phase14', async ({ page }) => {
    await page.goto('/')
    const toggle = page.getByRole('button', { name: /theme|tema/i })
    await toggle.click()
    const themeValue = await page.evaluate(() => localStorage.getItem('kovia-theme'))
    expect(themeValue).toBe('dark')
    const htmlClass = await page.evaluate(() => document.documentElement.className)
    expect(htmlClass).toContain('dark')
  })

  test('renders Inter as the body font on / @phase14', async ({ page }) => {
    await page.goto('/')
    const fontFamily = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    )
    expect(fontFamily).toMatch(/Inter/i)
  })

  test('renders 63 icon SVGs on the icon demo route @phase14', async ({ page }) => {
    await page.goto('/design-system/icons')
    const svgCount = await page.locator('[data-k-icon] svg').count()
    expect(svgCount).toBe(63)
  })

  test('loads /design-system/motion without console errors @phase14', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/design-system/motion')
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })
})
