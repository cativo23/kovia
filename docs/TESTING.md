<!-- generated-by: gsd-doc-writer -->
# Testing

Kovia uses a layered testing strategy across two workspaces:

- **Backend** (`backend/`) — Vitest unit tests for NestJS services, plus a Vitest-based RLS integration suite that requires a live PostgreSQL instance. Jest is also scaffolded in `package.json` for end-to-end NestJS tests but Vitest is the active runner for unit tests.
- **Frontend** (`frontend/`) — Vitest unit tests for Vue components, Pinia stores, composables, and middleware; Playwright end-to-end tests for full browser flows.

All tests run inside Docker. The host machine has no required runtime dependencies.

---

## Test Frameworks and Setup

### Backend

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | `^4.1.3` | Unit tests for NestJS services |
| `@vitest/coverage-v8` | `^4.1.3` | Coverage collection |
| `unplugin-swc` | `^1.5.9` | SWC transpiler plugin for Vitest |
| Jest / `ts-jest` | `^30.0.0` / `^29.2.5` | NestJS e2e test runner (configured via `test/jest-e2e.json`) |
| `@nestjs/testing` | `^11.0.1` | NestJS `TestingModule` utilities |
| Supertest | `^7.0.0` | HTTP assertion helper for e2e tests |

Configuration: `backend/vitest.config.ts`

```ts
// backend/vitest.config.ts
test: {
  globals: true,
  root: './',
  include: ['src/**/*.spec.ts'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov'],
    include: ['src/**/*.ts'],
    exclude: [
      'src/generated/**',
      'src/**/*.spec.ts',
      'src/**/*.module.ts',
      'src/main.ts',
    ],
  },
}
```

### Frontend

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | `^4.1.3` | Unit tests for components, stores, composables, middleware |
| `@vitest/coverage-v8` | `^4.1.3` | Coverage collection |
| `@vue/test-utils` | `^2.4.6` | Vue component mounting utilities |
| `happy-dom` | `^20.8.9` | DOM environment for Vitest |
| Playwright | `^1.59.1` | End-to-end browser automation |

Configuration: `frontend/vitest.config.ts` and `frontend/playwright.config.ts`

```ts
// frontend/vitest.config.ts
test: {
  globals: true,
  environment: 'happy-dom',
  setupFiles: ['./tests/setup.ts'],
  include: ['app/**/*.spec.ts', 'tests/unit/**/*.spec.ts'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov'],
    include: ['app/**/*.vue', 'app/**/*.ts'],
    exclude: ['app/**/*.spec.ts'],
  },
}
```

---

## Running Tests

All commands must be run inside the Docker container unless otherwise noted.

### Backend Unit Tests

```bash
# Run all unit tests
docker compose exec api npx vitest run

# Run tests in watch mode
docker compose exec api npx vitest

# Run tests with coverage report
docker compose exec api npx vitest run --coverage
```

The backend `package.json` includes a `test:e2e` script referencing `./test/jest-e2e.json`, but the `backend/test/` directory and that config file have not been created yet:

```bash
# Run NestJS e2e tests (requires running services)
docker compose exec api npm run test:e2e
```

### Backend RLS Integration Tests

The RLS integration suite (`src/prisma/rls.integration.spec.ts`) validates PostgreSQL Row-Level Security tenant isolation. It requires a live PostgreSQL instance with the `app_user` role and migrations applied.

```bash
# Run RLS integration tests (inside the api container with postgres available)
docker compose exec api npx vitest run src/prisma/rls.integration.spec.ts
```

Environment variables read by RLS tests:

| Variable | Default |
|----------|---------|
| `DB_HOST` | `postgres` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `kovia` |
| `DB_USER` | `postgres` |
| `DB_PASSWORD` | `postgres` |

### Frontend Unit Tests

```bash
# Run all unit tests
docker compose exec web npx vitest run

# Run tests in watch mode
docker compose exec web npx vitest

# Run tests with coverage report
docker compose exec web npx vitest run --coverage
```

### Frontend End-to-End Tests (Playwright)

E2E tests target a fully running stack (Nuxt frontend + NestJS API + PostgreSQL + Mailpit). They run in serial mode against Chromium.

```bash
# Run all E2E tests inside the web container (Docker-internal URLs)
docker compose exec web npx playwright test

# Run a specific E2E test file
docker compose exec web npx playwright test tests/e2e/auth.spec.ts

# Run with trace on failure
docker compose exec web npx playwright test --trace on
```

Playwright configuration (`frontend/playwright.config.ts`):

| Setting | Value |
|---------|-------|
| `testDir` | `./tests/e2e` |
| `baseURL` | `http://localhost:3000` (override with `PLAYWRIGHT_BASE_URL`) |
| Browser | Chromium (Desktop Chrome) |
| Timeout | 30 000 ms per test |
| `fullyParallel` | `false` |
| `workers` | `1` |
| Retries (non-CI) | `1` |

E2E tests for auth flows use Mailpit (`http://mailpit:8025` inside Docker) to intercept verification and password-reset emails.

---

## Test File Naming Conventions

### Backend

- Pattern: `src/**/*.spec.ts`
- One spec file per service (e.g., `auth.service.spec.ts` alongside `auth.service.ts`)
- Integration specs use the same `.spec.ts` suffix (e.g., `rls.integration.spec.ts`)

Current spec files under `backend/src/`:

```
src/app.controller.spec.ts
src/admin/admin.service.spec.ts
src/adopters/adopters.service.spec.ts
src/animals/animals.service.spec.ts
src/application-notes/application-notes.service.spec.ts
src/applications/applications.service.spec.ts
src/auth/auth.service.spec.ts
src/auth/strategies/google.strategy.spec.ts
src/organizations/organizations.service.spec.ts
src/prisma/rls.integration.spec.ts
src/scoring/engine.spec.ts
src/species/species.service.spec.ts
src/upload/upload.service.spec.ts
src/users/users.service.spec.ts
```

### Frontend

- **Unit tests**: `tests/unit/**/*.spec.ts` (mirrors the `app/` source structure)
- **E2E tests**: `tests/e2e/**/*.spec.ts`
- Vue component specs may also live at `app/**/*.spec.ts`

Current test files under `frontend/tests/`:

```
tests/unit/components/animals/StatusBadge.spec.ts
tests/unit/composables/useApi.spec.ts
tests/unit/middleware/auth.spec.ts
tests/unit/stores/auth.spec.ts
tests/e2e/auth.spec.ts
tests/e2e/animals.spec.ts
```

---

## Writing New Tests

### Backend Service Tests

Use NestJS `TestingModule` with Vitest. Inject mocked dependencies using `vi.fn()` objects passed as providers.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';

const mockPrismaService = {
  myModel: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
};

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MyService>(MyService);
    vi.clearAllMocks();
  });

  it('returns items', async () => {
    mockPrismaService.myModel.findMany.mockResolvedValue([]);
    const result = await service.findAll('org-id');
    expect(result).toEqual([]);
  });
});
```

Key patterns in use across the codebase:
- External AWS SDK calls are mocked with `vi.mock('@aws-sdk/client-s3', ...)`
- `bcrypt` is mocked with `vi.mock('bcrypt', ...)`
- Prisma RLS service (`PrismaRlsService`) is mocked as a plain object with `vi.fn()` methods

### Frontend Unit Tests

#### Stores (Pinia)

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMyStore } from '~/stores/myStore';

describe('MyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('does something', () => {
    const store = useMyStore();
    expect(store.someState).toBe(expectedValue);
  });
});
```

#### Vue Components

```ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MyComponent from '~/components/MyComponent.vue';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const wrapper = mount(MyComponent, {
      props: { someProp: 'value' },
      global: {
        stubs: { UButton: true }, // stub Nuxt UI components
      },
    });
    expect(wrapper.text()).toContain('expected text');
  });
});
```

#### Global Mocks (Setup File)

`frontend/tests/setup.ts` stubs all Nuxt auto-imports unavailable in the test environment. It is loaded automatically via `setupFiles` in `vitest.config.ts`. Globals it provides:

- `useRuntimeConfig` — returns `{ public: { apiUrl: 'http://localhost:3000' } }`
- `navigateTo`, `useNuxtApp`, `$fetch` — mocked with `vi.fn()`
- `defineNuxtRouteMiddleware` — passthrough (returns the function as-is)
- `useI18n` — returns `{ t: (key) => key }`
- `useToast`, `useRoute` — mocked with `vi.fn()`
- Vue composition API globals (`ref`, `computed`, `reactive`, etc.)
- `definePageMeta` — no-op

When testing code that calls additional Nuxt auto-imports, add the stub to `tests/setup.ts` or use `vi.stubGlobal()` at the top of your spec file.

### Frontend E2E Tests

E2E tests use the Playwright `test` and `expect` helpers. Each E2E file creates its own test data via API calls or UI flows and cleans up via Mailpit or direct API calls.

```ts
import { test, expect } from '@playwright/test';

test('user can do something', async ({ page }) => {
  await page.goto('/my-page');
  await page.getByRole('button', { name: 'Click me' }).click();
  await expect(page.getByText('Success')).toBeVisible({ timeout: 15_000 });
});
```

Auth E2E tests use a Mailpit helper to read transactional emails:

- Mailpit UI: `http://localhost:8025` (host) / `http://mailpit:8025` (inside Docker)
- Override with `MAILPIT_URL` environment variable

---

## Coverage Requirements

The project targets **80% or higher coverage** across both frontend and backend. No automated threshold is enforced in the Vitest config files today — the 80% target is a project standard and contributors are expected to maintain it.

Coverage reporters configured: `text` (console summary) and `lcov` (for CI integration).

**Backend** — excluded from coverage measurement:
- `src/generated/**` (Prisma generated client)
- `src/**/*.spec.ts` (test files)
- `src/**/*.module.ts` (NestJS module wiring)
- `src/main.ts` (bootstrap entry point)

**Frontend** — coverage measured over:
- `app/**/*.vue`
- `app/**/*.ts`

Run coverage reports:

```bash
# Backend
docker compose exec api npx vitest run --coverage

# Frontend
docker compose exec web npx vitest run --coverage
```

---

## CI Integration

No CI/CD pipeline (`.github/workflows/`) is present in the repository at this time. Tests are run manually inside Docker during development.

<!-- VERIFY: CI pipeline details if added in the future -->

---

## Next Steps

- See [DEVELOPMENT.md](DEVELOPMENT.md) for local setup and Docker usage.
- See [CONFIGURATION.md](CONFIGURATION.md) for environment variables required by the running stack.
