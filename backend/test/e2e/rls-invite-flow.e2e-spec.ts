/**
 * RLS + Invite Flow E2E tests — verifies tenant isolation and org onboarding.
 *
 * Tests the full flow: admin creates invite → org user registers → claims invite →
 * gets ORG_ADMIN role → creates org → RLS isolates data between tenants.
 *
 * Requires all Docker Compose services running:
 *   docker compose exec api npx vitest run --config vitest.config.e2e.ts test/e2e/rls-invite-flow.e2e-spec.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const MAILPIT_URL = process.env.MAILPIT_URL || 'http://mailpit:8025';

function uniqueEmail(prefix = 'rls-e2e'): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${ts}-${rand}@test.kovia.dev`;
}

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
      return msgRes.json() as Promise<{ ID: string; HTML: string; Text: string }>;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`No email found for ${toEmail} after ${maxRetries} retries`);
}

function extractVerifyToken(text: string): string {
  const match = text.match(/verify-email\?token=([^\s&"]+)/);
  if (!match) throw new Error('No verification token found in email');
  return match[1];
}

async function getVerificationEmail(
  toEmail: string,
  maxRetries = 15,
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=to:${encodeURIComponent(toEmail)}+subject:Verifica`,
    );
    const data = (await res.json()) as { messages?: Array<{ ID: string }> };
    if (data.messages && data.messages.length > 0) {
      const msgId = data.messages[0].ID;
      const msgRes = await fetch(`${MAILPIT_URL}/api/v1/message/${msgId}`);
      const msg = (await msgRes.json()) as { Text: string };
      if (msg.Text.includes('verify-email')) return msg.Text;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`No verification email found for ${toEmail}`);
}

function extractCookie(headers: Headers, name: string): string | null {
  const setCookies = headers.getSetCookie?.() || [];
  for (const cookie of setCookies) {
    if (cookie.startsWith(`${name}=`)) {
      return cookie.split('=')[1].split(';')[0];
    }
  }
  const raw = headers.get('set-cookie');
  if (raw && raw.includes(`${name}=`)) {
    const match = raw.match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : null;
  }
  return null;
}

async function registerAndVerify(
  email: string,
  firstName: string,
): Promise<{ accessToken: string; refreshCookie: string }> {
  await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, lastName: 'Test', email, password: 'TestPass123' }),
  });

  const emailText = await getVerificationEmail(email);
  const verifyToken = extractVerifyToken(emailText);

  const verifyRes = await fetch(`${API_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: verifyToken }),
  });

  const data = (await verifyRes.json()) as { accessToken: string };
  const refreshCookie = extractCookie(verifyRes.headers, 'refresh_token') || '';

  return { accessToken: data.accessToken, refreshCookie };
}

async function refreshTokens(refreshCookie: string): Promise<{ accessToken: string; refreshCookie: string }> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { Cookie: `refresh_token=${refreshCookie}` },
  });
  const data = (await res.json()) as { accessToken: string };
  const newCookie = extractCookie(res.headers, 'refresh_token') || refreshCookie;
  return { accessToken: data.accessToken, refreshCookie: newCookie };
}

describe('RLS + Invite Flow E2E', () => {
  const adminEmail = uniqueEmail('admin');
  const org1Email = uniqueEmail('org1');
  const org2Email = uniqueEmail('org2');

  let adminToken: string;
  let adminCookie: string;
  let org1Token: string;
  let org1Cookie: string;
  let org2Token: string;
  let org2Cookie: string;
  let invite1Token: string;
  let invite2Token: string;

  beforeAll(async () => {
    // Clean DB for isolated test — uses direct SQL via a test-only endpoint
    // Since we can't exec SQL from the test, truncate via Prisma's API isn't available.
    // Instead, we rely on the test running against a clean DB.
    // Run: docker compose exec postgres psql -U postgres -d kovia -c "TRUNCATE audit_logs, org_invites, organizations, refresh_tokens, users CASCADE;"
    // before running this test suite.
    await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' });
  }, 10000);

  describe('Setup: Admin + Two Org Users', () => {
    it('registers and verifies platform admin (first user)', async () => {
      const result = await registerAndVerify(adminEmail, 'Admin');
      adminToken = result.accessToken;
      adminCookie = result.refreshCookie;

      const me = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((r) => r.json()) as any;

      expect(me.role).toBe('PLATFORM_ADMIN');
    });

    it('admin creates two org invites', async () => {
      const res1 = await fetch(`${API_URL}/admin/invites`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: org1Email, orgName: 'Org Alpha' }),
      });
      const inv1 = (await res1.json()) as any;
      expect(inv1.token).toBeDefined();
      invite1Token = inv1.token;

      const res2 = await fetch(`${API_URL}/admin/invites`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: org2Email, orgName: 'Org Beta' }),
      });
      const inv2 = (await res2.json()) as any;
      expect(inv2.token).toBeDefined();
      invite2Token = inv2.token;
    });

    it('org1 user registers, verifies, claims invite, becomes ORG_ADMIN', async () => {
      const result = await registerAndVerify(org1Email, 'OrgOne');
      org1Token = result.accessToken;
      org1Cookie = result.refreshCookie;

      // Claim invite
      const claimRes = await fetch(`${API_URL}/organizations/claim-invite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${org1Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invite1Token }),
      });
      expect(claimRes.status).toBe(201);

      // Refresh to get updated role in JWT
      const refreshed = await refreshTokens(org1Cookie);
      org1Token = refreshed.accessToken;
      org1Cookie = refreshed.refreshCookie;

      const me = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${org1Token}` },
      }).then((r) => r.json()) as any;
      expect(me.role).toBe('ORG_ADMIN');
    });

    it('org2 user registers, verifies, claims invite, becomes ORG_ADMIN', async () => {
      const result = await registerAndVerify(org2Email, 'OrgTwo');
      org2Token = result.accessToken;
      org2Cookie = result.refreshCookie;

      const claimRes = await fetch(`${API_URL}/organizations/claim-invite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${org2Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invite2Token }),
      });
      expect(claimRes.status).toBe(201);

      const refreshed = await refreshTokens(org2Cookie);
      org2Token = refreshed.accessToken;
      org2Cookie = refreshed.refreshCookie;

      const me = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${org2Token}` },
      }).then((r) => r.json()) as any;
      expect(me.role).toBe('ORG_ADMIN');
    });

    it('org1 creates their organization', async () => {
      const res = await fetch(`${API_URL}/organizations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${org1Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Org Alpha',
          description: 'First org',
          contactEmail: org1Email,
        }),
      });
      expect(res.status).toBe(201);
      const org = (await res.json()) as any;
      expect(org.name).toBe('Org Alpha');
      expect(org.slug).toBe('org-alpha');
    });

    it('org2 creates their organization', async () => {
      const res = await fetch(`${API_URL}/organizations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${org2Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Org Beta',
          description: 'Second org',
          contactEmail: org2Email,
        }),
      });
      expect(res.status).toBe(201);
      const org = (await res.json()) as any;
      expect(org.name).toBe('Org Beta');
    });
  });

  describe('RLS Tenant Isolation', () => {
    it('org1 can only see their own org via /organizations/me', async () => {
      const res = await fetch(`${API_URL}/organizations/me`, {
        headers: { Authorization: `Bearer ${org1Token}` },
      });
      expect(res.status).toBe(200);
      const org = (await res.json()) as any;
      expect(org.name).toBe('Org Alpha');
    });

    it('org2 can only see their own org via /organizations/me', async () => {
      const res = await fetch(`${API_URL}/organizations/me`, {
        headers: { Authorization: `Bearer ${org2Token}` },
      });
      expect(res.status).toBe(200);
      const org = (await res.json()) as any;
      expect(org.name).toBe('Org Beta');
    });

    it('platform admin can see all orgs', async () => {
      const res = await fetch(`${API_URL}/admin/orgs`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const orgs = (await res.json()) as any[];
      expect(orgs.length).toBe(2);
      const names = orgs.map((o) => o.name).sort();
      expect(names).toEqual(['Org Alpha', 'Org Beta']);
    });

    it('public can view org by slug without auth', async () => {
      const res = await fetch(`${API_URL}/organizations/org-alpha`);
      expect(res.status).toBe(200);
      const org = (await res.json()) as any;
      expect(org.name).toBe('Org Alpha');
    });
  });

  describe('Admin User Management', () => {
    it('admin can list all users', async () => {
      const res = await fetch(`${API_URL}/admin/users?page=1&limit=50`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const { data, total } = (await res.json()) as any;
      expect(total).toBeGreaterThanOrEqual(3);
      expect(data.some((u: any) => u.email === org1Email)).toBe(true);
      expect(data.some((u: any) => u.email === org2Email)).toBe(true);
    });

    it('admin can deactivate a user', async () => {
      const users = await fetch(`${API_URL}/admin/users?page=1&limit=50`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((r) => r.json()) as any;
      const org2User = users.data.find((u: any) => u.email === org2Email);

      const res = await fetch(`${API_URL}/admin/users/${org2User.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });
      expect(res.status).toBe(200);
    });

    it('deactivated user cannot login', async () => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: org2Email, password: 'TestPass123' }),
      });
      expect(res.status).toBe(403);
    });

    it('admin can reactivate the user', async () => {
      const users = await fetch(`${API_URL}/admin/users?page=1&limit=50`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((r) => r.json()) as any;
      const org2User = users.data.find((u: any) => u.email === org2Email);

      const res = await fetch(`${API_URL}/admin/users/${org2User.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
      expect(res.status).toBe(200);
    });

    it('reactivated user can login again', async () => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: org2Email, password: 'TestPass123' }),
      });
      expect(res.status).toBe(200);
    });
  });

  describe('RLS Prevents Cross-Tenant Access', () => {
    it('non-admin user cannot access admin endpoints', async () => {
      // Refresh token to ensure it's not expired
      const refreshed = await refreshTokens(org1Cookie);
      org1Token = refreshed.accessToken;
      org1Cookie = refreshed.refreshCookie;

      const res = await fetch(`${API_URL}/admin/orgs`, {
        headers: { Authorization: `Bearer ${org1Token}` },
      });
      expect(res.status).toBe(403);
    });

    it('non-admin user cannot create invites', async () => {
      const res = await fetch(`${API_URL}/admin/invites`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${org1Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'hack@test.com', orgName: 'Hacked' }),
      });
      expect(res.status).toBe(403);
    });

    it('unauthenticated user cannot access protected endpoints', async () => {
      const res = await fetch(`${API_URL}/organizations/me`);
      expect(res.status).toBe(401);
    });
  });
});
