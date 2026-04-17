<!-- generated-by: gsd-doc-writer -->
# Kovia

Smart pet adoption platform connecting rescue organizations with adopters.

## Overview

Kovia is a full-stack web application that streamlines the pet adoption process for animal rescue organizations and prospective adopters. Organizations manage their animal listings and evaluate adoption applications through an automated scoring engine; adopters browse available animals, submit applications with housing and lifestyle information, and track their application status.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | NestJS 11, TypeScript, Prisma 7, PostgreSQL 16 |
| Frontend | Nuxt 4, Vue 3, Nuxt UI 4, Pinia, Zod |
| Queue | BullMQ + Redis 7 |
| Storage | MinIO (S3-compatible) |
| Email | Nodemailer + Mailpit (dev) |
| Auth | JWT (access + refresh), Google OAuth 2.0 |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

No local Node.js, database, or other runtime installation is required. All services run in Docker.

## Quick Start

1. Clone the repository:

```bash
git clone <repository-url>
cd kovia
```

2. Start all services:

```bash
docker compose up
```

3. The following services are now running:

| Service | URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:3000 |
| API docs (Swagger) | http://localhost:3000/api/docs |
| MinIO console | http://localhost:9001 |
| Mailpit (email UI) | http://localhost:8025 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6380 |

Default MinIO credentials: `minioadmin` / `minioadmin`

## Architecture

```
frontend (Nuxt 4)          backend (NestJS)
   :3001           ──►        :3000
                           │
                    ┌──────┴──────┐
                    │             │
               PostgreSQL       Redis
                 :5432       (BullMQ queue)
                    │
                  MinIO
                 :9000/:9001
```

### Backend Modules

| Module | Purpose |
|---|---|
| `auth` | JWT auth, Google OAuth, email verification, password reset |
| `users` | User accounts (ADOPTER, ORG_ADMIN, PLATFORM_ADMIN roles) |
| `organizations` | Rescue org profiles, invite flow |
| `animals` | Animal listings with photos, traits, and status management |
| `applications` | Adoption application lifecycle |
| `scoring` | Automated application scoring engine |
| `application-notes` | Internal notes on applications for org admins |
| `admin` | Platform admin: user/org/invite management |
| `upload` | S3 presigned URL generation for photo uploads |
| `mail` | Transactional email via Handlebars templates |
| `audit` | Audit log for admin actions |
| `tenant` | Request-scoped organization context via CLS |

### User Roles

- **ADOPTER** — Browse animals, submit and manage adoption applications
- **ORG_ADMIN** — Manage organization profile, animals, and review applications
- **PLATFORM_ADMIN** — Manage all organizations, users, and platform invites

### Scoring Engine

Adoption applications are automatically scored (0–100) across weighted categories:

- Housing and environment (25 pts)
- Experience and lifestyle (25 pts)
- Motivation and commitment (25 pts)
- Supporting evidence (25 pts)

Scores include red-flag detection and risk-level classification. Score display can be toggled via the `NUXT_PUBLIC_SCORING_DISPLAY_ENABLED` environment variable for calibration purposes.

## Development

All commands run inside Docker containers via `docker compose`.

### Rebuild after dependency changes

```bash
docker compose build
docker compose up
```

### Run database migrations

```bash
docker compose exec api npm run prisma:migrate
```

### Generate Prisma client

```bash
docker compose exec api npm run prisma:generate
```

### Backend scripts

| Command | Description |
|---|---|
| `npm run start:dev` | Start with file watching (used in Docker by default) |
| `npm run build` | Compile TypeScript |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npm run test` | Run unit tests (Jest) |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:e2e` | Run end-to-end tests |

### Frontend scripts

| Command | Description |
|---|---|
| `nuxt dev` | Start dev server with hot reload (used in Docker by default) |
| `nuxt build` | Build for production |
| `nuxt generate` | Static site generation |
| `nuxt preview` | Preview production build |

## Environment Variables

The `docker-compose.yml` file ships with working development defaults. Key variables:

### Backend (`api` service)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://app_user:app_password@postgres:5432/kovia` | Application DB connection |
| `MIGRATION_DATABASE_URL` | `postgresql://postgres:postgres@postgres:5432/kovia` | Migration DB connection (superuser) |
| `REDIS_URL` | `redis://redis:6379` | Redis connection for BullMQ |
| `JWT_ACCESS_SECRET` | `dev-access-secret-kovia-2026` | Access token signing secret |
| `JWT_REFRESH_SECRET` | `dev-refresh-secret-kovia-2026` | Refresh token signing secret |
| `GOOGLE_CLIENT_ID` | _(empty)_ | Google OAuth client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | _(empty)_ | Google OAuth client secret (optional) |
| `APP_URL` | `http://localhost:3001` | Frontend URL (for CORS and email links) |
| `S3_ENDPOINT` | `http://minio:9000` | S3-compatible storage endpoint |
| `S3_ACCESS_KEY` | `minioadmin` | S3 access key |
| `S3_SECRET_KEY` | `minioadmin` | S3 secret key |
| `S3_BUCKET` | `kovia-animals` | Default storage bucket |
| `S3_PUBLIC_URL` | `http://localhost:9000/kovia-animals` | Public URL for stored assets |
| `MAIL_HOST` | `mailpit` | SMTP host |
| `MAIL_PORT` | `1025` | SMTP port |

### Frontend (`web` service)

| Variable | Default | Description |
|---|---|---|
| `NUXT_API_INTERNAL` | `http://api:3000` | Backend URL for SSR requests |
| `NUXT_PUBLIC_SCORING_DISPLAY_ENABLED` | `true` | Show/hide scoring UI for adopters |

## Testing

### Backend unit tests

```bash
docker compose exec api npm run test
```

### Backend unit tests with coverage

```bash
docker compose exec api npm run test:cov
```

### Backend E2E tests

```bash
docker compose exec api npm run test:e2e
```

### Frontend component tests (Vitest)

```bash
docker compose exec web npx vitest run
```

### Frontend E2E tests (Playwright)

```bash
docker compose exec web npx playwright test
```

## License

Private — all rights reserved.
