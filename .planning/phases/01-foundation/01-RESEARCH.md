# Phase 1: Foundation - Research

**Researched:** 2026-04-08
**Domain:** Authentication, Multi-Tenant Isolation, Organization Management, Dev Infrastructure
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire technical foundation for Kovia: a Docker Compose-based monorepo with NestJS 11 (backend), Nuxt 4 (frontend), PostgreSQL 16 with Row-Level Security, Redis, and Mailpit. The phase covers user authentication (email/password + Google OAuth), email verification, password reset, org onboarding via invite links, platform admin functionality, and tenant-isolated data from day one.

The stack is well-established with strong community patterns. NestJS 11 (released Jan 2025) defaults to SWC and Vitest. Nuxt 4 (released July 2025) moves app code to `app/` directory. Prisma 7 (released Nov 2025) is fully TypeScript-based, requires driver adapters, and outputs to a custom directory. PostgreSQL RLS with Prisma is a proven pattern using `$extends` + `SET LOCAL` in transactions. The critical architectural decision is establishing RLS in the first migration -- this cannot be retrofitted without a full audit.

**Primary recommendation:** Use nestjs-cls for request-scoped tenant context, Prisma Client Extensions for RLS enforcement via `SET LOCAL` + PostgreSQL policies, @nestjs/passport with JWT access tokens (httpOnly cookies) + refresh tokens, and @nestjs-modules/mailer with Handlebars templates for email.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Magic link redirect for email verification: user clicks link in email, automatically verified + logged in
- Magic link redirect for password reset: user clicks link, lands on "set new password" form
- Google OAuth is prominent and equal to email/password -- both are first-class signup/login options
- Single login page for all roles (adopters and org admins) -- route based on role after login
- Everyone starts as an adopter by default -- org admin role acquired through invite flow, not signup
- Profile data for OAuth users collected at first application, not during signup (no friction at onboarding)
- Expired verification/reset links show "link expired" with a one-click "send new link" button (auto-resend)
- Invite-only model: platform admin invites orgs (no self-registration)
- Flow: admin generates invite link -> org admin clicks link -> creates account -> fills org profile -> immediately active
- Org profile fields: name, description, logo, contact email, phone, social media links (Instagram, Facebook, WhatsApp)
- Invite links expire after 7 days, resendable from admin panel
- Org can be soft-deactivated by platform admin (animals hidden from public listings, data preserved, reactivatable)
- Strictly one admin per org for MVP
- Separate `/admin` route with its own layout
- First registered user automatically becomes platform admin
- Admin dashboard shows: org list (active/inactive), pending invites, platform stats
- Full user management: view all adopters, soft-deactivate (reversible), permanent delete (with confirmation)
- Deactivating a user auto-withdraws their active applications
- Basic activity audit log for admin actions
- Flat monorepo: `/backend` (NestJS 11 + Prisma 7) and `/frontend` (Nuxt 4) at project root
- Docker Compose services: API, Web, PostgreSQL 16, Redis, Mailpit
- Vitest as test runner for both frontend and backend
- Playwright for E2E tests from Phase 1 (covering auth flows)
- Swagger/OpenAPI via NestJS decorators at `/api/docs`
- Nuxt UI (Tailwind-based) as component library
- Pinia for frontend state management
- 80%+ code coverage for both FE/BE (meaningful tests, no padding)
- Warm and friendly tone in Spanish for email templates
- All emails in Spanish (es-SV) for MVP

### Claude's Discretion
- JWT token storage strategy (prioritize security)
- Email template HTML implementation details
- Loading states and error handling UX
- i18n key structure and translation file format
- RLS policy implementation details
- Redis usage patterns (sessions, cache, queues)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign up with email and password | NestJS Passport local strategy + bcrypt hashing, Prisma User model |
| AUTH-02 | User receives email verification after signup | @nestjs-modules/mailer + Handlebars templates, magic link with signed JWT token, Mailpit for dev |
| AUTH-03 | User can reset password via email link | Same email infrastructure as AUTH-02, separate signed token with expiry |
| AUTH-04 | User session persists across browser refresh (JWT + refresh tokens) | httpOnly cookie for refresh token, short-lived access token in memory, @nestjs/jwt |
| AUTH-05 | User can sign in with OAuth (Google) | passport-google-oauth20, callback URL pattern, user upsert on first login |
| ORG-01 | Organization has a profile with name, description, logo, and contact info | Prisma Organization model with tenant_id, Nuxt UI form for profile |
| ORG-02 | Platform admin can approve or reject org registration requests | Invite-only model (per CONTEXT.md) -- admin generates invite link, no approval queue |
| ORG-03 | Each organization has a single admin who manages all org data | User-Organization relation with role enum, enforced at service layer |
| ORG-04 | All organization data is isolated via multi-tenant RLS policies | PostgreSQL RLS + Prisma Client Extensions + nestjs-cls for request context |
| INFR-01 | Application is containerized with Docker and Docker Compose | Multi-service compose: api, web, postgres, redis, mailpit with hot reload |
| INFR-02 | UI is Spanish-first (es-SV locale) with i18n infrastructure | @nuxtjs/i18n module with es-SV as default locale, JSON translation files |
| INFR-03 | Multi-tenant data isolation enforced at database level via PostgreSQL RLS | RLS policies on all tenant-scoped tables, enforced via SET LOCAL in Prisma extension |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | 11.x | Backend framework | SWC default, Vitest default, mature DI system |
| Nuxt | 4.x | Frontend framework | SSR-ready, app/ directory structure, Nuxt 3 EOL July 2026 |
| Prisma ORM | 7.x | Database ORM | TypeScript-native, no Rust binary, 90% smaller bundle |
| PostgreSQL | 16 | Database | RLS support, mature, JSONB for flexible fields |
| Redis | 7.x | Cache/queues/sessions | BullMQ job queues, refresh token blacklist |
| @prisma/adapter-pg | latest | Prisma PostgreSQL driver | Required in Prisma 7 -- no built-in drivers |
| pg | latest | Node PostgreSQL driver | Used by @prisma/adapter-pg |

### Backend Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nestjs/passport | latest | Auth strategies | All auth flows (local, JWT, Google) |
| @nestjs/jwt | latest | JWT generation/validation | Access + refresh tokens |
| passport-jwt | latest | JWT strategy | Protecting API routes |
| passport-local | latest | Email/password strategy | Login endpoint |
| passport-google-oauth20 | latest | Google OAuth strategy | Google sign-in |
| @nestjs-modules/mailer | latest | Email sending | Verification, reset, invite emails |
| nodemailer | latest | SMTP transport | Required by @nestjs-modules/mailer |
| handlebars | latest | Email templates | HTML email rendering with variables |
| @nestjs/bullmq | latest | Job queue integration | Background email sending |
| bullmq | latest | Queue library | Redis-backed job processing |
| nestjs-cls | latest | Continuation-local storage | Request-scoped tenant context for RLS |
| bcrypt | latest | Password hashing | Secure password storage |
| @nestjs/swagger | latest | OpenAPI docs | Auto-generate API docs at /api/docs |
| class-validator | latest | DTO validation | Request payload validation |
| class-transformer | latest | DTO transformation | Request/response serialization |
| unplugin-swc | latest | SWC for Vitest | NestJS decorator support in tests |

### Frontend Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nuxt/ui | 4.x | Component library | All UI components (Reka UI + Tailwind) |
| @pinia/nuxt | latest | State management | Auth state, user session |
| @nuxtjs/i18n | latest | Internationalization | Spanish-first UI with i18n keys |
| @nuxt/test-utils | latest | Testing utilities | Unit + E2E test setup |
| playwright-core | latest | Browser automation | E2E auth flow tests |

### Dev Tools
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Mailpit | latest | Email catcher | Dev email testing (SMTP on 1025, UI on 8025) |
| vitest | latest | Test runner | Both FE and BE tests |
| @vitest/coverage-v8 | latest | Coverage reporting | 80%+ coverage enforcement |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @nestjs-modules/mailer | nodemailer directly | Lose NestJS DI integration, template engine setup |
| Handlebars templates | React Email | Overkill for Spanish-only MVP, adds React dependency to backend |
| nestjs-cls | REQUEST-scoped Prisma | Performance penalty -- new PrismaClient per request |
| BullMQ for email | Synchronous sending | Blocks API response, no retry on failure |
| @prisma/adapter-pg | @prisma/adapter-pg-lite | pg-lite is for embedded/test use only |

**Installation (backend):**
```bash
# Core
npm install @nestjs/common @nestjs/core @nestjs/platform-express
npm install @prisma/client @prisma/adapter-pg pg
npm install --save-dev prisma @types/pg

# Auth
npm install @nestjs/passport @nestjs/jwt passport passport-jwt passport-local passport-google-oauth20 bcrypt
npm install --save-dev @types/passport-jwt @types/passport-local @types/passport-google-oauth20 @types/bcrypt

# Email
npm install @nestjs-modules/mailer nodemailer handlebars
npm install --save-dev @types/nodemailer

# Queue
npm install @nestjs/bullmq bullmq

# Utilities
npm install nestjs-cls @nestjs/swagger class-validator class-transformer

# Testing
npm install --save-dev vitest unplugin-swc @swc/core @vitest/coverage-v8
```

**Installation (frontend):**
```bash
# Core (via nuxt modules)
npx nuxt module add @nuxt/ui
npx nuxt module add pinia
npm install @pinia/nuxt
npx nuxt module add i18n

# Testing
npm install --save-dev @nuxt/test-utils vitest @vue/test-utils happy-dom playwright-core
```

## Architecture Patterns

### Recommended Project Structure
```
/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Models, enums
│   │   ├── migrations/           # SQL migrations (including RLS)
│   │   └── seed.ts               # Seed data (platform admin)
│   ├── prisma.config.ts          # Prisma 7 config (datasource URL)
│   ├── src/
│   │   ├── generated/prisma/     # Prisma 7 client output
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts  # Global PrismaModule
│   │   │   └── prisma.service.ts # PrismaClient + RLS extension
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/       # jwt, local, google
│   │   │   ├── guards/           # jwt-auth, local-auth, google-auth, roles
│   │   │   └── dto/              # login, register, reset DTOs
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.service.ts
│   │   │   └── dto/
│   │   ├── organizations/
│   │   │   ├── organizations.module.ts
│   │   │   ├── organizations.controller.ts
│   │   │   ├── organizations.service.ts
│   │   │   └── dto/
│   │   ├── admin/
│   │   │   ├── admin.module.ts
│   │   │   ├── admin.controller.ts
│   │   │   ├── admin.service.ts
│   │   │   └── dto/
│   │   ├── mail/
│   │   │   ├── mail.module.ts
│   │   │   ├── mail.service.ts
│   │   │   ├── mail.processor.ts # BullMQ worker
│   │   │   └── templates/        # Handlebars .hbs files
│   │   ├── tenant/
│   │   │   ├── tenant.module.ts
│   │   │   └── tenant.middleware.ts  # Sets org_id in CLS store
│   │   ├── audit/
│   │   │   ├── audit.module.ts
│   │   │   └── audit.service.ts
│   │   ├── common/
│   │   │   ├── decorators/       # @CurrentUser, @Roles, @Public
│   │   │   ├── guards/           # RolesGuard
│   │   │   ├── interceptors/
│   │   │   └── filters/          # Global exception filter
│   │   ├── app.module.ts
│   │   └── main.ts               # Bootstrap + Swagger setup
│   ├── test/
│   │   └── e2e/                  # Backend E2E tests
│   ├── vitest.config.ts
│   ├── vitest.config.e2e.ts
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── app/                      # Nuxt 4 app directory
│   │   ├── pages/
│   │   │   ├── index.vue
│   │   │   ├── login.vue
│   │   │   ├── register.vue
│   │   │   ├── verify-email.vue
│   │   │   ├── reset-password.vue
│   │   │   ├── forgot-password.vue
│   │   │   ├── org/
│   │   │   │   └── [slug].vue    # Org profile page
│   │   │   └── admin/
│   │   │       ├── index.vue     # Admin dashboard
│   │   │       ├── orgs.vue      # Org management
│   │   │       ├── users.vue     # User management
│   │   │       └── invites.vue   # Invite management
│   │   ├── components/
│   │   ├── composables/
│   │   │   └── useAuth.ts        # Auth composable
│   │   ├── middleware/
│   │   │   ├── auth.ts           # Require auth
│   │   │   └── admin.ts          # Require admin role
│   │   ├── layouts/
│   │   │   ├── default.vue
│   │   │   └── admin.vue         # Admin layout
│   │   ├── stores/
│   │   │   └── auth.ts           # Pinia auth store
│   │   └── plugins/
│   │       └── api.ts            # API client plugin
│   ├── i18n/
│   │   └── locales/
│   │       └── es-SV.json        # Spanish translations
│   ├── server/                   # Nuxt server (API proxy if needed)
│   ├── nuxt.config.ts
│   ├── vitest.config.ts
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── docker-compose.override.yml   # Dev overrides (volumes, ports)
├── .env                          # Shared env vars
└── .env.example
```

### Pattern 1: Prisma 7 with Driver Adapter
**What:** Prisma 7 requires explicit driver adapters -- no built-in database drivers
**When to use:** Always in Prisma 7

```typescript
// backend/prisma.config.ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

```typescript
// backend/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### Pattern 2: RLS via Prisma Client Extensions + nestjs-cls
**What:** Each request sets tenant context in PostgreSQL via SET LOCAL, RLS policies filter automatically
**When to use:** All database operations on tenant-scoped tables

```typescript
// backend/src/prisma/prisma-rls.extension.ts
import { PrismaClient } from '../../generated/prisma';
import { ClsService } from 'nestjs-cls';

export function createRlsExtension(prisma: PrismaClient, cls: ClsService) {
  return prisma.$extends({
    query: {
      $allOperations({ args, query, operation }) {
        const orgId = cls.get('organizationId');
        if (!orgId) return query(args);  // No tenant context (e.g., public routes)

        // Wrap in transaction that sets the tenant context
        return prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.current_org_id', ${orgId}, true)`;
          return query(args);
        });
      },
    },
  });
}
```

```sql
-- In Prisma migration file (add manually after --create-only)
-- Enable RLS on tenant-scoped tables
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;

-- Create an app user (NOT superuser -- superusers bypass RLS)
CREATE ROLE app_user LOGIN PASSWORD 'app_password';
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- Policy: org data visible only to members of that org
CREATE POLICY tenant_isolation ON "Organization"
  USING ("id"::text = current_setting('app.current_org_id', true));

-- Admin bypass policy (for platform admin routes)
CREATE POLICY admin_bypass ON "Organization"
  USING (current_setting('app.is_admin', true) = 'true');
```

### Pattern 3: JWT Access + Refresh Token (Secure)
**What:** Short-lived access token in memory, long-lived refresh token in httpOnly cookie
**When to use:** AUTH-04 requirement

**Recommendation (Claude's Discretion - Token Storage):**
- **Access token:** Stored in memory only (JavaScript variable / Pinia store). Never persisted to localStorage or cookies. 15-minute expiry.
- **Refresh token:** httpOnly, Secure, SameSite=Strict cookie. 7-day expiry. Stored hashed in database for revocation.
- **Why:** httpOnly cookies cannot be read by JavaScript (XSS-proof). Access token in memory disappears on page close but refresh cookie silently renews it. This is the most secure web pattern.

```typescript
// backend/src/auth/auth.service.ts (token generation pattern)
async generateTokens(user: User) {
  const payload = { sub: user.id, email: user.email, role: user.role };

  const accessToken = await this.jwtService.signAsync(payload, {
    secret: this.config.get('JWT_ACCESS_SECRET'),
    expiresIn: '15m',
  });

  const refreshToken = await this.jwtService.signAsync(
    { sub: user.id, type: 'refresh' },
    {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    },
  );

  // Store hashed refresh token in DB for revocation
  const hashedRefresh = await bcrypt.hash(refreshToken, 10);
  await this.prisma.refreshToken.upsert({
    where: { userId: user.id },
    update: { token: hashedRefresh, expiresAt: addDays(new Date(), 7) },
    create: { userId: user.id, token: hashedRefresh, expiresAt: addDays(new Date(), 7) },
  });

  return { accessToken, refreshToken };
}
```

### Pattern 4: Email via BullMQ Queue
**What:** Emails sent asynchronously through a Redis-backed queue
**When to use:** All transactional emails (verification, reset, invite)

```typescript
// backend/src/mail/mail.service.ts
@Injectable()
export class MailService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async sendVerificationEmail(email: string, token: string) {
    await this.emailQueue.add('verification', {
      to: email,
      subject: 'Verifica tu cuenta en Kovia',
      template: 'verification',
      context: { verificationUrl: `${APP_URL}/verify-email?token=${token}` },
    });
  }
}

// backend/src/mail/mail.processor.ts
@Processor('email')
export class MailProcessor {
  constructor(private mailerService: MailerService) {}

  @Process('verification')
  async handleVerification(job: Job) {
    await this.mailerService.sendMail({
      to: job.data.to,
      subject: job.data.subject,
      template: job.data.template,
      context: job.data.context,
    });
  }
}
```

### Pattern 5: Docker Compose Development Setup
**What:** All services orchestrated via Docker Compose with hot reload
**When to use:** INFR-01 requirement

```yaml
# docker-compose.yml
services:
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://app_user:app_password@postgres:5432/kovia
      REDIS_URL: redis://redis:6379
      MAIL_HOST: mailpit
      MAIL_PORT: 1025
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      NUXT_PUBLIC_API_URL: http://api:3000

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: kovia
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backend/prisma/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "8025:8025"   # Web UI
      - "1025:1025"   # SMTP
    environment:
      MP_MAX_MESSAGES: 500

volumes:
  pgdata:
```

### Anti-Patterns to Avoid
- **Superuser for Prisma connection:** Superusers bypass RLS entirely. Use a restricted `app_user` role for the application connection and `postgres` superuser only for migrations.
- **REQUEST-scoped PrismaClient:** Creates a new DB connection per request -- terrible for performance. Use nestjs-cls + extensions instead.
- **Access token in localStorage:** XSS-vulnerable. Keep in memory only.
- **Refresh token in localStorage:** XSS-vulnerable. Use httpOnly cookie.
- **Synchronous email sending:** Blocks the API response. Always queue emails.
- **Single JWT secret for both tokens:** If access token secret is compromised, refresh tokens are too. Use separate secrets.
- **RLS policies without testing:** Always seed test data for multiple orgs and verify cross-tenant isolation in integration tests.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom crypto | bcrypt | Timing attacks, salt management, future algorithm upgrades |
| JWT handling | Manual token parsing | @nestjs/jwt + passport-jwt | Token validation, expiry, signature verification edge cases |
| Email sending | Raw SMTP client | @nestjs-modules/mailer | Connection pooling, template rendering, transport abstraction |
| Job queues | Custom Redis pub/sub | BullMQ + @nestjs/bullmq | Retry logic, dead letter queues, concurrency, persistence |
| Request context | Custom AsyncLocalStorage | nestjs-cls | Integrates with NestJS DI, handles edge cases (middleware, guards) |
| OAuth flow | Manual HTTP calls to Google | passport-google-oauth20 | Token exchange, profile parsing, error handling |
| API documentation | Manual OpenAPI YAML | @nestjs/swagger | Auto-generated from decorators, stays in sync with code |
| Form validation (BE) | Manual if/else checks | class-validator + class-transformer | Declarative, consistent error format, reusable |
| i18n | Custom translation loader | @nuxtjs/i18n | Route localization, lazy loading, Vue integration |

**Key insight:** Every "simple" hand-rolled solution in auth, email, or multi-tenancy will have security holes or edge cases that established libraries handle. This is especially true for password hashing, token management, and RLS enforcement.

## Common Pitfalls

### Pitfall 1: Prisma 7 Breaking Changes
**What goes wrong:** Prisma 7 has significant changes from v6: requires driver adapters, new config file format, new client output path, schema URL moved to prisma.config.ts
**Why it happens:** Most tutorials/examples online are for Prisma 5/6
**How to avoid:** Follow the Prisma 7 upgrade guide. Use `prisma.config.ts` for datasource URL. Use `generator client { provider = "prisma-client" output = "../src/generated/prisma" }`. Install `@prisma/adapter-pg` + `pg`.
**Warning signs:** "Cannot find module '@prisma/client'" errors, adapter-related errors on PrismaClient instantiation

### Pitfall 2: RLS Bypassed by Superuser
**What goes wrong:** RLS policies are silently bypassed when connected as the `postgres` superuser
**Why it happens:** PostgreSQL design -- superusers bypass all access controls including RLS
**How to avoid:** Create a dedicated `app_user` role for the application. Use `postgres` superuser ONLY for migrations. Connection strings differ between migration and runtime.
**Warning signs:** Cross-tenant data leaking in production but tests pass (if tests use superuser)

### Pitfall 3: Docker Scaffolding Without Host Dependencies
**What goes wrong:** Running `npm init`, `npx create-nuxt-app`, etc. directly fails because host has no Node.js
**Why it happens:** User's dev environment is Docker-only
**How to avoid:** All scaffolding via `docker run --rm -v $(pwd):/app -w /app node:22 npx ...`
**Warning signs:** "command not found: npm/npx/node" errors

### Pitfall 4: Nuxt 4 app/ Directory
**What goes wrong:** Placing pages, components, composables in project root instead of `app/` directory
**Why it happens:** Nuxt 3 patterns still prevalent in tutorials and muscle memory
**How to avoid:** Always use `app/pages/`, `app/components/`, `app/composables/`, `app/stores/`
**Warning signs:** Pages not found, auto-imports not working

### Pitfall 5: Google OAuth Callback in Docker
**What goes wrong:** Google OAuth redirect_uri mismatch because the app runs inside Docker but the browser hits localhost
**Why it happens:** Container hostname differs from browser-accessible URL
**How to avoid:** Set callback URL to `http://localhost:3000/auth/google/callback` in Google Console AND in the strategy config. The API container must be accessible at localhost:3000 via port mapping.
**Warning signs:** "redirect_uri_mismatch" error from Google

### Pitfall 6: Prisma Migration with RLS SQL
**What goes wrong:** Forgetting to add RLS SQL to migration files, or modifying already-applied migrations
**Why it happens:** Prisma doesn't natively support RLS in schema -- must be added manually
**How to avoid:** Always use `prisma migrate dev --create-only`, add RLS SQL to the generated file, THEN apply. Never modify an already-applied migration.
**Warning signs:** Tables without RLS enabled, tenant data leaking

### Pitfall 7: Refresh Token Rotation Missing
**What goes wrong:** Stolen refresh tokens remain valid forever
**Why it happens:** Only implementing token generation without rotation/revocation
**How to avoid:** On each refresh, invalidate the old token and issue a new one. Store hashed tokens in DB. Implement a "revoke all" for security incidents.
**Warning signs:** No refresh_tokens table in schema, tokens never expire from DB

## Code Examples

### Prisma Schema (Core Models)
```prisma
// backend/prisma/schema.prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADOPTER
  ORG_ADMIN
  PLATFORM_ADMIN
}

enum OrgStatus {
  ACTIVE
  DEACTIVATED
}

model User {
  id              String    @id @default(uuid())
  email           String    @unique
  passwordHash    String?   // Null for OAuth-only users
  role            UserRole  @default(ADOPTER)
  emailVerified   Boolean   @default(false)
  googleId        String?   @unique
  firstName       String?
  lastName        String?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  refreshTokens   RefreshToken[]
  organization    Organization?  @relation("OrgAdmin")
  auditLogs       AuditLog[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   // Hashed
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@map("refresh_tokens")
}

model Organization {
  id            String    @id @default(uuid())
  name          String
  slug          String    @unique
  description   String?
  logoUrl       String?
  contactEmail  String?
  phone         String?
  instagram     String?
  facebook      String?
  whatsapp      String?
  status        OrgStatus @default(ACTIVE)
  adminId       String    @unique
  admin         User      @relation("OrgAdmin", fields: [adminId], references: [id])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("organizations")
}

model OrgInvite {
  id          String    @id @default(uuid())
  email       String
  token       String    @unique
  expiresAt   DateTime
  acceptedAt  DateTime?
  createdAt   DateTime  @default(now())

  @@map("org_invites")
}

model AuditLog {
  id        String   @id @default(uuid())
  action    String   // e.g., "org_invited", "org_deactivated", "user_deleted"
  details   Json?
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())

  @@map("audit_logs")
}
```

### i18n Structure (Claude's Discretion)
**Recommendation:** Flat key structure with dot-separated namespaces in JSON files.

```json
// frontend/i18n/locales/es-SV.json
{
  "common": {
    "loading": "Cargando...",
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "confirm": "Confirmar",
    "back": "Volver",
    "error": "Ocurrio un error"
  },
  "auth": {
    "login": "Iniciar sesion",
    "register": "Crear cuenta",
    "logout": "Cerrar sesion",
    "email": "Correo electronico",
    "password": "Contrasena",
    "forgotPassword": "Olvide mi contrasena",
    "resetPassword": "Restablecer contrasena",
    "verifyEmail": "Verificar correo",
    "googleLogin": "Continuar con Google",
    "linkExpired": "Este enlace ha expirado",
    "resendLink": "Enviar nuevo enlace"
  },
  "org": {
    "profile": "Perfil de la organizacion",
    "name": "Nombre",
    "description": "Descripcion",
    "contactEmail": "Correo de contacto",
    "phone": "Telefono"
  },
  "admin": {
    "dashboard": "Panel de administracion",
    "orgs": "Organizaciones",
    "users": "Usuarios",
    "invites": "Invitaciones",
    "stats": "Estadisticas"
  }
}
```

### Nuxt Config
```typescript
// frontend/nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxtjs/i18n',
  ],

  i18n: {
    locales: [
      { code: 'es-SV', name: 'Espanol (El Salvador)', file: 'es-SV.json' },
    ],
    defaultLocale: 'es-SV',
    lazy: true,
    langDir: '../i18n/locales',
    strategy: 'no_prefix',  // No /es-SV/ in URLs for MVP
  },

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3000',
    },
  },

  devtools: { enabled: true },
});
```

### Redis Usage Patterns (Claude's Discretion)
**Recommendation:**
1. **BullMQ job queues:** Email sending (verification, reset, invite). Named queue: `email`.
2. **Refresh token blacklist:** On logout or token rotation, add old token ID to a Redis SET with TTL matching token expiry. Check blacklist before accepting refresh tokens.
3. **Rate limiting (optional for Phase 1):** Could add @nestjs/throttler with Redis store, but not critical for MVP.
4. **NOT for sessions:** Sessions are stateless JWT. Redis stores job queues and blacklists only.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma 6 built-in drivers | Prisma 7 driver adapters required | Nov 2025 | Must install @prisma/adapter-pg + pg |
| Prisma .env for DATABASE_URL | prisma.config.ts for datasource | Prisma 7 | New config file format |
| Prisma @prisma/client import | Custom output path import | Prisma 7 | Import from generated path |
| NestJS Jest default | NestJS Vitest default | NestJS 11 (Jan 2025) | Use Vitest config, not Jest |
| NestJS tsc compiler | NestJS SWC default | NestJS 11 | 20x faster builds |
| Nuxt 3 root-level pages/ | Nuxt 4 app/ directory | Nuxt 4 (July 2025) | All app code in app/ |
| Nuxt UI v2 | Nuxt UI v4 (free, unified) | Sep 2025 | 125+ components, Reka UI based |
| MailHog for dev email | Mailpit | 2023+ | MailHog deprecated, Mailpit is replacement |

**Deprecated/outdated:**
- Nuxt 3: EOL July 2026 -- do not start new projects on it
- MailHog: No longer maintained -- use Mailpit
- Prisma 6 patterns: Driver adapters are mandatory in v7
- Jest in NestJS 11: Vitest is the new default

## Open Questions

1. **First user auto-admin seeding**
   - What we know: "First registered user automatically becomes platform admin" per CONTEXT.md
   - What's unclear: Whether to detect in registration flow or use a seed script
   - Recommendation: Check if any users exist during registration -- if zero users, set role to PLATFORM_ADMIN. Also provide a seed script for development.

2. **Logo upload storage for orgs**
   - What we know: Org profile includes logo
   - What's unclear: Whether to use local file storage (Docker volume) or cloud storage in Phase 1
   - Recommendation: Use local file storage (served by NestJS static files) for Phase 1. Cloud storage is introduced in Phase 2 (ANIM-03 photo uploads). Keep the upload interface abstract so it can swap backends later.

3. **Google OAuth in Docker callback URL**
   - What we know: API runs in container, browser hits localhost
   - What's unclear: Whether Google Console allows localhost callbacks for development
   - Recommendation: Google does allow `http://localhost` for development OAuth. Configure callback as `http://localhost:3000/api/auth/google/callback`. No issues expected.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (latest, SWC-powered for NestJS) |
| Config file (BE) | backend/vitest.config.ts |
| Config file (BE E2E) | backend/vitest.config.e2e.ts |
| Config file (FE) | frontend/vitest.config.ts |
| Quick run command (BE) | `docker compose exec api npx vitest run --reporter=verbose` |
| Quick run command (FE) | `docker compose exec web npx vitest run --reporter=verbose` |
| Full suite command | `docker compose exec api npx vitest run --coverage && docker compose exec web npx vitest run --coverage` |
| E2E command | `docker compose exec web npx playwright test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | User signup with email/password | unit + integration | `docker compose exec api npx vitest run src/auth/auth.service.spec.ts -t "register"` | Wave 0 |
| AUTH-02 | Email verification after signup | unit + integration | `docker compose exec api npx vitest run src/auth/auth.service.spec.ts -t "verify"` | Wave 0 |
| AUTH-03 | Password reset via email link | unit + integration | `docker compose exec api npx vitest run src/auth/auth.service.spec.ts -t "reset"` | Wave 0 |
| AUTH-04 | Session persists across refresh | integration + E2E | `docker compose exec web npx playwright test --grep "session persist"` | Wave 0 |
| AUTH-05 | Google OAuth sign-in | unit + integration | `docker compose exec api npx vitest run src/auth/strategies/google.strategy.spec.ts` | Wave 0 |
| ORG-01 | Org has profile with required fields | unit | `docker compose exec api npx vitest run src/organizations/organizations.service.spec.ts` | Wave 0 |
| ORG-02 | Admin can invite orgs | unit + integration | `docker compose exec api npx vitest run src/admin/admin.service.spec.ts -t "invite"` | Wave 0 |
| ORG-03 | Single admin per org | unit | `docker compose exec api npx vitest run src/organizations/organizations.service.spec.ts -t "admin"` | Wave 0 |
| ORG-04 | RLS tenant isolation | integration | `docker compose exec api npx vitest run src/prisma/rls.integration.spec.ts` | Wave 0 |
| INFR-01 | Docker Compose runs full stack | smoke | `docker compose up -d && docker compose ps` | Wave 0 |
| INFR-02 | Spanish-first UI | E2E | `docker compose exec web npx playwright test --grep "i18n"` | Wave 0 |
| INFR-03 | RLS enforced at DB level | integration | `docker compose exec api npx vitest run src/prisma/rls.integration.spec.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `docker compose exec api npx vitest run --reporter=verbose` (affected modules)
- **Per wave merge:** Full suite with coverage
- **Phase gate:** Full suite green + 80%+ coverage before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/vitest.config.ts` -- Vitest configuration with SWC plugin
- [ ] `backend/vitest.config.e2e.ts` -- E2E test configuration
- [ ] `frontend/vitest.config.ts` -- Frontend Vitest configuration
- [ ] `backend/src/auth/auth.service.spec.ts` -- Auth service unit tests
- [ ] `backend/src/prisma/rls.integration.spec.ts` -- RLS isolation integration tests
- [ ] `backend/test/e2e/auth.e2e.spec.ts` -- Backend auth E2E tests
- [ ] `frontend/tests/e2e/auth.spec.ts` -- Playwright auth flow E2E tests
- [ ] Framework install: All via Docker (no host deps)

## Sources

### Primary (HIGH confidence)
- [NestJS 11 announcement](https://trilon.io/blog/announcing-nestjs-11-whats-new) - SWC default, Vitest default, features
- [Prisma 7 release](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0) - Rust-free, driver adapters, TypeScript rewrite
- [Nuxt 4 announcement](https://nuxt.com/blog/v4) - app/ directory, stability focus, July 2025
- [Nuxt UI v4](https://nuxt.com/blog/nuxt-ui-v4) - Unified free library, 125+ components
- [Prisma driver adapters docs](https://www.prisma.io/docs/orm/core-concepts/supported-databases/database-drivers) - Required in Prisma 7
- [Prisma config reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference) - prisma.config.ts format
- [NestJS authentication docs](https://docs.nestjs.com/security/authentication) - Passport integration
- [NestJS queues docs](https://docs.nestjs.com/techniques/queues) - BullMQ integration
- [Mailpit GitHub](https://github.com/axllent/mailpit) - SMTP testing tool

### Secondary (MEDIUM confidence)
- [NestJS + Prisma + PostgreSQL RLS multi-tenancy](https://dev.to/moofoo/nestjspostgresprisma-multi-tenancy-using-nestjs-prisma-nestjs-cls-and-prisma-client-extensions-ok7) - nestjs-cls + Prisma extensions pattern
- [Prisma RLS with client extensions](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security) - Official Prisma example
- [Atlas RLS guide for Prisma](https://atlasgo.io/guides/orms/prisma/row-level-security) - RLS migration patterns
- [NestJS Vitest setup](https://docs.nestjs.com/recipes/swc) - Official SWC + Vitest recipe
- [Nuxt i18n docs](https://i18n.nuxtjs.org/) - Module configuration
- [@nuxtjs/i18n Nuxt UI integration](https://ui.nuxt.com/docs/getting-started/integrations/i18n/nuxt) - i18n with Nuxt UI

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are released stable versions with official documentation
- Architecture: HIGH - Patterns verified across multiple sources (official docs, Prisma examples, community guides)
- Pitfalls: HIGH - Well-documented issues (RLS superuser bypass, Prisma 7 breaking changes, Docker scaffolding)
- RLS implementation: MEDIUM - Pattern is proven but requires careful testing; subtle bugs possible with transaction handling

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable stack, 30-day validity)
