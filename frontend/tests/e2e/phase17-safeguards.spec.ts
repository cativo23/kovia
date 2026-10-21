import { test, expect } from '@playwright/test';

/**
 * Phase 17 Compatibility Safeguards — e2e scaffold (Plan 17-00 Task 3).
 *
 * Tag `@phase17` allows targeted runs via `playwright test --grep @phase17`.
 *
 * ─── test.skip scaffolds ────────────────────────────────────────────────────
 * All tests below are test.skip in Wave 0. Each owning plan un-skips its block
 * when the implementation is ready:
 *   - Plan 06 Task 2 un-skips test (a): reflexión banner on IN_REFLECTION
 *   - Plan 07 Task 2 un-skips test (b): org application-detail surfacing
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Prerequisites — run before this suite:
 *   docker compose exec api npx tsx scripts/seed-phase17-fixtures.ts
 *
 * NOTE: The seeder requires Plan 01 (enum migration) + Plan 02 (schema migration)
 * to have run first. Run the seeder after Plans 01+02 are complete.
 *
 * Run command (after Plan 06/07 un-skip their blocks):
 *   docker compose exec api npx tsx scripts/seed-phase17-fixtures.ts && \
 *   docker compose exec web npx playwright test --grep @phase17 --reporter=line
 */

const API_URL = process.env.API_URL || 'http://api:3000';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Test fixture constants — must match seed-phase17-fixtures.ts
const IN_REFLECTION_ADOPTER_EMAIL = 'e2e-adopter-reflexion@phase17.test';
const FINALIZED_ADOPTER_EMAIL = 'e2e-adopter-finalized@phase17.test';
const ORG_STAFF_EMAIL = 'e2e-staff-phase17@phase17.test';
const TEST_PASSWORD = 'Password1234!';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface LoginResponse {
  access_token: string;
  user?: { id: string; firstName?: string };
}

async function apiLogin(email: string, password: string): Promise<LoginResponse | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    return (await res.json()) as LoginResponse;
  } catch {
    return null;
  }
}

async function setAuthToken(page: import('@playwright/test').Page, token: string): Promise<void> {
  // Navigate to base to establish origin context, then inject auth state.
  await page.goto(BASE_URL + '/');
  await page.evaluate((t) => {
    // Nuxt + Pinia — inject access token into the Pinia auth store.
    // Access token lives in memory (Pinia) not localStorage per Phase 01 security decision.
    // Set it on the store directly via the $nuxt or window.$pinia path.
    try {
      // Try window.__pinia first (set by Pinia plugin on app init).
      const pinia = (window as any).__pinia;
      if (pinia) {
        const authStore = pinia._s?.get('auth');
        if (authStore) {
          authStore.accessToken = t;
          return;
        }
      }
    } catch {
      // Fallback: set as sessionStorage so the auth plugin picks it up on reload.
    }
    sessionStorage.setItem('kovia_access_token_e2e', t);
  }, token);
}

// ---------------------------------------------------------------------------
// (a) Plan 06 — Reflexión banner on IN_REFLECTION application
//
// Test target: D-04 (sin-estigma withdrawal) + D-03 (48h unlock time display)
// Success criterion: the adopter's /perfil/aplicaciones/[id] page shows:
//   - a reflexión banner (VISIBLE, not just in DOM)
//   - the 48h unlock time rendered
//   - sin-estigma withdrawal copy ("retirar", "sin" estigma language)
// Assertions: toBeVisible() against rendered DOM elements, NOT file contents.
// ---------------------------------------------------------------------------

test.skip('[Plan 06] [SC-2] @phase17 reflexión banner is visible on IN_REFLECTION application', async ({ page }) => {
  // Step 1: Log in as the IN_REFLECTION adopter.
  const session = await apiLogin(IN_REFLECTION_ADOPTER_EMAIL, TEST_PASSWORD);
  if (!session) {
    throw new Error(`Login failed for ${IN_REFLECTION_ADOPTER_EMAIL} — run seed-phase17-fixtures.ts first (after Plans 01+02)`);
  }
  await setAuthToken(page, session.access_token);

  // Step 2: Navigate to Mis Aplicaciones list.
  await page.goto(`${BASE_URL}/perfil/aplicaciones`);
  await page.waitForLoadState('networkidle');

  // Step 3: Find the IN_REFLECTION application card and navigate to detail.
  // The card status badge should show the es-SV label for IN_REFLECTION
  // (e.g. "En reflexión" — exact label defined in i18n, Plan 01 adds it).
  const reflexionCard = page.getByRole('link', { name: /en reflexi/i }).first();
  await expect(reflexionCard).toBeVisible();
  await reflexionCard.click();
  await page.waitForLoadState('networkidle');

  // Step 4: Assert the reflexión banner is VISIBLE (Plan 06 renders it).
  // The banner contains:
  //   - The 48h unlock time (a date/time string)
  //   - Sin-estigma withdrawal copy ("retirar" + reassuring language)
  //   - A "Retirar mi solicitud" button/link (D-04 CTA)
  const reflexionBanner = page.getByTestId('reflexion-banner');
  await expect(reflexionBanner).toBeVisible();

  // Assert unlock time is rendered (a date/time element).
  const unlockTime = page.getByTestId('reflexion-unlock-time');
  await expect(unlockTime).toBeVisible();

  // Assert sin-estigma copy is present.
  await expect(page.getByText(/retirar/i)).toBeVisible();

  // Assert the 48h window has NOT elapsed (seeder sets approvedAt=24h ago → still within window).
  // The banner should NOT show a "ya puedes finalizar" / unlock confirmation.
  await expect(page.getByText(/sin.*estigma|cualquier.*momento|podés retirar/i)).toBeVisible();
});

// ---------------------------------------------------------------------------
// (b) Plan 07 — Org application-detail surfacing (encuentro + check-in responses)
//
// Test target: D-17 (minimal functional refugio surfacing on existing org page)
// Success criterion SC-4: check-in responses surface in the refugio dashboard
// within the same business day. Plan 07 adds the encuentro badge, foster
// status, and DAY_14 check-in responses to the existing org application-detail
// page.
// Assertions: toBeVisible() against rendered DOM, NOT file contents.
// ---------------------------------------------------------------------------

test.skip('[Plan 07] [SC-4] @phase17 org application-detail shows encuentro badge + DAY_14 check-in responses', async ({ page }) => {
  // Step 1: Log in as org staff.
  const session = await apiLogin(ORG_STAFF_EMAIL, TEST_PASSWORD);
  if (!session) {
    throw new Error(`Login failed for ${ORG_STAFF_EMAIL} — run seed-phase17-fixtures.ts first (after Plans 01+02)`);
  }
  await setAuthToken(page, session.access_token);

  // Step 2: Find the FINALIZED adopter's application via the API.
  const appsRes = await page.request.get(`${API_URL}/api/v1/applications`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const apps = await appsRes.json() as { data: Array<{ id: string; status: string; user?: { email: string } }> };
  const finalizedApp = (apps.data ?? []).find(
    (a) => a.status === 'FINALIZED' && a.user?.email === FINALIZED_ADOPTER_EMAIL,
  );
  if (!finalizedApp) {
    throw new Error(`FINALIZED application for ${FINALIZED_ADOPTER_EMAIL} not found — run seeder first`);
  }

  // Step 3: Navigate to the org application-detail page.
  await page.goto(`${BASE_URL}/org/aplicaciones/${finalizedApp.id}`);
  await page.waitForLoadState('networkidle');

  // Step 4: Assert ENCUENTRO badge/section is VISIBLE.
  // Plan 07 adds an encuentro status badge showing completed=true + recomendacion=PROCEED.
  const encuentroBadge = page.getByTestId('encuentro-badge');
  await expect(encuentroBadge).toBeVisible();
  // The recomendacion label in es-SV for PROCEED is "Proceder".
  await expect(page.getByText(/proceder/i)).toBeVisible();

  // Step 5: Assert foster status is shown (no FosterPeriod → "No aplica" or similar).
  // Plan 07 adds a foster status indicator.
  const fosterStatus = page.getByTestId('foster-status');
  await expect(fosterStatus).toBeVisible();

  // Step 6: Assert DAY_14 check-in responses are VISIBLE.
  // Plan 07 surfaces the PostAdoptionCheckIn responses on this page.
  const checkInSection = page.getByTestId('check-in-responses');
  await expect(checkInSection).toBeVisible();

  // Assert the DAY_14 label is visible.
  await expect(page.getByText(/14|day.?14|día.?14/i)).toBeVisible();

  // Assert at least one response is visible (adopter's answer from seeder).
  await expect(page.getByText(/adaptación|bien.*come.*duerme|saludable.*tranquilo/i)).toBeVisible();
});

// ---------------------------------------------------------------------------
// Additional @phase17 scaffold — IN_REFLECTION + FINALIZED seeder verification
// (non-visual: confirms seeder ran and produced the expected data)
// ---------------------------------------------------------------------------

test.skip('[Plan 00] @phase17 seeder verification: IN_REFLECTION application exists in API', async ({ page }) => {
  // Step 1: Log in as the IN_REFLECTION adopter.
  const session = await apiLogin(IN_REFLECTION_ADOPTER_EMAIL, TEST_PASSWORD);
  if (!session) {
    throw new Error(`Login failed for ${IN_REFLECTION_ADOPTER_EMAIL}`);
  }

  // Step 2: Check the adopter can see their IN_REFLECTION application.
  const res = await page.request.get(`${API_URL}/api/v1/applications/mine`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const body = await res.json() as { data: Array<{ status: string }> };
  const reflexionApp = (body.data ?? []).find((a) => a.status === 'IN_REFLECTION');

  // This will be VISIBLE once Plans 01+02 have migrated the enum and schema.
  // Until then, the test remains skipped (it.skip above).
  expect(reflexionApp).toBeDefined();
  expect(reflexionApp?.status).toBe('IN_REFLECTION');
});
