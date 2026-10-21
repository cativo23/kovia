# Kovia — Project Rules

## Prisma Client Naming (PATTERN-01)

Every NestJS service that injects Prisma clients MUST follow these names:

- `rlsPrisma` — the RLS-aware client injected via `@Inject(PRISMA_RLS)`. This client enforces Row-Level Security for the logged-in tenant.
- `rlsBypassPrisma` — the RLS-bypass client typed `PublicPrismaService`. Use this ONLY for platform-level reads/writes that must cross tenant boundaries (e.g., invite acceptance, public animal listings).

**Why this matters:** In v2.0 bug B1, the bypass client was injected as type `PrismaService` and named `publicPrisma`. The name misled reviewers into thinking it was RLS-enforced. The rename to `rlsBypassPrisma: PublicPrismaService` makes the bypass intent explicit and auditable.

Do NOT name a bypass client `prisma`, `prismaService`, `publicPrisma`, or any other name that obscures whether RLS is enforced.

## Integration Spec Mandate (PATTERN-02, PATTERN-03)

### PATTERN-02 — Runtime smoke over code inspection

If a service method chains a nested Prisma `include` AND the result feeds a notification, email, or BullMQ emission:

- Write a real-DB integration spec that calls the method against a live database
- Assert that the downstream emission actually occurred (notification row exists, queue job added, etc.)
- Code inspection alone is not sufficient — v2.0 bug B3 proved that a broken `include` chain silently drops notifications with zero errors

### PATTERN-03 — Dual-client services require an integration spec

Any service that injects BOTH `@Inject(PRISMA_RLS)` AND `PublicPrismaService` MUST have a sibling `*.integration.spec.ts` file. This is enforced by a CI script (`backend/scripts/check-integration-specs.ts`) that fails the build if a dual-client service has no sibling integration spec.

**Spec naming:** `foo.service.integration.spec.ts` or `foo.service.rls.integration.spec.ts` — both are accepted. Place the spec next to the service file.
