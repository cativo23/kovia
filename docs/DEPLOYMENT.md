<!-- generated-by: gsd-doc-writer -->
# Deployment

Kovia is a Docker-first application. All services — the NestJS API, Nuxt frontend, PostgreSQL database, Redis, and MinIO object storage — are defined as Docker containers. The current repository ships a `docker-compose.yml` that covers the full development stack. A production deployment requires building production images, supplying hardened environment variables, and running database migrations before starting the API.

---

## Deployment Targets

| Target | Config File | Notes |
|---|---|---|
| Docker Compose (development) | `docker-compose.yml` | Full local stack with hot-reload; not for production use |
| Docker (production) | `backend/Dockerfile`, `frontend/Dockerfile` | Build production images manually or via CI |
| Hosting platform | <!-- VERIFY: no platform config file (vercel.json, fly.toml, railway.json, etc.) detected in this repository --> | Set via platform environment variables |

No dedicated production `docker-compose.prod.yml` or CI/CD workflow file is currently committed to the repository. The sections below describe the recommended deployment steps based on the Dockerfiles and application structure.

---

## Build Pipeline

### 1. Backend — NestJS production build

The backend `Dockerfile` installs dependencies and copies source, but the default `CMD` runs the dev server (`nest start --watch`). For production, override the command to use the compiled output:

```bash
# Build the production image
docker build -t kovia-api:latest ./backend

# Or build and set production command via docker run / compose override
# The production start command is:
#   npm run start:prod  →  node dist/main
```

The compiled output is produced by `npm run build` (which runs `nest build`). The production Dockerfile should be extended or a separate stage added to run `npm run build` before `node dist/main`. <!-- VERIFY: confirm whether a multi-stage production Dockerfile is planned or whether the existing Dockerfile is extended at the platform level -->

Recommended multi-stage build pattern for production (adapt the existing `backend/Dockerfile`):

```dockerfile
FROM node:22 AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN MIGRATION_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npm install
COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
CMD ["node", "dist/main"]
```

### 2. Frontend — Nuxt build

```bash
# Build the production image
docker build -t kovia-web:latest ./frontend

# The production start command inside the container is:
#   npx nuxt build  →  node .output/server/index.mjs
#   or: nuxt preview (after nuxt build)
```

The frontend `Dockerfile` also uses the dev command by default (`npx nuxt dev`). For production, override with `npx nuxt build && node .output/server/index.mjs` or use `nuxt preview`. <!-- VERIFY: confirm whether Nuxt is deployed in SSR mode (node server) or as a static site (nuxt generate) -->

### 3. CI/CD

No CI/CD workflow files are present in this repository. <!-- VERIFY: add .github/workflows/deploy.yml or equivalent for automated builds and deployments -->

---

## Environment Setup for Production

Before starting any container in production, all required variables must be set. Refer to `docs/CONFIGURATION.md` for the full variable reference. The critical production values are:

### Database

| Variable | Production requirement |
|---|---|
| `DATABASE_URL` | `postgresql://app_user:<STRONG_PASSWORD>@<DB_HOST>:5432/kovia` — runtime connection for `app_user` (RLS applies) |
| `MIGRATION_DATABASE_URL` | `postgresql://postgres:<SUPERUSER_PASSWORD>@<DB_HOST>:5432/kovia` — superuser connection used only during migration runs |

The PostgreSQL instance must have the `app_user` role created before the API starts. The `backend/prisma/init.sql` script handles this for fresh databases:

```sql
-- Creates app_user with LOGIN privilege and grants full access to the kovia database
-- Run this once against a fresh postgres instance before deploying the API
```

Run it manually if not using the Docker Compose `initdb` entrypoint:

```bash
psql -U postgres -d kovia -f backend/prisma/init.sql
```

### Redis

| Variable | Production requirement |
|---|---|
| `REDIS_URL` | `redis://<REDIS_HOST>:6379` — or with auth: `redis://:<PASSWORD>@<REDIS_HOST>:6379` |

### Mail (SMTP)

| Variable | Production requirement |
|---|---|
| `MAIL_HOST` | Hostname of your SMTP relay (e.g., `smtp.sendgrid.net`) <!-- VERIFY --> |
| `MAIL_PORT` | `587` for TLS or `465` for SSL (dev uses Mailpit on `1025`) <!-- VERIFY --> |

### JWT Secrets

Generate unique 64-byte secrets — do not reuse development values:

```bash
openssl rand -base64 64  # run twice: one for ACCESS, one for REFRESH
```

| Variable | Production requirement |
|---|---|
| `JWT_ACCESS_SECRET` | Strong random secret (min 64 bytes). **Required.** |
| `JWT_REFRESH_SECRET` | Strong random secret, different from access secret. **Required.** |

### Google OAuth

| Variable | Production requirement |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID from Google Cloud Console <!-- VERIFY --> |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret <!-- VERIFY --> |

The OAuth callback URL in `google.strategy.ts` is currently hardcoded to `http://localhost:3000/auth/google/callback`. Update this to the production API URL before deploying. <!-- VERIFY: update google.strategy.ts callbackURL to production domain -->

### Object Storage (S3 / MinIO)

| Variable | Production requirement |
|---|---|
| `S3_ENDPOINT` | Internal S3 endpoint (e.g., `https://s3.amazonaws.com` or self-hosted MinIO URL) <!-- VERIFY --> |
| `S3_PUBLIC_ENDPOINT` | Publicly reachable endpoint used to generate presigned upload URLs <!-- VERIFY --> |
| `S3_PUBLIC_URL` | Base URL for public object access (e.g., `https://<BUCKET>.s3.<REGION>.amazonaws.com`) <!-- VERIFY --> |
| `S3_ACCESS_KEY` | IAM access key or MinIO root user |
| `S3_SECRET_KEY` | IAM secret or MinIO root password |
| `S3_BUCKET` | Bucket name (default: `kovia-animals`) |
| `S3_REGION` | AWS region (e.g., `us-east-1`); MinIO ignores this |

The bucket must allow public downloads for animal photos. Create and configure the bucket before starting the API.

### Application

| Variable | Production requirement |
|---|---|
| `APP_URL` | Public URL of the Nuxt frontend (e.g., `https://app.kovia.app`) <!-- VERIFY --> |
| `NODE_ENV` | Set to `production` — enables `secure: true` and `sameSite: strict` on the refresh-token cookie |
| `PORT` | Optional; defaults to `3000` |

### Frontend

| Variable | Production requirement |
|---|---|
| `NUXT_API_INTERNAL` | Internal URL Nuxt server uses for SSR API calls (e.g., `http://api:3000` if both run in the same Docker network, or the public API URL otherwise) |
| `NUXT_PUBLIC_SCORING_DISPLAY_ENABLED` | Set to `'true'` to show scoring panel to org admins; leave unset or `'false'` to hide during calibration |

---

## Database Migrations

Migrations are managed by Prisma and must be applied before the API starts. The migration files are in `backend/prisma/migrations/`.

### Run migrations in production

```bash
# From the backend directory (or inside the api container)
npx prisma migrate deploy
```

`prisma migrate deploy` applies all pending migrations using `MIGRATION_DATABASE_URL` (the superuser connection). It does not run `prisma generate` — ensure the Prisma client is generated during the Docker build step.

`prisma migrate deploy` is safe to run on every deployment: it is idempotent and only applies unapproved migrations.

### Migration history

| Migration | Description |
|---|---|
| `20260408203549_init` | Initial schema: users, organizations, refresh tokens, audit logs |
| `20260408210000_auth_rls_policies` | Row-Level Security policies for auth tables |
| `20260408211444_add_org_name_to_invite` | Adds `orgName` field to `org_invites` |
| `20260410012352_animals_species` | Animals and species tables |
| `20260411042344_adoption_applications` | Adoption application tables and photos |
| `20260411060000_adopter_insert_policy` | RLS insert policy for adopters |
| `20260411080000_phase4_scoring` | Scoring fields on applications (`score`, `scoreDetails`) |
| `20260411090000_fix_admin_notes_bypass_policy` | Fixes admin RLS bypass on application notes |

### Deployment order

1. Apply `init.sql` (once, on a fresh database) to create the `app_user` role.
2. Run `prisma migrate deploy` with `MIGRATION_DATABASE_URL` set.
3. Start the API container.
4. Start the frontend container.

---

## Health Checks

### PostgreSQL

The `docker-compose.yml` postgres service includes a built-in health check. The API container waits for it before starting:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]
  interval: 5s
  timeout: 3s
  retries: 5
```

### MinIO

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
  interval: 5s
  timeout: 3s
  retries: 5
```

### API application health

The NestJS API exposes a root `GET /` endpoint that returns `Hello World!` (implemented in `AppController`). This can be used as a basic liveness probe. No dedicated `/health` endpoint is currently implemented. <!-- VERIFY: consider adding a dedicated health endpoint (e.g., GET /health) that checks database and Redis connectivity before deploying to a load-balanced environment -->

Swagger documentation is available at `GET /api/docs` once the API is running.

---

## Rollback Procedure

There is no automated rollback pipeline configured in this repository. The recommended manual approach:

1. **Redeploy the previous image tag** — restart the API and frontend containers using the last known-good Docker image.
2. **Database rollback** — Prisma does not support automatic rollback of applied migrations. To revert a migration:
   a. Identify the target migration in `backend/prisma/migrations/`.
   b. Manually apply the inverse SQL against the database using `psql`.
   c. Remove the migration entry from the `_prisma_migrations` table.
   <!-- VERIFY: validate rollback procedure with your hosting platform before relying on it in production -->

---

## Monitoring

No monitoring library (`@sentry/*`, `dd-trace`, `newrelic`, `@opentelemetry/*`) is declared in `backend/package.json` or `frontend/package.json`. Application logs are written to stdout/stderr by NestJS default logging and are captured by the container runtime.

<!-- VERIFY: integrate an observability solution (e.g., Sentry, Datadog, OpenTelemetry) before going to production to capture runtime errors and performance metrics -->
