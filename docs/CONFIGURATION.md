<!-- generated-by: gsd-doc-writer -->
# Configuration

Kovia uses environment variables as its primary configuration mechanism. There are no separate config files beyond `docker-compose.yml` (development orchestration) and `nuxt.config.ts` (frontend framework). All backend variables are loaded at startup by `@nestjs/config` via `ConfigModule.forRoot()`, which reads from a `.env` file in the project root.

Copy `.env.example` to `.env` before starting the stack:

```bash
cp .env.example .env
```

---

## Environment Variables

The canonical variable list is defined in `.env.example` at the project root. The table below covers all variables discovered across the backend source, `docker-compose.yml`, and the Nuxt runtime config.

### Database

| Variable | Required | Default (dev) | Description |
|---|---|---|---|
| `DATABASE_URL` | **Required** | `postgresql://app_user:app_password@postgres:5432/kovia` | Connection string used at runtime by the API. The `app_user` role has Row-Level Security applied. |
| `MIGRATION_DATABASE_URL` | **Required** | `postgresql://postgres:postgres@postgres:5432/kovia` | Superuser connection string used by Prisma migrations only. Bypasses RLS. Also used by `prisma.config.ts`. |

`prisma.config.ts` always reads `MIGRATION_DATABASE_URL` — if this variable is absent Prisma CLI commands will fail at startup.

### Redis

| Variable | Required | Default (dev) | Description |
|---|---|---|---|
| `REDIS_URL` | **Required** | `redis://redis:6379` | Full Redis connection URL. Parsed at startup in `app.module.ts` to extract hostname and port for BullMQ. Falls back to host `redis`, port `6379` if unset. |

### Mail (SMTP)

| Variable | Required | Default | Description |
|---|---|---|---|
| `MAIL_HOST` | Optional | `mailpit` | SMTP server hostname. In development this points to the Mailpit container. |
| `MAIL_PORT` | Optional | `1025` | SMTP port. `ignoreTLS` is always `true`; switch to a TLS-enabled port for production. |

The "from" address is hardcoded to `"Kovia" <noreply@kovia.app>` in `mail.module.ts` and is not configurable via environment variable. <!-- VERIFY: confirm noreply@kovia.app is the intended production sender address -->

### Authentication — JWT

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_ACCESS_SECRET` | **Required** | _(none — must be set)_ | Signing secret for short-lived access tokens (15-minute expiry). |
| `JWT_REFRESH_SECRET` | **Required** | _(none — must be set)_ | Signing secret for refresh tokens (7-day cookie). |
| `JWT_VERIFICATION_SECRET` | Optional | Falls back to `JWT_ACCESS_SECRET` | Signing secret for email-verification tokens (1-hour expiry). If unset, `JWT_ACCESS_SECRET` is used. |

Generate secure values with:

```bash
openssl rand -base64 64
```

### Authentication — Google OAuth

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | Optional | `placeholder-client-id` | OAuth 2.0 client ID from Google Cloud Console. Leave empty to disable Google login. |
| `GOOGLE_CLIENT_SECRET` | Optional | `placeholder-client-secret` | OAuth 2.0 client secret. |

The OAuth callback URL is hardcoded to `http://localhost:3000/auth/google/callback` in `google.strategy.ts`. <!-- VERIFY: update this to the production callback URL before deploying -->

### Object Storage (S3 / MinIO)

| Variable | Required | Default (dev) | Description |
|---|---|---|---|
| `S3_ENDPOINT` | Optional | `http://minio:9000` | Internal S3 endpoint used by the API for server-side operations (delete, etc.). In Docker Compose this is the MinIO container hostname. |
| `S3_PUBLIC_ENDPOINT` | Optional | `http://localhost:9000` | Public-facing S3 endpoint used when generating presigned upload URLs. Must be reachable from the browser. |
| `S3_PUBLIC_URL` | Optional | `http://localhost:9000/kovia-animals` | Base URL for constructing public object URLs returned to clients. |
| `S3_ACCESS_KEY` | Optional | `minioadmin` | S3 / MinIO access key. |
| `S3_SECRET_KEY` | Optional | `minioadmin` | S3 / MinIO secret key. |
| `S3_BUCKET` | Optional | `kovia-animals` | S3 bucket name. Created automatically by the `createbuckets` Docker Compose service in development. |
| `S3_REGION` | Optional | `us-east-1` | S3 region identifier. MinIO ignores this value but AWS S3 requires it. |

The bucket is set to **public download** by the `createbuckets` init container in development (`mc anonymous set download`).

### Application

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_URL` | Optional | `http://localhost:3001` | Public URL of the frontend. Used to construct links in emails and as an allowed CORS origin. The backend always adds `http://localhost:3000` as a second CORS origin for Docker-internal E2E test traffic. |
| `PORT` | Optional | `3000` | Port the NestJS server listens on. |
| `NODE_ENV` | Optional | _(unset)_ | When set to `production`, the refresh-token cookie is set with `secure: true` and `sameSite: strict`. |

---

## Frontend Runtime Config (`nuxt.config.ts`)

The Nuxt frontend uses its own environment variables that are distinct from backend variables. They are declared in `frontend/nuxt.config.ts` under `runtimeConfig`.

| Variable | Side | Default | Description |
|---|---|---|---|
| `NUXT_API_INTERNAL` | Server-only | `http://api:3000` | Internal URL the Nuxt server uses for SSR proxied requests to the API. Not exposed to the browser. |
| `NUXT_PUBLIC_SCORING_DISPLAY_ENABLED` | Public (client + server) | `false` | When `'true'`, the `ScorePanel` component renders computed scores. When `false` or unset, the panel renders nothing (scores are computed but hidden during calibration). |

The public `apiUrl` is always `/api/v1` (proxied through Nuxt) and is not configurable via environment variable.

---

## Config File Locations

| File | Purpose |
|---|---|
| `.env.example` | Canonical list of root-level environment variables (copy to `.env` for development) |
| `docker-compose.yml` | Development service definitions; sets all environment variables for each container |
| `backend/prisma.config.ts` | Prisma CLI configuration; reads `MIGRATION_DATABASE_URL` for migration runs |
| `frontend/nuxt.config.ts` | Nuxt framework config; declares `runtimeConfig` keys, i18n, modules |
| `backend/vitest.config.ts` | Vitest unit test config (no env vars; uses in-process test doubles) |
| `backend/vitest.config.e2e.ts` | Vitest E2E test config |

---

## Required vs Optional at Startup

The backend will fail to connect to dependencies at startup if these are missing or incorrect (not explicit `throw` guards, but connection failures):

- `DATABASE_URL` — Prisma client cannot initialize
- `MIGRATION_DATABASE_URL` — `prisma migrate` / `prisma generate` commands fail
- `REDIS_URL` — BullMQ cannot connect; email queue will not start
- `JWT_ACCESS_SECRET` — JWT strategy will use `undefined` as the secret, causing all authenticated requests to fail

All other variables have safe in-code defaults and are truly optional in development.

---

## Per-Environment Overrides

There are no `.env.development`, `.env.production`, or `.env.test` files in the repository. Per-environment configuration is managed by:

- **Development**: `docker-compose.yml` injects all variables directly into each container's environment. The root `.env` file is not mounted into containers — it is used when running services outside Docker.
- **Production**: <!-- VERIFY: set environment variables via your hosting platform's secret manager (e.g., Railway, Fly.io, Render). Ensure NODE_ENV=production, strong JWT secrets, real S3 credentials, and the correct APP_URL and Google OAuth callback URL. -->
- **Testing**: Unit tests in `backend/src/**/*.spec.ts` use in-process mocks and do not require a running `.env`. The RLS integration spec (`backend/src/prisma/rls.integration.spec.ts`) reads `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` directly — these default to the Docker Compose postgres values.
