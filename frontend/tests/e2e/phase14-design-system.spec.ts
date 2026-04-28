import { test, expect } from '@playwright/test'

/**
 * GREEN: Phase 14 design-system smoke (Plan 14-07).
 *
 * Tag `@phase14` allows targeted runs via `playwright test --grep @phase14`.
 * The suite gates the four phase exit criteria:
 *   - DESIGN-01 dark-mode toggle + localStorage persistence (Plan 02)
 *   - DESIGN-02 Inter body font on every page (Plan 03; rendered on `/`)
 *   - DESIGN-03 hand-authored 63-icon set surfaced on the demo route (Plans 04/05/07)
 *   - DESIGN-05 motion primitives without console errors (Plans 06/07)
 *
 * The demo-route tests require NUXT_PUBLIC_DESIGN_SYSTEM_ENABLED=true on the
 * webServer, otherwise the design-system middleware redirects to /.
 */
test.describe('Phase 14 design system @phase14', () => {
  test('toggles dark mode and persists to localStorage @phase14', async ({ page }) => {
    await page.goto('/')
    const toggle = page.getByRole('button', { name: /modo (claro|oscuro)|theme|tema/i })
    await toggle.click()
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    const themeValue = await page.evaluate(() => localStorage.getItem('kovia-theme'))
    expect(themeValue).toBe('dark')
    await toggle.click()
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
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
    const grid = page.locator('[data-testid="icon-grid"]')
    await expect(grid).toBeVisible()
    const svgs = grid.locator('svg')
    await expect(svgs).toHaveCount(63)
  })

  test('loads /design-system/motion with KSpringCard + KPawLoader and no console errors @phase14', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/design-system/motion')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.k-card').first()).toBeVisible()
    await expect(page.locator('.k-paw-loader').first()).toBeVisible()
    expect(errors).toEqual([])
  })
})
