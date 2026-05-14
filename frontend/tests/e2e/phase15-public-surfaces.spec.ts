import { test, expect } from '@playwright/test';

/**
 * Phase 15 Public Surfaces — e2e smoke (Plan 15-08).
 *
 * Tag `@phase15` allows targeted runs via `playwright test --grep @phase15`.
 * The 5 tests map 1:1 to the ROADMAP Phase 15 success criteria:
 *   1. Day-1 bento landing renders all cells with no console errors (criterion 1).
 *   2. Day-1 marquee hidden when zero finalized adoptions (D-15 + criterion 1).
 *   3. Animal listing shows categorical guidance pills, never leaks numeric score
 *      (criterion 2, PUBLIC-03).
 *   4. Dossier page for MEDICO_CRONICO category shows verbatim LOCKED PUBLIC-06 copy
 *      (criterion 3, PUBLIC-06).
 *   5. Aplicar CTA is ack-gated: aria-disabled=true until the ack checkbox is ticked
 *      (criterion 4 + 5, PUBLIC-04 + PUBLIC-05).
 *
 * Tests 3 + 5 require at least one seeded animal with dossierComplete=true. The
 * 15-08 launch-checklist script supports `--seed-test-fixture` to flip one seed
 * animal to a fully-filled dossier (`adoptionCategory=MEDICO_CRONICO` for test 4).
 * Both tests probe the public API first and `test.skip` when no complete-dossier
 * animal is present, documenting the expected operational dependency.
 */

const API_URL = process.env.API_URL || 'http://api:3000';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

interface PublicAnimalListItem {
  id: string;
  name: string;
  guidance?: { color: string; label: string; copy?: string };
}

interface PublicAnimalDetail extends PublicAnimalListItem {
  behavioralEvaluation: string;
  medicalHistory: string;
}

async function fetchCompleteDossierAnimal(
  category?: string,
): Promise<PublicAnimalListItem | null> {
  try {
    const res = await fetch(`${API_URL}/public/animals?limit=50`);
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: PublicAnimalListItem[] };
    const list = json.data ?? [];
    if (!list.length) return null;
    if (!category) return list[0] ?? null;
    // Probe detail to filter by category — guidance.color carries the mapping.
    for (const a of list) {
      const detailRes = await fetch(`${API_URL}/public/animals/${a.id}`);
      if (!detailRes.ok) continue;
      const detail = (await detailRes.json()) as PublicAnimalDetail;
      // MEDICO_CRONICO maps to rojo per D-02.
      if (category === 'MEDICO_CRONICO' && detail.guidance?.color === 'rojo') {
        return detail;
      }
    }
    return null;
  } catch {
    return null;
  }
}

test.describe('Phase 15 public surfaces @phase15', () => {
  test('landing bento renders all cells with no console errors @phase15 @phase15-landing', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Hero + stats always render (no zero-state hide on Day-1).
    await expect(page.locator('[data-testid="bento-hero"]')).toBeVisible();
    await expect(page.locator('[data-testid="bento-stats"]')).toBeVisible();

    // Verified, stories, marquee are server-conditional. We assert visibility
    // when present, count===0 when zero-state (the cell hides via v-if).
    const verifiedCount = await page
      .locator('[data-testid="bento-verified"]')
      .count();
    if (verifiedCount > 0) {
      await expect(
        page.locator('[data-testid="bento-verified"]').first(),
      ).toBeVisible();
    }
    const storiesCount = await page
      .locator('[data-testid="bento-stories"]')
      .count();
    if (storiesCount > 0) {
      await expect(
        page.locator('[data-testid="bento-stories"]').first(),
      ).toBeVisible();
    }

    // Filter known stubs / environmental errors from the console-error assertion:
    // - `/seed/stories/story-N.jpg` 404 (or generic "Failed to load resource"
    //   text where the URL was elided by the browser) — 15-01 SUMMARY
    //   §Known Stubs documents the 3 AdoptionStory placeholder URLs whose
    //   JPGs are pending upload at launch.
    // - "Hydration completed but contains mismatches" — pre-existing motion-v
    //   SSR/CSR diff (motion.div components render server-empty then mount
    //   client-side). 15-07 SUMMARY §Deferred Issues already tracks this.
    //   Not introduced or made worse by 15-08.
    const knownNoise = [
      /seed\/stories\/story-\d+\.jpg/,
      /Failed to load resource.*\b404\b/i,
      /Hydration completed but contains mismatches/i,
    ];
    const realErrors = errors.filter(
      (e) => !knownNoise.some((rx) => rx.test(e)),
    );
    expect(realErrors).toEqual([]);
  });

  test('Day-1 marquee is hidden when zero finalized adoptions @phase15 @phase15-landing', async ({
    page,
  }) => {
    // Day-1 baseline: no AdoptionApplication with status=ADOPTADA, so the
    // backend returns marqueeAdopters: [] and AdopterMarquee renders nothing
    // (v-if guard per D-15).
    // The test reads /public/landing-stats first to skip cleanly if a future
    // dev DB has gained an ADOPTADA application out-of-band.
    const statsRes = await fetch(`${API_URL}/public/landing-stats`);
    test.skip(
      !statsRes.ok,
      'public/landing-stats unreachable from playwright network namespace',
    );
    const stats = (await statsRes.json()) as { marqueeAdopters?: unknown[] };
    test.skip(
      Array.isArray(stats.marqueeAdopters) && stats.marqueeAdopters.length > 0,
      'marqueeAdopters non-empty — Day-1 zero-state precondition violated; rerun against a clean seed',
    );

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="bento-marquee"]')).toHaveCount(0);
  });

  test('animal listing shows guidance pills and never leaks score @phase15 @phase15-listing', async ({
    page,
  }) => {
    const seeded = await fetchCompleteDossierAnimal();
    test.skip(
      !seeded,
      'no complete-dossier animal present — run `docker compose exec api npx tsx backend/scripts/launch-checklist-phase15.ts --seed-test-fixture` first',
    );

    await page.goto('/animales');
    await page.waitForLoadState('networkidle');

    const pill = page.locator('[data-testid="guidance-pill"]').first();
    await expect(pill).toBeVisible();
    const color = await pill.getAttribute('data-guidance-color');
    expect(['verde', 'ambar', 'rojo']).toContain(color);

    // PUBLIC-03: no numeric `score` field can appear in the inlined SSR data
    // or rendered DOM. Match the JSON-shaped pattern so the substring "score"
    // appearing in unrelated css class/asset names (e.g. "discover") doesn't
    // false-positive.
    const content = await page.content();
    expect(content.toLowerCase()).not.toMatch(/"score"\s*:/);
  });

  test('dossier page for MEDICO_CRONICO shows LOCKED PUBLIC-06 copy verbatim @phase15 @phase15-dossier', async ({
    page,
  }) => {
    const seeded = await fetchCompleteDossierAnimal('MEDICO_CRONICO');
    test.skip(
      !seeded,
      'no MEDICO_CRONICO complete-dossier animal present — run launch-checklist with --seed-test-fixture',
    );

    await page.goto(`/animales/${seeded!.id}`);
    await page.waitForLoadState('networkidle');

    // LOCKED PUBLIC-06 — must match the exact server constant + i18n value
    // (T-15-05 boundary spec on backend already proves byte equality).
    const lockedCopy =
      'Animal con condición médica activa. Conocé los detalles y costos antes de aplicar';
    await expect(
      page.locator(`text=${lockedCopy}`).first(),
    ).toBeVisible();
  });

  test('Aplicar is aria-disabled until the ack checkbox is checked @phase15 @phase15-dossier', async ({
    page,
  }) => {
    const seeded = await fetchCompleteDossierAnimal();
    test.skip(
      !seeded,
      'no complete-dossier animal present — run launch-checklist with --seed-test-fixture',
    );

    await page.goto(`/animales/${seeded!.id}`);
    await page.waitForLoadState('networkidle');

    const cta = page.locator('[data-testid="apply-cta"]');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('aria-disabled', 'true');

    // Click the underlying input inside the ack checkbox wrapper. UCheckbox
    // renders the visible click target on either a label-wrapped input or the
    // checkbox itself; clicking the wrapper is the most robust target.
    await page
      .locator('[data-testid="dossier-ack-checkbox"]')
      .first()
      .click();

    // After tick, the CTA aria-disabled attribute flips to 'false'.
    await expect(cta).toHaveAttribute('aria-disabled', 'false');
  });
});
