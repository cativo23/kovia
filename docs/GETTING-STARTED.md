<!-- generated-by: gsd-doc-writer -->
# Getting Started

This guide takes you from a fresh clone to a fully running local development stack.

---

## Prerequisites

The only tools you need on your host machine are:

- **Docker** >= 20.10 — [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** plugin >= 2.0 — included with Docker Desktop; verify with `docker compose version`
- **Git**

No local Node.js, PostgreSQL, Redis, or other runtime installation is required. All services — backend API, frontend, database, queue, object storage, and email — run inside Docker containers.

---

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd kovia
```

### 2. Copy the environment file

```bash
cp .env.example .env
```

The `.env` file is used when running services outside of Docker. For Docker Compose development the environment is injected directly from `docker-compose.yml`, which ships with working defaults for every service. You do not need to edit `.env` to do your first run.

See [CONFIGURATION.md](CONFIGURATION.md) for a full reference of every environment variable.

### 3. Build and start all services

```bash
docker compose up --build
```

The first run downloads base images and builds both the `api` (NestJS) and `web` (Nuxt) containers. Subsequent starts are faster:

```bash
docker compose up
```

---

## First Run

Docker Compose starts seven services in the correct dependency order:

| Service | URL | Credentials |
|---|---|---|
| Frontend (Nuxt 4) | http://localhost:3001 | — |
| Backend API (NestJS) | http://localhost:3000 | — |
| API docs (Swagger) | http://localhost:3000/api/docs | — |
| PostgreSQL 16 | localhost:5432 | `postgres` / `postgres` |
| Redis 7 | localhost:6380 | — |
| MinIO console | http://localhost:9001 | `minioadmin` / `minioadmin` |
| Mailpit (email UI) | http://localhost:8025 | — |

The `api` container waits for PostgreSQL and MinIO to pass their health checks before starting. The `createbuckets` init container automatically creates the `kovia-animals` bucket in MinIO with public download access.

**Database migrations run automatically** when the `api` container starts — no manual migration step is needed on first run.

Wait until you see output like this in the `api` logs before opening the browser:

```
[NestApplication] Nest application successfully started +Xms
```

Then open http://localhost:3001.

---

## Creating Your First Admin Account

The first user to register on a fresh database is automatically assigned the `PLATFORM_ADMIN` role. This bootstrap mechanism is implemented in `backend/src/auth/auth.service.ts`:

```
POST /auth/register  →  if userCount === 0, role = PLATFORM_ADMIN
```

To create the platform admin account:

1. Open http://localhost:3001
2. Click **Registrarse** (Register)
3. Fill in your name, email, and password
4. Check Mailpit at http://localhost:8025 for the verification email and click the link to verify your account

After email verification you are logged in as `PLATFORM_ADMIN` and have access to the admin dashboard.

Every subsequent registration defaults to the `ADOPTER` role. Organization admins are provisioned via an invite flow from the platform admin dashboard.

---

## Onboarding a Rescue Organization

Once logged in as `PLATFORM_ADMIN`:

1. Navigate to the admin dashboard
2. Create an invite for the organization admin's email address (`POST /admin/invites`)
3. The invitee receives an email (visible in Mailpit during development)
4. The invitee registers a regular account, then redeems the invite token via `POST /organizations/claim-invite`
5. The invitee's role is promoted to `ORG_ADMIN` — they must refresh their tokens (`POST /auth/refresh`) to receive the updated role in the JWT
6. The `ORG_ADMIN` completes their organization profile (`POST /organizations`)

---

## Common Setup Issues

**Container fails to start because PostgreSQL is not ready**

The `api` and `web` containers wait for the `postgres` health check (`pg_isready -U postgres`, interval 5 s, up to 5 retries). If the API starts before PostgreSQL is fully initialized, Docker Compose restarts it automatically. Wait 20-30 seconds after `docker compose up` before checking logs.

**Port conflict on 5432, 3000, 3001, 6380, 9000, or 8025**

Stop any local PostgreSQL, Redis, or other processes using those ports, then rerun `docker compose up`. You can also change the host-side port mapping in `docker-compose.yml` without affecting the services (e.g., change `"5432:5432"` to `"5433:5432"`).

**MinIO bucket not created / photo uploads fail**

The `createbuckets` init container creates the `kovia-animals` bucket on first start. If it exited before MinIO was healthy, rerun it:

```bash
docker compose run --rm createbuckets
```

**JWT_ACCESS_SECRET or JWT_REFRESH_SECRET warnings**

`docker-compose.yml` sets safe development defaults (`dev-access-secret-kovia-2026` / `dev-refresh-secret-kovia-2026`). These are intentionally insecure — replace them with strong secrets for any non-local environment. Generate new secrets with:

```bash
openssl rand -base64 64
```

**Dependency changes (after pulling new code)**

If `package.json` in either `backend/` or `frontend/` changed, rebuild the affected image:

```bash
docker compose build api   # or: docker compose build web
docker compose up
```

**Frontend shows stale data after schema changes**

Run Prisma migrations and regenerate the client:

```bash
docker compose exec api npm run prisma:migrate
docker compose exec api npm run prisma:generate
```

---

## Verifying Your Setup

Run the backend unit test suite to confirm the environment is healthy:

```bash
docker compose exec api npm run test
```

You can also hit the health endpoint directly:

```bash
curl http://localhost:3000/
```

And confirm the Swagger UI loads at http://localhost:3000/api/docs.

---

## Next Steps

- **[README.md](../README.md)** — Project overview, tech stack, and all available scripts
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — System design, component diagram, data flow, and key abstractions
- **[CONFIGURATION.md](CONFIGURATION.md)** — Full environment variable reference for all services
