<!-- generated-by: gsd-doc-writer -->
# Development

This guide covers the day-to-day development workflow for Kovia. All tooling runs inside Docker — no local Node.js, PostgreSQL, Redis, or other runtime installation is required on the host machine.

Before reading this doc, complete the initial setup described in [GETTING-STARTED.md](GETTING-STARTED.md). For environment variable reference see [CONFIGURATION.md](CONFIGURATION.md), and for architectural context see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Local Setup

### 1. Start the full stack

```bash
docker compose up
```

The first run builds both the `api` (NestJS) and `web` (Nuxt) containers, then starts all seven services. Subsequent starts skip the build step. To force a rebuild after dependency changes:

```bash
docker compose build
docker compose up
```

### 2. Running services

| Service | URL | Notes |
|---|---|---|
| Frontend (Nuxt 4) | http://localhost:3001 | Hot-reload via `nuxt dev` |
| Backend API (NestJS) | http://localhost:3000 | File-watching via `nest start --watch` |
| Swagger UI | http://localhost:3000/api/docs | Auto-generated from decorators |
| MinIO console | http://localhost:9001 | Credentials: `minioadmin` / `minioadmin` |
| Mailpit (email UI) | http://localhost:8025 | Captures all outbound email in dev |
| PostgreSQL | localhost:5432 | User: `postgres` / `postgres` |
| Redis | localhost:6380 | BullMQ broker |

### 3. Hot reload

Both services start in watch mode by default inside their containers:

- **Backend** — `nest start --watch` (defined in `backend/Dockerfile` CMD). NestJS recompiles TypeScript automatically on file save. The `backend/` directory is volume-mounted, so edits on the host are reflected immediately inside the container.
- **Frontend** — `nuxt dev --host 0.0.0.0` (defined in `frontend/Dockerfile` CMD). Nuxt HMR propagates Vue/TypeScript changes to the browser without a page reload. The `frontend/` directory is volume-mounted.

`node_modules` is excluded from the host volume mount (`/app/node_modules` anonymous volume), so container-installed packages are not overridden by the host.

---

## Build Commands

### Backend

All backend commands run inside the `api` container via `docker compose exec api <command>`.

| Command | Script | Description |
|---|---|---|
| `docker compose exec api npm run start:dev` | `nest start --watch` | Dev server with file watching (started automatically by Docker) |
| `docker compose exec api npm run start:debug` | `nest start --debug --watch` | Dev server with Node.js inspector on port 9229 |
| `docker compose exec api npm run build` | `nest build` | Compile TypeScript to `backend/dist/` using SWC |
| `docker compose exec api npm run lint` | `eslint ... --fix` | Run ESLint with auto-fix on `src/` and `test/` |
| `docker compose exec api npm run format` | `prettier --write ...` | Format all `.ts` files in `src/` and `test/` |
| `docker compose exec api npm run test` | `jest` | Run all unit tests |
| `docker compose exec api npm run test:watch` | `jest --watch` | Run unit tests in watch mode |
| `docker compose exec api npm run test:cov` | `jest --coverage` | Run unit tests with coverage report |
| `docker compose exec api npm run test:e2e` | `jest --config ./test/jest-e2e.json` | Run E2E tests (requires live database) — note: `backend/test/jest-e2e.json` is referenced in `package.json` but has not been created yet |
| `docker compose exec api npm run prisma:generate` | `prisma generate` | Re-generate the Prisma client into `src/generated/prisma/` |
| `docker compose exec api npm run prisma:migrate` | `prisma migrate dev` | Create and apply a new migration (dev only) |
| `docker compose exec api npm run prisma:migrate:deploy` | `prisma migrate deploy` | Apply pending migrations without creating new ones (CI/prod) |

The NestJS build uses SWC (`unplugin-swc`) for fast compilation. Type checking (`tsc --noEmit`) is separate from the build step — run `npx tsc --noEmit` inside the container if you need a full type check pass.

### Frontend

All frontend commands run inside the `web` container via `docker compose exec web <command>`.

| Command | Description |
|---|---|
| `docker compose exec web npx nuxt dev` | Dev server with HMR (started automatically by Docker) |
| `docker compose exec web npx nuxt build` | Production build into `frontend/.output/` |
| `docker compose exec web npx nuxt generate` | Static site generation |
| `docker compose exec web npx nuxt preview` | Serve the production build locally |
| `docker compose exec web npx vitest run` | Run Vitest unit tests once |
| `docker compose exec web npx vitest` | Run Vitest unit tests in watch mode |
| `docker compose exec web npx playwright test` | Run Playwright E2E tests |

---

## Code Style

### Backend

The backend uses **ESLint** (flat config) and **Prettier**, configured together via `eslint-plugin-prettier`.

- ESLint config: `backend/eslint.config.mjs`
- Ruleset: `typescript-eslint` recommended type-checked rules + `eslint-plugin-prettier/recommended`
- Notable rule overrides:
  - `@typescript-eslint/no-explicit-any` — off
  - `@typescript-eslint/no-floating-promises` — warn
  - `@typescript-eslint/no-unsafe-argument` — warn
  - `prettier/prettier` — error (enforces consistent line endings)

Run lint and auto-fix:

```bash
docker compose exec api npm run lint
```

Run formatting:

```bash
docker compose exec api npm run format
```

TypeScript is configured strictly (`"strict": true` in `backend/tsconfig.json`). Path aliases are defined:

- `@/*` maps to `./src/*`
- `@generated/*` maps to `./src/generated/*`

### Frontend

The frontend has no dedicated ESLint or Prettier config file — code style is enforced via TypeScript strict mode in `frontend/tsconfig.json` and Nuxt's built-in defaults. When adding explicit linting to the frontend, follow the same ESLint + Prettier pattern used in the backend.

---

## Debugging

### Backend debugging

Start the backend with the Node.js inspector enabled:

```bash
docker compose exec api npm run start:debug
```

The `--debug` flag opens the Node.js inspector on `0.0.0.0:9229` inside the container. To connect from the host you must expose port `9229` in `docker-compose.yml` (not exposed by default):

```yaml
# docker-compose.yml — api service
ports:
  - "3000:3000"
  - "9229:9229"   # add this line for debug sessions
```

Then attach VS Code using the `Node.js: Attach` launch configuration pointing to `localhost:9229`.

### Inspecting logs

Stream logs from a specific service:

```bash
docker compose logs -f api
docker compose logs -f web
```

### Accessing a container shell

```bash
docker compose exec api sh
docker compose exec web sh
docker compose exec postgres psql -U postgres kovia
```

### Mailpit

All transactional emails (verification, password reset, invitations) are captured by Mailpit and never sent to real recipients in development. View them at http://localhost:8025.

---

## Database Migrations

Kovia uses **Prisma Migrate**. The schema lives in `backend/prisma/schema.prisma`. Migrations are stored in `backend/prisma/migrations/`.

`prisma.config.ts` reads `MIGRATION_DATABASE_URL` (the superuser connection) — this is required for Prisma CLI commands. In Docker Compose the variable is already set.

### Create a new migration

```bash
docker compose exec api npm run prisma:migrate
```

Prisma will prompt for a migration name. A new timestamped directory is created under `backend/prisma/migrations/`. The migration is applied immediately to the development database.

### Apply existing migrations (CI / production)

```bash
docker compose exec api npm run prisma:migrate:deploy
```

### Re-generate the Prisma client

After any schema change, regenerate the client so TypeScript types stay in sync:

```bash
docker compose exec api npm run prisma:generate
```

The generated output goes to `backend/src/generated/prisma/`. Do not edit files in this directory — they are overwritten on every `prisma generate` run.

### Reset the database (development only)

```bash
docker compose exec api npx prisma migrate reset
```

This drops the database, recreates it, applies all migrations, and optionally runs seed scripts. Useful when you want a clean slate during active schema development.

---

## Adding a Backend Module

NestJS modules follow a consistent structure. Use the NestJS CLI (available inside the container) to scaffold a new module:

```bash
docker compose exec api npx nest generate module <module-name>
docker compose exec api npx nest generate service <module-name>
docker compose exec api npx nest generate controller <module-name>
```

This creates `backend/src/<module-name>/` with `*.module.ts`, `*.service.ts`, and `*.controller.ts` files. Then:

1. Register the new module in `backend/src/app.module.ts` under `imports:`.
2. Add a `dto/` subdirectory for request and response shapes using `class-validator` decorators.
3. Inject `PRISMA_RLS` (not `PrismaService` directly) for any database access that must respect row-level security:

```typescript
constructor(
  @Inject(PRISMA_RLS) private readonly prisma: PrismaClient,
) {}
```

4. Use the `@Roles(UserRole.ORG_ADMIN)` decorator on controller routes that require role authorization.
5. Mark public endpoints with `@Public()` from `backend/src/common/decorators/`.
6. Write a `*.service.spec.ts` test file alongside the service.

---

## Adding a Frontend Page

Nuxt 4 uses file-based routing under `frontend/app/pages/`. To add a new page:

1. Create the `.vue` file at the appropriate path under `frontend/app/pages/`. For example, `frontend/app/pages/org/reports.vue` becomes `/org/reports`.
2. Specify the layout at the top of the file:

```vue
<script setup lang="ts">
definePageMeta({ layout: 'org' })
</script>
```

Available layouts are `default`, `auth`, `org`, and `admin` in `frontend/app/layouts/`.

3. Add a route guard middleware if the page requires authentication or a specific role:

```vue
definePageMeta({
  layout: 'org',
  middleware: ['auth', 'org'],
})
```

4. Use the `useApi` composable for API calls:

```typescript
const { data, error } = await useApi('/endpoint', { method: 'GET' })
```

5. Add i18n strings for any user-facing text to `frontend/i18n/locales/es-SV.json`.

---

## Adding a Frontend Component

Components live in `frontend/app/components/` grouped by domain (`animals/`, `applications/`, `brand/`). Because `nuxt.config.ts` sets `pathPrefix: false`, components are auto-imported by filename without namespace prefix.

1. Create `frontend/app/components/<domain>/<ComponentName>.vue`.
2. No import statement is needed — Nuxt auto-imports it by the filename `<ComponentName>`.
3. Write props using the TypeScript `defineProps` pattern with Zod or inline types.
4. Add a `*.spec.ts` test file if the component has non-trivial logic.

---

## Branch Conventions

No branch naming convention is formally documented in the repository. The following conventions are recommended based on the commit history style:

- Feature branches: `feat/<short-description>`
- Bug fixes: `fix/<short-description>`
- Documentation: `docs/<short-description>`
- Refactors: `refactor/<short-description>`

The default and main branch is `main`.

---

## PR Process

1. Create a branch from `main` using the naming convention above.
2. Keep changes focused — one feature or fix per PR.
3. Ensure the backend linter passes: `docker compose exec api npm run lint`.
4. Ensure all unit tests pass: `docker compose exec api npm run test`.
5. For schema changes, include the generated migration file and updated Prisma client.
6. Write or update spec files (`*.spec.ts`) covering any new service logic.
7. Open a pull request against `main` and request review.

No formal PR template or code of conduct file exists in the repository at this time.
