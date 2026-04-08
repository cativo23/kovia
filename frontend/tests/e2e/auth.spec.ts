import { test, expect } from '@playwright/test';

/**
 * Mailpit API helper -- Mailpit is at http://mailpit:8025 inside Docker.
 * From host, it's http://localhost:8025.
 */
const MAILPIT_URL = process.env.MAILPIT_URL || 'http://mailpit:8025';

/** Generate a unique email for each test run to avoid collisions */
function uniqueEmail(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `e2e-${ts}-${rand}@test.kovia.dev`;
}

/** Fetch the latest Mailpit message for a given email address */
async function getMailpitMessage(
  toEmail: string,
  maxRetries = 15,
): Promise<{ ID: string; HTML: string; Text: string }> {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=to:${encodeURIComponent(toEmail)}`,
    );
    const data = await res.json();
    if (data.messages && data.messages.length > 0) {
      const msgId = data.messages[0].ID;
      const msgRes = await fetch(`${MAILPIT_URL}/api/v1/message/${msgId}`);
      return msgRes.json();
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`No email found for ${toEmail} after ${maxRetries} retries`);
}

/** Delete all Mailpit messages to start clean */
async function clearMailpit(): Promise<void> {
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' });
}

/** Extract first href URL from HTML that matches a pattern */
function extractUrlFromHtml(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  if (!match) throw new Error(`No URL matching ${pattern} found in email HTML`);
  return match[1] || match[0];
}

/** Wait for the authenticated home page to show the welcome heading */
async function expectWelcomeHeading(
  page: import('@playwright/test').Page,
  name: string,
  timeout = 15_000,
) {
  await expect(
    page.getByRole('heading', { name: new RegExp(`Bienvenido.*${name}`) }),
  ).toBeVisible({ timeout });
}

// Shared test state
let testEmail: string;
const testPassword = 'TestPass123';
const testFirstName = 'E2E';
const testLastName = 'Tester';

test.describe('Auth flows', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    testEmail = uniqueEmail();
    await clearMailpit();
  });

  test('register -- create a new account', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Verify page is in Spanish
    await expect(page.getByText('Crea tu cuenta')).toBeVisible();

    // Fill form fields using placeholder text
    await page.getByPlaceholder('Tu nombre').fill(testFirstName);
    await page.getByPlaceholder('Tu apellido').fill(testLastName);
    await page.getByPlaceholder('tu@correo.com').fill(testEmail);
    await page.getByPlaceholder('Tu contrasena', { exact: true }).fill(testPassword);
    await page.getByPlaceholder('Repeti tu contrasena', { exact: true }).fill(testPassword);

    // Submit the form (exact match to avoid "Registrarse con Google")
    await page.getByRole('button', { name: 'Registrarse', exact: true }).click();

    // Verify success message appears
    await expect(page.getByText('Revisa tu correo')).toBeVisible({ timeout: 15_000 });
  });

  test('email verification -- verify email via magic link from Mailpit', async ({ page }) => {
    // Fetch verification email from Mailpit
    const msg = await getMailpitMessage(testEmail);

    // Extract verification URL from email HTML
    const verifyUrl = extractUrlFromHtml(
      msg.HTML,
      /href="([^"]*verify-email[^"]*)"/,
    );

    // Convert absolute URL to relative path for in-container navigation
    const url = new URL(verifyUrl);
    const pathWithQuery = url.pathname + url.search;

    await page.goto(pathWithQuery);

    // Verify auto-login: should show success then redirect to home
    await expect(page.getByText(/verificado/i)).toBeVisible({ timeout: 15_000 });

    // Verify authenticated state on home page after redirect
    await expectWelcomeHeading(page, testFirstName);
  });

  test('login -- authenticate with email and password', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Verify page is in Spanish
    await expect(page.getByText('Inicia sesion')).toBeVisible();

    // Fill form
    await page.getByPlaceholder('tu@correo.com').fill(testEmail);
    await page.getByPlaceholder('Tu contrasena').fill(testPassword);

    // Submit
    await page.getByRole('button', { name: 'Iniciar sesion', exact: true }).click();

    // Verify redirect to home with authenticated state
    await expectWelcomeHeading(page, testFirstName);
  });

  test('session persist -- user stays authenticated after page reload', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('tu@correo.com').fill(testEmail);
    await page.getByPlaceholder('Tu contrasena').fill(testPassword);
    await page.getByRole('button', { name: 'Iniciar sesion', exact: true }).click();
    await expectWelcomeHeading(page, testFirstName);

    // Reload and verify session persists via silent token refresh
    await page.reload();
    await expectWelcomeHeading(page, testFirstName, 20_000);
  });

  test('password reset -- full reset flow via Mailpit', async ({ page }) => {
    // Clear mailpit to isolate reset email
    await clearMailpit();

    // Navigate to forgot password
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    // Fill email
    await page.getByPlaceholder('tu@correo.com').fill(testEmail);
    await page.getByRole('button', { name: /enviar enlace/i }).click();

    // Verify confirmation message (the "sent" view with mail-check icon)
    await expect(page.getByText('Si tu correo esta registrado')).toBeVisible({ timeout: 15_000 });

    // Fetch reset email from Mailpit
    const msg = await getMailpitMessage(testEmail);

    // Extract reset URL
    const resetUrl = extractUrlFromHtml(
      msg.HTML,
      /href="([^"]*reset-password[^"]*)"/,
    );

    const url = new URL(resetUrl);
    const pathWithQuery = url.pathname + url.search;

    await page.goto(pathWithQuery);
    await page.waitForLoadState('networkidle');

    // Fill new password form
    const newPassword = 'NewPass456';
    await page.getByPlaceholder('Tu nueva contrasena').fill(newPassword);
    await page.getByPlaceholder('Repeti tu contrasena').fill(newPassword);

    // Submit
    await page.getByRole('button', { name: /restablecer/i }).click();

    // Verify auto-login after reset -- redirects to home
    await expectWelcomeHeading(page, testFirstName);
  });
});
