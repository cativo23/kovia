import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const { Client } = pg;

/**
 * RLS Integration Tests
 *
 * These tests verify that PostgreSQL Row-Level Security policies
 * correctly isolate tenant data. They use raw SQL with SET LOCAL
 * to simulate the RLS extension behavior.
 *
 * Requires a running PostgreSQL instance with the app_user role
 * and RLS policies applied (via Prisma migrations).
 */

const APP_USER_CONNECTION = {
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'kovia',
  user: 'app_user',
  password: 'app_password',
};

const SUPERUSER_CONNECTION = {
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'kovia',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

let superClient: InstanceType<typeof Client>;
let orgAId: string;
let orgBId: string;
let userAId: string;
let userBId: string;

describe('RLS Integration Tests', () => {
  beforeAll(async () => {
    superClient = new Client(SUPERUSER_CONNECTION);
    await superClient.connect();

    // Create two test users (as superuser, bypasses RLS)
    const userAResult = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'rls-test-a@test.com', 'hash', 'ORG_ADMIN', true, true, NOW(), NOW())
       RETURNING id`,
    );
    userAId = userAResult.rows[0].id;

    const userBResult = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'rls-test-b@test.com', 'hash', 'ORG_ADMIN', true, true, NOW(), NOW())
       RETURNING id`,
    );
    userBId = userBResult.rows[0].id;

    // Create two organizations
    const orgAResult = await superClient.query(
      `INSERT INTO organizations (id, name, slug, status, "adminId", "contactEmail", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'Org A', 'rls-org-a', 'ACTIVE', $1, 'a@test.com', NOW(), NOW())
       RETURNING id`,
      [userAId],
    );
    orgAId = orgAResult.rows[0].id;

    const orgBResult = await superClient.query(
      `INSERT INTO organizations (id, name, slug, status, "adminId", "contactEmail", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'Org B', 'rls-org-b', 'ACTIVE', $1, 'b@test.com', NOW(), NOW())
       RETURNING id`,
      [userBId],
    );
    orgBId = orgBResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data (as superuser)
    if (superClient) {
      await superClient.query(`DELETE FROM organizations WHERE slug IN ('rls-org-a', 'rls-org-b')`);
      await superClient.query(`DELETE FROM users WHERE email IN ('rls-test-a@test.com', 'rls-test-b@test.com')`);
      await superClient.end();
    }
  });

  it('Org A session cannot see Org B data', async () => {
    const client = new Client(APP_USER_CONNECTION);
    await client.connect();

    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.current_org_id', $1, true)`, [orgAId]);

      const result = await client.query('SELECT id, name, slug FROM organizations');

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].slug).toBe('rls-org-a');
      expect(result.rows.find((r: any) => r.slug === 'rls-org-b')).toBeUndefined();

      await client.query('ROLLBACK');
    } finally {
      await client.end();
    }
  });

  it('Org B session cannot see Org A data', async () => {
    const client = new Client(APP_USER_CONNECTION);
    await client.connect();

    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.current_org_id', $1, true)`, [orgBId]);

      const result = await client.query('SELECT id, name, slug FROM organizations');

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].slug).toBe('rls-org-b');
      expect(result.rows.find((r: any) => r.slug === 'rls-org-a')).toBeUndefined();

      await client.query('ROLLBACK');
    } finally {
      await client.end();
    }
  });

  it('Platform admin (is_admin=true) can see all orgs', async () => {
    const client = new Client(APP_USER_CONNECTION);
    await client.connect();

    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.is_admin', 'true', true)`);

      const result = await client.query('SELECT id, name, slug FROM organizations');

      const slugs = result.rows.map((r: any) => r.slug);
      expect(slugs).toContain('rls-org-a');
      expect(slugs).toContain('rls-org-b');

      await client.query('ROLLBACK');
    } finally {
      await client.end();
    }
  });

  it('User without tenant context gets no tenant-scoped data', async () => {
    const client = new Client(APP_USER_CONNECTION);
    await client.connect();

    try {
      await client.query('BEGIN');
      // No set_config calls -- empty tenant context

      const result = await client.query('SELECT id, name, slug FROM organizations');

      expect(result.rows).toHaveLength(0);

      await client.query('ROLLBACK');
    } finally {
      await client.end();
    }
  });
});
