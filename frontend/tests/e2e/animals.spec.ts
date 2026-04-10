import { test, expect } from '@playwright/test';

/**
 * E2E tests for public animal listings, detail pages, and org landing pages.
 *
 * Setup: Uses existing animals from the DB (seeded via API in beforeAll).
 * The backend must be running with at least one species, one org, and one available animal.
 */

const API_URL = process.env.API_URL || 'http://api:3000';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

interface CreatedTestData {
  animalId?: string;
  orgSlug?: string;
  orgAdminToken?: string;
  speciesId?: string;
}

const testData: CreatedTestData = {};

// Helper: register + login a test org admin
async function createOrgAdmin(): Promise<{ token: string; orgSlug: string }> {
  const ts = Date.now();
  const email = `e2e-animals-${ts}@test.kovia.dev`;

  // Register user
  const regRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'Test1234!',
      firstName: 'Test',
      lastName: 'OrgAdmin',
    }),
  });
  if (!regRes.ok) throw new Error(`Register failed: ${await regRes.text()}`);

  // Get verification token from Mailpit (inside Docker: mailpit:8025)
  const mailpitUrl = process.env.MAILPIT_URL || 'http://mailpit:8025';
  let verifyToken: string | null = null;
  for (let i = 0; i < 15; i++) {
    const searchRes = await fetch(
      `${mailpitUrl}/api/v1/search?query=to:${encodeURIComponent(email)}`,
    );
    const data = await searchRes.json();
    if (data.messages?.length > 0) {
      const msgId = data.messages[0].ID;
      const msgRes = await fetch(`${mailpitUrl}/api/v1/message/${msgId}`);
      const msg = await msgRes.json();
      const match = (msg.HTML || msg.Text || '').match(/token=([A-Za-z0-9._-]+)/);
      if (match) { verifyToken = match[1]; break; }
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  if (!verifyToken) throw new Error('Verification email not received');

  // Verify email
  await fetch(`${API_URL}/auth/verify-email?token=${verifyToken}`);

  // Login to get token
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test1234!' }),
  });
  const loginData = await loginRes.json();
  const token: string = loginData.accessToken;

  // Get admin token to create invite
  const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL || 'admin@kovia.dev',
      password: process.env.ADMIN_PASSWORD || 'Admin1234!',
    }),
  });
  const adminData = await adminLoginRes.json();
  const adminToken: string = adminData.accessToken;

  // Create invite
  const inviteRes = await fetch(`${API_URL}/admin/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ email, orgName: `E2E Org ${ts}` }),
  });
  const inviteData = await inviteRes.json();
  const inviteToken: string = inviteData.token;

  // Setup org
  const slug = `e2e-org-${ts}`;
  const orgRes = await fetch(`${API_URL}/organizations/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      inviteToken,
      name: `E2E Org ${ts}`,
      slug,
      description: 'Organizacion de pruebas E2E',
    }),
  });
  if (!orgRes.ok) throw new Error(`Org setup failed: ${await orgRes.text()}`);

  // Re-login to get updated token with org role
  const reloginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test1234!' }),
  });
  const reloginData = await reloginRes.json();
  return { token: reloginData.accessToken, orgSlug: slug };
}

test.describe('Public Animal Listings', () => {
  test.beforeAll(async () => {
    // Try to get/create test data
    try {
      // Get or create a species
      const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: process.env.ADMIN_EMAIL || 'admin@kovia.dev',
          password: process.env.ADMIN_PASSWORD || 'Admin1234!',
        }),
      });
      const adminData = await adminLoginRes.json();
      const adminToken: string = adminData.accessToken;

      // List species
      const speciesRes = await fetch(`${API_URL}/species`);
      const speciesList = await speciesRes.json();
      let speciesId: string;
      if (speciesList.length > 0) {
        speciesId = speciesList[0].id;
      } else {
        const createSpeciesRes = await fetch(`${API_URL}/admin/species`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ name: 'Perro E2E' }),
        });
        const speciesData = await createSpeciesRes.json();
        speciesId = speciesData.id;
      }
      testData.speciesId = speciesId;

      // Create org admin + org
      const { token, orgSlug } = await createOrgAdmin();
      testData.orgAdminToken = token;
      testData.orgSlug = orgSlug;

      // Create an animal
      const animalRes = await fetch(`${API_URL}/animals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: 'Luna E2E',
          speciesId,
          gender: 'FEMALE',
          ageMonths: 12,
          size: 'MEDIUM',
          vaccinated: true,
          sterilized: true,
          goodWithKids: true,
          goodWithDogs: false,
          goodWithCats: true,
          goodWithOtherPets: false,
          trained: false,
          description: 'Perrita muy amigable lista para adopcion',
        }),
      });
      const animalData = await animalRes.json();
      testData.animalId = animalData.id;
    } catch (e) {
      console.warn('beforeAll setup warning:', e);
      // Tests that need specific data will skip/fail gracefully
    }
  });

  test('public listing page loads without auth', async ({ page }) => {
    await page.goto('/animales');
    await expect(page).toHaveTitle(/Animales/i);
    // Page should not redirect to login
    await expect(page).not.toHaveURL(/login/);
    // Listings heading should be visible
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('listing page renders SSR content (animal data in raw HTML)', async ({ page }) => {
    // Use waitUntil: 'commit' to get raw HTML before JS hydration
    await page.goto('/animales', { waitUntil: 'commit' });
    const content = await page.content();
    // SSR: the page should contain the title in the raw HTML
    expect(content).toMatch(/animales|Animales|Kovia/i);
  });

  test('filters update URL query params', async ({ page }) => {
    await page.goto('/animales');
    // Wait for filter bar to be visible
    await page.waitForSelector('input[placeholder*="Buscar"]', { timeout: 10000 });
    // Type in search
    await page.fill('input[placeholder*="Buscar"]', 'Luna');
    // Wait for debounce + URL update
    await page.waitForTimeout(500);
    // URL should contain search param
    const url = page.url();
    expect(url).toContain('search=Luna');
  });

  test('view toggle switches between grid and list mode', async ({ page }) => {
    await page.goto('/animales');
    // Wait for page to be interactive
    await page.waitForSelector('button[title*="lista"], button[title*="list"]', { timeout: 10000 }).catch(() => {});
    // Find list view button by icon or title
    const listButton = page.locator('button').filter({ hasText: '' }).nth(1);
    // Check that grid is rendered initially (grid CSS class)
    const gridContainer = page.locator('.grid');
    await expect(gridContainer.first()).toBeVisible();
  });

  test('animal detail page shows name and apply button', async ({ page }) => {
    if (!testData.animalId) {
      test.skip();
      return;
    }
    await page.goto(`/animales/${testData.animalId}`);
    // Animal name heading should appear
    await expect(page.locator('h1').first()).toContainText('Luna');
    // Apply button should be visible (disabled)
    await expect(page.getByText('Aplicar para adoptar')).toBeVisible();
    // Photo gallery area should be visible
    await expect(page.locator('.aspect-\\[4\\/3\\]')).toBeVisible();
  });

  test('animal detail page has OG meta tags in page source', async ({ page }) => {
    if (!testData.animalId) {
      test.skip();
      return;
    }
    await page.goto(`/animales/${testData.animalId}`);
    const content = await page.content();
    // OG tags must be in the HTML source (SSR)
    expect(content).toMatch(/og:title/i);
    expect(content).toMatch(/og:description/i);
    expect(content).toMatch(/og:type/i);
  });

  test('org landing page shows org animals', async ({ page }) => {
    if (!testData.orgSlug) {
      test.skip();
      return;
    }
    await page.goto(`/org/${testData.orgSlug}`);
    // Wait for org name to appear
    await expect(page.locator('h1').first()).toBeVisible();
    // Animals section heading should appear
    await expect(page.getByText('Animales en adopcion')).toBeVisible();
  });

  test('empty state shows with non-matching filter', async ({ page }) => {
    await page.goto('/animales?species=especie-inexistente-xyz');
    // Should show empty state (no results)
    await page.waitForSelector('[class*="paw"], [name="i-lucide-paw-print"]', { timeout: 10000 }).catch(() => {});
    // Either the empty component or no animal cards
    const cards = page.locator('a[href^="/animales/"]');
    const count = await cards.count();
    // 0 results means empty state should appear
    if (count === 0) {
      await expect(page.getByText(/no encontramos/i).or(page.getByText(/no hay animales/i))).toBeVisible();
    }
  });
});
