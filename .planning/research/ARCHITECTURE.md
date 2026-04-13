# Architecture Patterns

**Domain:** Pet Adoption Management Platform (Multi-tenant SaaS)
**Researched:** 2026-04-08

## Recommended Architecture

Kovia follows a **modular monolith** pattern: a single NestJS backend organized into bounded-context modules that communicate via domain events, fronted by a Nuxt 3 hybrid-rendered frontend. Multi-tenancy is enforced at the database level via PostgreSQL Row-Level Security (RLS) on `organization_id`. File uploads bypass the backend entirely using S3-compatible presigned URLs. External automation (email, WhatsApp) is handled by n8n consuming webhook events.

```
                           +------------------+
                           |   Nuxt 3 (SSR)   |
                           |  Public Listings  |
                           +--------+---------+
                                    |
                     +--------------+--------------+
                     |         Nuxt 3 (SPA)        |
                     |     Rescue Dashboard        |
                     |     Adopter Portal          |
                     +--------------+--------------+
                                    |
                            REST / HTTP API
                                    |
              +---------------------+---------------------+
              |              NestJS API Gateway            |
              |  Auth Guard | Tenant Guard | Rate Limiter  |
              +-----+-------+-------+-------+------+------+
                    |       |       |       |      |
              +-----+  +---+---+ +-+----+ ++----+ +------+
              |Auth |  |Animal | |Adopt | |Score| |Notify|
              |Mod  |  |Module | |Module| |Mod  | |Module|
              +-----+  +-------+ +------+ +-----+ +------+
                    |       |       |       |      |
              +-----+-------+-------+-------+------+------+
              |         PostgreSQL (RLS enforced)          |
              |         organization_id on all rows        |
              +-------------------------------------------+
                                    |
              +-------------------------------------------+
              |          S3-Compatible Storage             |
              |    (presigned URL upload, CDN delivery)    |
              +-------------------------------------------+
                                    |
              +-------------------------------------------+
              |          n8n (Webhook Consumer)            |
              |    Email + WhatsApp via external APIs      |
              +-------------------------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Nuxt 3 Frontend** | SSR public pages, SPA dashboard/portal, form handling, file upload orchestration | NestJS API (REST), S3 (direct upload) |
| **Auth Module** | User registration/login, JWT issuance, password hashing, session management | All modules (guards), PostgreSQL |
| **Organization Module** | Org onboarding, admin approval, org settings, tenant context | Auth Module, PostgreSQL |
| **Animal Module** | Animal CRUD, species/breed management, status tracking, photo attachment | S3 (presigned URLs), PostgreSQL, Event Bus |
| **Adoption Module** | Application CRUD, workflow state machine, internal notes, applicant history | Scoring Module, Event Bus, PostgreSQL |
| **Scoring Module** | Rule engine, weight configuration, score calculation, risk flagging | Adoption Module (called by), PostgreSQL |
| **Notification Module** | In-app notifications, webhook dispatch to n8n, event log | Event Bus (listener), n8n (HTTP POST), PostgreSQL |
| **File Module** | Presigned URL generation, file metadata tracking, cleanup | S3, PostgreSQL |
| **PostgreSQL** | All persistent data with RLS policies, outbox table for events | All modules |
| **S3-Compatible Storage** | Photo storage for animals and applications | Nuxt (direct upload), File Module (URL generation) |
| **n8n** | External automation workflows (email, WhatsApp) | Notification Module (webhook receiver) |

### Data Flow

**1. Public Browsing (SSR)**
```
Visitor -> Nuxt SSR -> NestJS /api/public/animals (no auth) -> PostgreSQL
         <- Server-rendered HTML with animal listings
```

**2. Adoption Application Submission**
```
Adopter -> Nuxt SPA -> Request presigned URL from NestJS
                     -> Upload photos directly to S3
                     -> Submit application JSON to NestJS
        NestJS Adoption Module -> Save application
                               -> Emit "application.submitted" event
        Scoring Module (listener) -> Calculate score -> Save score
        Notification Module (listener) -> Save in-app notification
                                       -> POST webhook to n8n
        n8n -> Send WhatsApp/email to rescue
```

**3. Rescue Reviews Application**
```
Rescue Admin -> Nuxt SPA Dashboard -> NestJS /api/applications/:id
            <- Application + score + risk flags + photos (CDN URLs)
            -> Update status (approved/rejected/follow-up)
            -> NestJS Adoption Module -> Emit "application.status_changed"
            -> Notification Module -> Notify adopter (in-app + n8n webhook)
```

**4. Multi-Tenant Data Access (every request)**
```
Request -> Auth Guard (validate JWT, extract user)
        -> Tenant Guard (resolve organization_id from user/params)
        -> Set PostgreSQL session variable: SET app.current_org = :org_id
        -> RLS policies filter ALL queries automatically
```

## Component Design Details

### Multi-Tenancy: Row-Level Security (RLS)

**Pattern:** Shared database, shared schema, RLS-enforced isolation.

**Why RLS over schema-per-tenant:** Kovia starts with one pilot org (DameTuPataSV) and grows incrementally. Schema-per-tenant adds migration complexity that is unjustified until hundreds of tenants. RLS provides database-level enforcement that protects against application bugs -- even if NestJS code forgets a WHERE clause, PostgreSQL blocks cross-tenant access.

**Implementation approach:**
- Every tenant-scoped table includes `organization_id UUID NOT NULL`.
- Composite indexes on `(organization_id, <primary_query_column>)` for performance.
- RLS policies use `current_setting('app.current_org')` to filter rows.
- The NestJS Tenant Guard sets the session variable before any query executes.
- The application connects as a non-owner role so RLS is always active.
- Adopter data (user profiles, applicant history) is cross-tenant by design -- an adopter can apply to multiple orgs. RLS applies to applications and org-specific data, not to the users table itself.

```sql
-- Example RLS policy
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON animals
  USING (organization_id = current_setting('app.current_org')::uuid);
```

**Confidence:** HIGH -- AWS, Crunchy Data, and multiple production SaaS platforms document this exact pattern.

### NestJS Module Architecture

Use **domain-aligned modules**, not entity-per-module. Each module is a bounded context:

```
src/
  modules/
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      guards/
        jwt-auth.guard.ts
        tenant.guard.ts
      strategies/
        jwt.strategy.ts
      dto/
    organization/
      organization.module.ts
      organization.controller.ts
      organization.service.ts
      entities/
      dto/
    animal/
      animal.module.ts
      animal.controller.ts
      animal.service.ts
      entities/
        animal.entity.ts
        animal-photo.entity.ts
      dto/
    adoption/
      adoption.module.ts
      adoption.controller.ts
      adoption.service.ts
      entities/
        application.entity.ts
        application-note.entity.ts
      dto/
      events/
        application-submitted.event.ts
        application-status-changed.event.ts
    scoring/
      scoring.module.ts
      scoring.service.ts
      engine/
        scoring-engine.ts
        rules/
          housing-rule.ts
          experience-rule.ts
          red-flag-rule.ts
          completeness-rule.ts
      entities/
        scoring-rule.entity.ts
        score-result.entity.ts
    notification/
      notification.module.ts
      notification.service.ts
      webhook.service.ts
      listeners/
        application.listener.ts
      entities/
        notification.entity.ts
    file/
      file.module.ts
      file.controller.ts
      file.service.ts
      entities/
        file.entity.ts
  common/
    decorators/
      current-user.decorator.ts
      current-org.decorator.ts
    interceptors/
      tenant.interceptor.ts
    filters/
      http-exception.filter.ts
    pipes/
```

**Module dependency rules:**
- Modules communicate via **domain events** (EventEmitter2), not direct imports, except for the Scoring Module which is invoked synchronously by the Adoption Module (score is needed before response).
- The Auth and File modules are shared infrastructure -- imported by other modules.
- No circular dependencies. Notification Module only listens to events, never imported by domain modules.

**Confidence:** HIGH -- aligns with NestJS official documentation and DDD community patterns.

### File Upload Pipeline

**Pattern:** Presigned URL direct upload (client -> S3), metadata tracked by backend.

**Why not server-proxy uploads:** Environment photos from applicants can be multiple images. Routing binary data through NestJS wastes memory and bandwidth. Presigned URLs offload upload I/O to S3 while keeping authorization on the backend.

**Flow:**
1. Client requests presigned upload URL: `POST /api/files/presign` with `{ filename, contentType, context: "application" | "animal" }`.
2. NestJS File Module validates auth, generates presigned PUT URL (5-min expiry), creates a `file` record with status `pending`.
3. Client uploads directly to S3 using the presigned URL.
4. Client confirms upload: `POST /api/files/:id/confirm`.
5. Backend verifies file exists in S3, updates status to `confirmed`, returns CDN URL.
6. Client attaches file IDs when submitting forms (application, animal listing).

**Photo processing (deferred, not MVP):** A future enhancement would add image optimization (resize, compress, WebP conversion) via a background job triggered on upload confirmation.

**Storage structure:**
```
bucket/
  org-{org_id}/
    animals/{animal_id}/{uuid}.{ext}
    applications/{application_id}/{uuid}.{ext}
```

**Confidence:** HIGH -- presigned URL pattern is industry standard, well-documented for NestJS + S3.

### Event System and Webhook Dispatch

**Pattern:** Internal EventEmitter2 events + outbox table for webhook reliability.

NestJS `@nestjs/event-emitter` (built on EventEmitter2) handles in-process domain events. For external webhook delivery to n8n, use a simple **outbox pattern** to guarantee delivery:

1. Domain action occurs (e.g., application submitted).
2. Within the same database transaction: save the domain change AND insert a row into the `webhook_outbox` table.
3. EventEmitter2 fires the internal event (for in-app notifications, scoring).
4. A scheduled job (NestJS `@Cron`) polls `webhook_outbox` for unsent events, POSTs to n8n, marks as delivered.
5. Failed deliveries are retried with exponential backoff (max 5 retries).

**Why outbox over fire-and-forget HTTP:** If the n8n POST fails (network issue, n8n down), the event is lost forever. The outbox guarantees eventual delivery. This matters because webhook events trigger adopter communications (WhatsApp confirmations, email updates).

**Event catalog:**

| Event | Trigger | Webhook | In-App |
|-------|---------|---------|--------|
| `application.submitted` | Adopter submits application | Yes | Yes (to rescue) |
| `application.status_changed` | Rescue updates status | Yes | Yes (to adopter) |
| `application.score_calculated` | Scoring engine completes | No | No (internal) |
| `animal.status_changed` | Animal adopted/removed | Yes | Yes (to followers) |
| `organization.approved` | Platform admin approves org | Yes | Yes (to org admin) |

**Confidence:** HIGH -- outbox pattern is a well-established distributed systems pattern, NestJS EventEmitter2 is officially supported.

### Scoring Engine Design

**Pattern:** Strategy pattern with weighted rule composition.

The scoring engine is a synchronous, rule-based system where each rule evaluates one aspect of an application and returns a score + optional flags.

```typescript
interface ScoringRule {
  name: string;
  weight: number;           // 0-1, configured per org (later)
  evaluate(application: Application): RuleResult;
}

interface RuleResult {
  score: number;            // 0-100 for this rule
  flags: ScoringFlag[];     // e.g., RED_FLAG, WARNING, BONUS
  reasoning: string;        // Human-readable explanation
}

interface ScoreResult {
  totalScore: number;       // Weighted average, 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: ScoringFlag[];
  ruleBreakdown: RuleResult[];
}
```

**MVP rules:**

| Rule | Evaluates | Weight |
|------|-----------|--------|
| Housing | Housing type, ownership, space | 0.20 |
| Experience | Prior pet ownership, species experience | 0.15 |
| Environment | Photo analysis (manual review), yard/indoor | 0.15 |
| Lifestyle | Work schedule, activity level, time at home | 0.15 |
| Compatibility | Other pets, children, animal's needs | 0.15 |
| Completeness | All fields filled, photos provided | 0.10 |
| Red Flags | Past returns, inconsistencies, blacklist | 0.10 |

**Why not a generic rules engine library:** The scoring domain is narrow and well-defined. A generic rules engine (like json-rules-engine) adds abstraction without value. Custom code is easier to debug, test, and explain to rescue operators. Rules are TypeScript classes, not JSON config -- simpler to develop, version-control, and unit-test.

**Extensibility path:** For MVP, weights are hardcoded. Phase 2 adds per-organization weight configuration stored in the database. Phase 3 could add custom rule definitions.

**Confidence:** MEDIUM -- the pattern is sound, but scoring weights will need tuning with real DameTuPataSV data.

### Nuxt 3 Hybrid Rendering

**Pattern:** Route-based hybrid rendering via `routeRules` in nuxt.config.ts.

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    // Public pages: SSR for SEO + fast first paint
    '/': { ssr: true },
    '/animals': { ssr: true },
    '/animals/**': { ssr: true, swr: 3600 },  // stale-while-revalidate 1hr
    '/org/**': { ssr: true },

    // Auth pages: SSR (simple forms, SEO irrelevant but fast)
    '/auth/**': { ssr: true },

    // Dashboard: SPA mode (no SSR, auth-gated, heavy interactivity)
    '/dashboard/**': { ssr: false },

    // Adopter portal: SPA mode
    '/portal/**': { ssr: false },

    // API proxy
    '/api/**': { proxy: { to: 'http://localhost:3001/api/**' } },
  },
})
```

**Why this split:**
- Public animal listings need SSR for SEO (Google indexing, social media link previews with meta tags).
- Dashboard and portal are behind auth, have complex state, and benefit from SPA behavior (no full-page reloads, faster navigation).
- `swr` on animal detail pages caches for 1 hour, reducing backend load for popular listings.

**Frontend structure:**
```
app/
  layouts/
    default.vue          # Public pages layout
    dashboard.vue        # Rescue dashboard layout (sidebar nav)
    portal.vue           # Adopter portal layout
  pages/
    index.vue            # Homepage
    animals/
      index.vue          # Listing grid
      [id].vue           # Animal detail
    auth/
      login.vue
      register.vue
    dashboard/           # Rescue admin area
      index.vue
      animals/
      applications/
      settings/
    portal/              # Adopter area
      index.vue
      applications/
      profile.vue
  composables/
    useAuth.ts
    useOrganization.ts
    useAnimals.ts
    useApplications.ts
  stores/                # Pinia
    auth.ts
    dashboard.ts
```

**Confidence:** HIGH -- Nuxt 3 hybrid rendering via routeRules is official, well-documented functionality.

### Database Schema (Key Entities)

```
users
  id, email, password_hash, name, phone, role (platform_admin | org_admin | adopter)
  -- NOT org-scoped: adopters span orgs

organizations
  id, name, slug, description, status (pending | approved | suspended), settings_json

animals
  id, organization_id, name, species, breed, age, size, energy_level,
  good_with_kids, good_with_cats, good_with_dogs, description,
  status (available | adopted | foster | removed), created_at

applications
  id, organization_id, animal_id, applicant_id (-> users),
  status (submitted | reviewing | approved | rejected | withdrawn),
  housing_type, housing_ownership, has_yard, other_pets, children_count,
  work_schedule, experience_json, created_at

application_scores
  id, application_id, total_score, risk_level, rule_breakdown_json, calculated_at

application_notes
  id, application_id, author_id, content, created_at

files
  id, organization_id, entity_type, entity_id, storage_key, cdn_url,
  content_type, status (pending | confirmed | orphaned), created_at

notifications
  id, user_id, type, title, body, read, data_json, created_at

webhook_outbox
  id, event_type, payload_json, status (pending | delivered | failed),
  attempts, next_retry_at, created_at

org_members
  id, organization_id, user_id, role (admin), joined_at
```

**Confidence:** MEDIUM -- schema will evolve during implementation as real requirements surface.

## Patterns to Follow

### Pattern 1: Tenant-Scoped Repository Base
**What:** Abstract base repository that automatically applies organization_id filtering.
**When:** Every database operation on tenant-scoped entities.
**Example:**
```typescript
@Injectable()
export abstract class TenantScopedRepository<T> {
  constructor(
    private readonly repo: Repository<T>,
    private readonly tenantContext: TenantContext,
  ) {}

  async findAll(where?: FindOptionsWhere<T>): Promise<T[]> {
    return this.repo.find({
      where: {
        ...where,
        organization_id: this.tenantContext.getOrgId(),
      } as any,
    });
  }
}
```

### Pattern 2: Event-Driven Side Effects
**What:** Domain actions emit events; side effects (notifications, webhooks, scoring) are listeners.
**When:** Any action that triggers notifications or external integrations.
**Why:** Decouples the Adoption Module from knowing about notifications, webhooks, or scoring internals. Adding a new side effect means adding a listener, not modifying the core module.

### Pattern 3: Application State Machine
**What:** Adoption applications follow a strict state machine with validated transitions.
**When:** Any status change on an application.
```
submitted -> reviewing -> approved -> adopted
                      -> rejected
                      -> follow_up -> reviewing
submitted -> withdrawn
```
**Why:** Prevents invalid transitions (e.g., jumping from submitted to adopted). Makes audit trail clear. Each transition emits a typed event.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Tenant Filtering in Every Service Method
**What:** Manually adding `WHERE organization_id = ?` in every query.
**Why bad:** One missed filter leaks data across tenants. Humans forget. Code review cannot catch every case.
**Instead:** Use RLS at the database level as the safety net, plus tenant-scoped repositories as the application-level convenience. Defense in depth.

### Anti-Pattern 2: Synchronous Webhook Delivery
**What:** POSTing to n8n inside the request/response cycle of an API call.
**Why bad:** If n8n is slow or down, the user's request hangs or fails. Adoption submission should never fail because email delivery is broken.
**Instead:** Outbox pattern with async polling. The user gets an immediate response; webhook delivery happens in the background.

### Anti-Pattern 3: Server-Proxied File Uploads
**What:** Client uploads photo to NestJS, NestJS streams to S3.
**Why bad:** Consumes server memory and bandwidth. Multiple concurrent photo uploads can OOM the server. Blocks the event loop for large files.
**Instead:** Presigned URL direct upload. Server only handles metadata and authorization.

### Anti-Pattern 4: Monolithic Scoring Logic
**What:** One giant function with nested if/else for all scoring criteria.
**Why bad:** Impossible to test individual rules, adjust weights, or add new criteria without risk of breaking existing logic.
**Instead:** Strategy pattern with independent rule classes, each unit-testable.

## Scalability Considerations

| Concern | At 1 org (MVP) | At 50 orgs | At 500+ orgs |
|---------|----------------|------------|---------------|
| Multi-tenancy | RLS sufficient | RLS sufficient, add connection pooling (PgBouncer) | Consider schema-per-tenant or sharding |
| File storage | Single S3 bucket, org prefixes | Same, add CDN (CloudFront/Cloudflare) | Same, lifecycle policies for old photos |
| Webhook delivery | Cron-polled outbox | Same, reduce poll interval | Dedicated queue (BullMQ/Redis) |
| Scoring | Synchronous in-request | Same | Async with queue if scoring becomes CPU-intensive |
| Search | PostgreSQL LIKE/ILIKE | PostgreSQL full-text search | Consider Elasticsearch/Meilisearch |
| SSR rendering | Nuxt server, single instance | Add Nuxt caching layer | Multiple Nuxt instances behind load balancer |

## Suggested Build Order

Based on component dependencies, the recommended build order is:

1. **Database + Auth + Tenant Infrastructure** (foundation -- everything depends on this)
   - PostgreSQL schema with RLS policies
   - Auth module (registration, login, JWT)
   - Tenant guard and context
   - Organization module (CRUD, approval)

2. **Animal Module + File Upload** (core content that public pages display)
   - Animal CRUD with tenant scoping
   - File module with presigned URL generation
   - S3 integration

3. **Nuxt Public Pages** (SSR animal listings -- first visible output)
   - Homepage, animal listing grid, animal detail page
   - SEO meta tags, responsive design

4. **Adoption Module + Scoring Engine** (core workflow)
   - Application submission form and backend
   - State machine for application status
   - Scoring engine with MVP rules
   - Dashboard views for reviewing applications

5. **Event System + Notifications** (side effects layer)
   - EventEmitter2 internal events
   - In-app notification system
   - Webhook outbox + n8n integration

6. **Adopter Portal + Cross-Org Features** (polish)
   - Adopter application history
   - Cross-organization applicant tracking

This order ensures each phase produces a testable, demonstrable increment and that no phase depends on components not yet built.

## Sources

- [AWS: Multi-tenant data isolation with PostgreSQL RLS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) - HIGH confidence
- [Crunchy Data: Row Level Security for Tenants](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres) - HIGH confidence
- [NestJS Official: Events (EventEmitter2)](https://docs.nestjs.com/techniques/events) - HIGH confidence
- [Nuxt Official: Rendering Modes](https://nuxt.com/docs/guide/concepts/rendering) - HIGH confidence
- [Thomas VDS: Schema-based multitenancy with NestJS](https://thomasvds.com/schema-based-multitenancy-with-nest-js-type-orm-and-postgres-sql/) - MEDIUM confidence
- [DEV.to: Outbox Pattern with NestJS](https://dev.to/wallacefreitas/outbox-pattern-with-kafka-and-nestjs-ensuring-reliable-event-driven-systems-2f5k) - MEDIUM confidence
- [DEV.to: Applying DDD principles to NestJS](https://dev.to/bendix/applying-domain-driven-design-principles-to-a-nest-js-project-5f7b) - MEDIUM confidence
- [S3 Presigned URL Architecture](https://dev.to/oliverke/the-architecture-that-lets-us-sleep-scalable-uploads-with-s3-presigned-urls-1jf3) - MEDIUM confidence
- [Nected: Rules Engine Design Pattern](https://www.nected.ai/blog/rules-engine-design-pattern) - MEDIUM confidence
- [Vue School: Hybrid Rendering in Nuxt 3](https://vueschool.io/articles/vuejs-tutorials/hybrid-rendering-in-nuxt-js-3/) - MEDIUM confidence
