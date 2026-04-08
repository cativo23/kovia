/**
 * Auth E2E tests -- runs against the live API + PostgreSQL in Docker.
 *
 * Requires all Docker Compose services running:
 *   docker compose exec api npx vitest run --config vitest.config.e2e.ts --reporter=verbose
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const MAILPIT_URL = process.env.MAILPIT_URL || 'http://mailpit:8025';

/** Generate a unique email per test run */
function uniqueEmail(prefix = 'be-e2e'): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${ts}-${rand}@test.kovia.dev`;
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
    const data = (await res.json()) as { messages?: Array<{ ID: string }> };
    if (data.messages && data.messages.length > 0) {
      const msgId = data.messages[0].ID;
      const msgRes = await fetch(`${MAILPIT_URL}/api/v1/message/${msgId}`);
      return msgRes.json() as Promise<{
        ID: string;
        HTML: string;
        Text: string;
      }>;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`No email found for ${toEmail} after ${maxRetries} retries`);
}

/** Extract token from email URL */
function extractToken(html: string, urlPattern: RegExp): string {
  const match = html.match(urlPattern);
  if (!match) throw new Error(`No URL matching ${urlPattern} found in email`);
  const url = new URL(match[1]);
  return url.searchParams.get('token')!;
}

/** Clear all Mailpit messages */
async function clearMailpit(): Promise<void> {
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' });
}

/** Extract Set-Cookie header from fetch response */
function extractCookie(
  headers: Headers,
  name: string,
): string | null {
  const setCookies = headers.getSetCookie?.() || [];
  for (const cookie of setCookies) {
    if (cookie.startsWith(`${name}=`)) {
      return cookie.split('=')[1].split(';')[0];
    }
  }
  // Fallback: check raw header
  const raw = headers.get('set-cookie');
  if (raw && raw.includes(`${name}=`)) {
    const match = raw.match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : null;
  }
  return null;
}

describe('Auth E2E', () => {
  const testPassword = 'TestPass123';
  let testEmail: string;
  let accessToken: string;
  let refreshCookie: string;

  beforeAll(async () => {
    testEmail = uniqueEmail();
    await clearMailpit();
  });

  describe('Register', () => {
    it('POST /auth/register -- 201 with valid data', async () => {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          firstName: 'Backend',
          lastName: 'E2E',
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as { message: string; userId: string };
      expect(body.message).toContain('Registro exitoso');
      expect(body.userId).toBeDefined();
    });

    it('POST /auth/register -- 409 with duplicate email', async () => {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          firstName: 'Duplicate',
          lastName: 'User',
        }),
      });

      expect(res.status).toBe(409);
    });

    it('POST /auth/register -- 400 with missing fields', async () => {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'incomplete@test.dev' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('Verify Email', () => {
    it('POST /auth/verify-email -- 200 with valid token + returns tokens', async () => {
      // Fetch verification email from Mailpit
      const msg = await getMailpitMessage(testEmail);
      const token = extractToken(
        msg.HTML,
        /href="([^"]*verify-email[^"]*)"/,
      );

      const res = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { accessToken: string };
      expect(body.accessToken).toBeDefined();

      // Store the refresh cookie for later
      refreshCookie = extractCookie(res.headers, 'refresh_token') || '';
      accessToken = body.accessToken;

      expect(refreshCookie).toBeTruthy();
    });

    it('POST /auth/verify-email -- 401 with invalid token', async () => {
      const res = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'invalid-token-value' }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe('Login', () => {
    it('POST /auth/login -- 200 with valid credentials + Set-Cookie', async () => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { accessToken: string };
      expect(body.accessToken).toBeDefined();

      // Verify refresh cookie is set
      const cookie = extractCookie(res.headers, 'refresh_token');
      expect(cookie).toBeTruthy();

      // Store for subsequent tests
      accessToken = body.accessToken;
      refreshCookie = cookie!;
    });

    it('POST /auth/login -- 401 with wrong password', async () => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword99',
        }),
      });

      expect(res.status).toBe(401);
    });

    it('POST /auth/login -- 403 with unverified email', async () => {
      // Register a new user without verifying
      const unverifiedEmail = uniqueEmail('unverified');
      await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: unverifiedEmail,
          password: testPassword,
          firstName: 'Unverified',
          lastName: 'User',
        }),
      });

      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: unverifiedEmail,
          password: testPassword,
        }),
      });

      expect(res.status).toBe(403);
    });
  });

  describe('Refresh', () => {
    it('POST /auth/refresh -- 200 with valid cookie + returns new accessToken', async () => {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `refresh_token=${refreshCookie}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { accessToken: string };
      expect(body.accessToken).toBeDefined();

      // Update tokens for next tests (rotation)
      accessToken = body.accessToken;
      const newCookie = extractCookie(res.headers, 'refresh_token');
      if (newCookie) refreshCookie = newCookie;
    });

    it('POST /auth/refresh -- 401 without cookie', async () => {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(401);
    });
  });

  describe('Password Reset', () => {
    it('POST /auth/forgot-password -- 200 with valid email', async () => {
      await clearMailpit();

      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });

      expect(res.status).toBe(200);
    });

    it('POST /auth/reset-password -- 200 with valid token + returns tokens', async () => {
      // Fetch reset email from Mailpit
      const msg = await getMailpitMessage(testEmail);
      const token = extractToken(
        msg.HTML,
        /href="([^"]*reset-password[^"]*)"/,
      );

      const newPassword = 'NewPass456';
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { accessToken: string };
      expect(body.accessToken).toBeDefined();

      // Update for session test
      accessToken = body.accessToken;
      const cookie = extractCookie(res.headers, 'refresh_token');
      if (cookie) refreshCookie = cookie;
    });
  });

  describe('Session Persistence', () => {
    it('GET /auth/me -- 200 with valid access token', async () => {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
      };
      expect(body.email).toBe(testEmail);
      expect(body.firstName).toBe('Backend');
      expect(body.role).toBeDefined();
    });

    it('POST /auth/refresh + GET /auth/me -- full session cycle', async () => {
      // Refresh to get new access token
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `refresh_token=${refreshCookie}`,
        },
      });

      expect(refreshRes.status).toBe(200);
      const refreshBody = (await refreshRes.json()) as {
        accessToken: string;
      };

      // Use new access token to get profile
      const meRes = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${refreshBody.accessToken}`,
        },
      });

      expect(meRes.status).toBe(200);
      const meBody = (await meRes.json()) as { email: string };
      expect(meBody.email).toBe(testEmail);
    });
  });
});
