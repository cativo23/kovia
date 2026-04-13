# Technology Stack

**Project:** Kovia - Smart Pet Adoption Platform
**Researched:** 2026-04-08
**Overall Confidence:** HIGH

## Critical Decision: Use Nuxt 4, Not Nuxt 3

Nuxt 3 reaches end-of-life in July 2026 -- three months from now. Nuxt 4 is stable (v4.2.x), has well-documented migration paths, and is the active development target. Starting a greenfield project on Nuxt 3 would require an immediate migration. The PROJECT.md says "Nuxt 3" but the correct move is Nuxt 4 from day one.

**Impact:** Nuxt UI v4 (not v3) is the matching component library. The `app/` directory structure is now default. Some composable names changed (`useFetchNative` renamed). All modules referenced below are Nuxt 4 compatible.

---

## Recommended Stack

### Core Backend: NestJS 11

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `@nestjs/core` | ^11.1 | Application framework | SWC compiler by default (20x faster builds), JSON logging, stable ecosystem. Current major version. | HIGH |
| `@nestjs/platform-express` | ^11.1 | HTTP adapter | Express remains the default and most documented platform for NestJS. Fastify is an option but adds complexity with less middleware compatibility. | HIGH |
| `@nestjs/config` | ^4.0 | Environment config | First-party, supports `.env` files, validation, namespaced configs. Required for Docker deployments. | HIGH |
| `@nestjs/swagger` | ^11.0 | API documentation | Auto-generates OpenAPI spec from decorators. Essential for frontend-backend contract. | HIGH |

### ORM: Prisma 7

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `prisma` | ^7.7 | Schema management & migrations | Prisma 7 is rewritten in TypeScript (no Rust dependency), ships as ESM, faster cold starts. Declarative schema is ideal for multi-tenant models with `organization_id` patterns. | HIGH |
| `@prisma/client` | ^7.7 | Type-safe database client | Auto-generated types from schema. Query building is fully type-safe. Integrates naturally with NestJS DI via PrismaService pattern. | HIGH |

**Why Prisma over Drizzle or TypeORM:**
- **vs TypeORM:** TypeORM has long-standing issues with migrations, inconsistent decorator behavior, and stalled development. Prisma's declarative schema avoids "migration drift" problems.
- **vs Drizzle:** Drizzle is performant but has a smaller ecosystem, less documentation for multi-tenant patterns, and no equivalent to `@casl/prisma` for authorization integration. Prisma's ecosystem maturity wins for this project.
- **vs MikroORM:** Solid alternative but smaller community. Prisma's tooling (Studio, migration management) provides better DX for a small team.

### Authentication & Authorization

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `@nestjs/passport` | ^11.0 | Auth strategy framework | Official NestJS integration. Well-documented JWT strategy pattern. | HIGH |
| `@nestjs/jwt` | ^11.0 | JWT token management | Signs and verifies tokens. Pairs with passport-jwt strategy. | HIGH |
| `passport-jwt` | ^4.0 | JWT extraction strategy | Extracts JWT from Authorization header. Industry standard. | HIGH |
| `bcrypt` | ^6.0 | Password hashing | Battle-tested, well-understood security properties. Use `bcryptjs` if native compilation is problematic in Docker. | HIGH |
| `@casl/ability` | ^6.7 | Authorization rules engine | Isomorphic, declarative permissions. Handles RBAC for admin/org-admin/adopter roles. Future-proofs for per-org role expansion. | HIGH |
| `@casl/prisma` | ^1.6 | Prisma query filtering | Translates CASL rules into Prisma `where` clauses. Enforces authorization at the query level, not just route level. Critical for multi-tenant data isolation as a defense-in-depth layer. | HIGH |

**Why not Better Auth:** Better Auth is comprehensive but opinionated -- it wants to own the entire auth flow. For Kovia, email/password is sufficient for MVP and the app needs fine-grained control over the adoption workflow (applicant accounts, org admin accounts, platform admin). Passport + JWT gives that control.

### Validation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `class-validator` | ^0.14 | DTO validation | NestJS official recommendation. Decorator-based validation on DTOs pairs with `ValidationPipe`. | HIGH |
| `class-transformer` | ^0.5 | DTO transformation | Pairs with class-validator for automatic request body transformation. | HIGH |

**Why not Zod or Typia:** class-validator is the NestJS-native approach. It works seamlessly with `@nestjs/swagger` for auto-generated API docs. Zod requires additional wiring; Typia requires compiler plugins. For a NestJS project, class-validator is the path of least resistance with full ecosystem support.

### File Uploads & Image Processing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `@nestjs/platform-express` (Multer) | ^11.1 | File upload handling | Built-in `FileInterceptor` / `FilesInterceptor`. No additional package needed. | HIGH |
| `@aws-sdk/client-s3` | ^3.x | S3-compatible storage client | Works with AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces. S3 API is the universal standard for object storage. | HIGH |
| `sharp` | ^0.33 | Image processing | 4-5x faster than ImageMagick. Resize, compress, convert to WebP. Use as a NestJS Pipe to process uploads before storage. | HIGH |

**Storage recommendation: MinIO for development, S3-compatible provider for production.**
- MinIO runs locally in Docker alongside PostgreSQL. S3-compatible API means zero code changes when switching to production storage.
- For production: Cloudflare R2 (no egress fees, generous free tier) or AWS S3. Both work with the same `@aws-sdk/client-s3` code.
- Do NOT store images in PostgreSQL. Binary data in the DB kills performance and complicates backups.

### Events & Webhooks

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `@nestjs/event-emitter` | ^3.0 | Internal event bus | Decouples adoption workflow events (application submitted, status changed) from webhook dispatch. Built on eventemitter2. | HIGH |
| `axios` | ^1.7 | HTTP client for webhook dispatch | Send webhook payloads to n8n. Lightweight, well-maintained. Use NestJS `HttpModule` (`@nestjs/axios`) for DI integration. | MEDIUM |
| `@nestjs/axios` | ^4.0 | Axios DI wrapper | Injects HttpService for webhook dispatch. Testable via DI. | MEDIUM |

**Webhook pattern:** Application events fire via `@nestjs/event-emitter`. A `WebhookListener` service catches events and dispatches HTTP POST to the configured n8n webhook URL. This keeps webhook logic isolated from business logic.

### Database: PostgreSQL

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 16 | Primary database | Stable, battle-tested. Native JSON support for flexible scoring data. Row-Level Security for multi-tenant isolation. | HIGH |

**Multi-tenancy strategy: Application-level `organization_id` filtering + PostgreSQL Row-Level Security (RLS) as safety net.**

- Every tenant-scoped table has an `organization_id` column.
- Prisma queries always include `where: { organizationId }` via a middleware or base service method.
- RLS policies act as a defense-in-depth layer: even if application code misses a filter, the database rejects unauthorized access.
- RLS is set via `SET app.current_org_id = 'xxx'` at the start of each request (NestJS middleware sets it on the Prisma transaction).
- This avoids schema-per-tenant complexity (migration nightmare) while providing strong isolation.

---

### Core Frontend: Nuxt 4

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `nuxt` | ^4.2 | Frontend framework | SSR for public animal listings (SEO), SPA-like experience for dashboards. Nuxt 4 is the current stable release. | HIGH |
| `@nuxt/ui` | ^4.6 | UI component library | 125+ accessible components built on Reka UI + Tailwind CSS v4. Official Nuxt team project. Includes form components, modals, tables, notifications -- everything needed for the dashboard. | HIGH |
| `@nuxtjs/i18n` | ^10.2 | Internationalization | Spanish-first with English future addition. Route localization, lazy-loaded translation files, SEO meta tags per locale. | HIGH |
| `@pinia/nuxt` | ^0.9 | State management | Official Vue state management. Needed for client-side state (auth tokens, UI state, cached data). | HIGH |
| `@nuxt/image` | ^1.9 | Image optimization | Automatic image optimization, lazy loading, responsive srcset. Pairs with S3/MinIO storage for animal photos. | MEDIUM |

### Frontend Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| `@vueuse/nuxt` | ^12.0 | Composable utilities | useInfiniteScroll (animal listings), useLocalStorage, useDebounceFn (search). Avoid reinventing common patterns. | HIGH |
| `zod` | ^3.24 | Frontend form validation | Nuxt UI forms integrate with Zod for client-side validation. Keeps validation schemas shareable. | MEDIUM |

---

## Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Docker | latest | Containerization | Multi-stage builds for NestJS (build stage + slim production image). Nuxt builds to `.output/` for deployment. | HIGH |
| Docker Compose | v2 | Local development orchestration | Runs PostgreSQL 16 + MinIO + NestJS + Nuxt in development. Single `docker compose up` to start everything. | HIGH |
| PostgreSQL 16 Alpine | 16-alpine | Database container | Slim image, health checks, volume persistence. | HIGH |
| MinIO | latest | Local S3-compatible storage | Development replacement for production cloud storage. Same API, runs in Docker. | HIGH |
| Nginx | alpine | Reverse proxy (production) | Routes `/api` to NestJS, everything else to Nuxt. SSL termination. | MEDIUM |

### Docker Setup Pattern

```
docker-compose.yml (development)
  - postgres:16-alpine (port 5432)
  - minio (port 9000, console 9001)
  - nestjs-api (port 3000, hot reload via volume mount)
  - nuxt-app (port 3001, hot reload via volume mount)

Dockerfile.api (multi-stage)
  - Stage 1: node:22-alpine, install deps, build with SWC
  - Stage 2: node:22-alpine, copy dist + production node_modules only

Dockerfile.web (multi-stage)
  - Stage 1: node:22-alpine, install deps, nuxt build
  - Stage 2: node:22-alpine, copy .output/ directory
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM | Prisma 7 | Drizzle ORM | Smaller ecosystem, no @casl/prisma equivalent, less multi-tenant documentation |
| ORM | Prisma 7 | TypeORM | Stalled development, migration reliability issues, decorator-heavy API with gotchas |
| UI Framework | Nuxt UI v4 | Vuetify 3 | Heavier bundle, Material Design aesthetic harder to customize, Nuxt UI is first-party |
| UI Framework | Nuxt UI v4 | PrimeVue | Good components but not Nuxt-native. Nuxt UI's Tailwind integration is tighter |
| Auth | Passport + JWT | Better Auth | Too opinionated for custom adoption workflows. Kovia needs control over account types |
| Auth | Passport + JWT | Auth0/Clerk | External dependency, cost at scale, overkill for email/password MVP |
| Validation | class-validator | Zod (backend) | Not NestJS-native. Requires custom pipes and loses @nestjs/swagger integration |
| Storage | S3 API (MinIO/R2) | Cloudinary | Vendor lock-in, cost at scale for many animal photos, S3 API is universal |
| Multi-tenancy | RLS + app filter | Schema-per-tenant | Migration complexity multiplies per tenant. Overkill for MVP with few orgs |
| Frontend framework | Nuxt 4 | Nuxt 3 | EOL July 2026. Starting greenfield on Nuxt 3 would require immediate migration |

---

## Installation

```bash
# Backend (NestJS)
npm install @nestjs/core @nestjs/common @nestjs/platform-express @nestjs/config @nestjs/swagger
npm install @nestjs/passport @nestjs/jwt passport-jwt bcrypt
npm install @nestjs/event-emitter @nestjs/axios
npm install @casl/ability @casl/prisma
npm install @aws-sdk/client-s3 sharp
npm install class-validator class-transformer
npm install -D prisma @nestjs/cli @nestjs/testing
npm install -D @types/passport-jwt @types/bcrypt

# Frontend (Nuxt 4)
npx nuxi@latest init kovia-web
npm install @nuxt/ui @nuxtjs/i18n @pinia/nuxt @nuxt/image @vueuse/nuxt
npm install zod
```

---

## Version Verification Sources

| Technology | Source | Verified |
|------------|--------|----------|
| NestJS 11.1.x | [GitHub Releases](https://github.com/nestjs/nest/releases), [Trilon announcement](https://trilon.io/blog/announcing-nestjs-11-whats-new) | 2026-04-08 |
| Prisma 7.7.x | [npm registry](https://www.npmjs.com/package/prisma), [Prisma blog](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0) | 2026-04-08 |
| Nuxt 4.2.x | [npm registry](https://www.npmjs.com/package/nuxt), [Nuxt blog](https://nuxt.com/blog/v4) | 2026-04-08 |
| Nuxt UI 4.6.x | [npm registry](https://www.npmjs.com/package/@nuxt/ui), [Nuxt UI releases](https://ui.nuxt.com/releases) | 2026-04-08 |
| @nuxtjs/i18n 10.2.x | [npm registry](https://www.npmjs.com/package/@nuxtjs/i18n) | 2026-04-08 |
| @casl/prisma 1.6.x | [npm registry](https://www.npmjs.com/package/@casl/prisma) | 2026-04-08 |
| @nestjs/event-emitter 3.0.x | [npm registry](https://www.npmjs.com/package/@nestjs/event-emitter) | 2026-04-08 |
| PostgreSQL 16 | [PostgreSQL official](https://www.postgresql.org/) | 2026-04-08 |
