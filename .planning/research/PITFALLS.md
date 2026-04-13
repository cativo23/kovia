# Pitfalls Research

**Domain:** Pet adoption platform (multi-tenant SaaS for animal rescues)
**Researched:** 2026-04-08
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Cross-Tenant Data Leakage via Missing WHERE Clauses

**What goes wrong:**
A developer forgets to add `WHERE organization_id = ?` on a single query, and Org A sees Org B's applications, animals, or adopter notes. In a platform handling sensitive applicant data (home photos, addresses, personal history), this is a trust-destroying event. Application-level filtering (adding `organization_id` to every query manually) is the most common approach and also the most error-prone.

**Why it happens:**
Developers rely on discipline rather than enforcement. Every new query, every new endpoint, every JOIN must include the tenant filter. One missed clause in a reporting query, a bulk export, or an admin endpoint leaks data. NestJS request-scoped injection for tenant context also introduces performance overhead if not handled carefully -- the scope bubbles through the entire injection chain.

**How to avoid:**
- Use PostgreSQL Row-Level Security (RLS) as the database-enforced boundary, not just application-level WHERE clauses. Set `app.current_tenant` as a session variable on each connection, and let Postgres physically block cross-tenant reads.
- Do NOT connect as the table owner or a superuser role from the application -- both bypass RLS entirely.
- Use a global NestJS guard/interceptor that sets the tenant context on every request before any repository call.
- Write integration tests that explicitly attempt cross-tenant access and assert failure.
- Be aware of CVE-2024-10976 (subquery RLS bypass) and CVE-2025-8713 (optimizer stats leaking RLS-hidden rows) -- keep PostgreSQL patched.

**Warning signs:**
- Queries in the codebase without `organization_id` filtering and no RLS policies defined.
- Application connecting to PostgreSQL as the table owner or superuser.
- No integration tests verifying tenant isolation.
- Developers manually adding `.where('organization_id', tenantId)` instead of relying on automatic scoping.

**Phase to address:**
Phase 1 (Database foundation). RLS policies must be in place before any multi-tenant data is stored. Retrofitting RLS onto an existing schema with data is significantly harder.

---

### Pitfall 2: Scoring Rules That Reject Good Adopters

**What goes wrong:**
Rule-based applicant scoring becomes a gatekeeping system that rejects qualified adopters based on rigid criteria -- no fenced yard, renting instead of owning, working full-time, being a student. According to the ASPCA, "people who end up being fantastic adopters often don't meet the arduous requirements." Best Friends Animal Society actively campaigns against these patterns. The rescue ends up with more animals than adopters, which is the opposite of the platform's goal.

**Why it happens:**
Developers encode rescue staff biases directly into scoring rules without validation data. Rules like "no yard = minus 20 points" feel intuitive but have no correlation with adoption success. The system amplifies existing biases rather than informing decisions. Once encoded, these biases feel objective because "the system scored them low."

**How to avoid:**
- Scores should be advisory, never auto-reject. Always surface the score alongside the reasoning factors so rescue staff make the final call.
- Design scoring as weighted flags with explanations, not opaque numbers. Show "Flagged: renter (weight: -5)" rather than just "Score: 42."
- Make scoring rules fully configurable per organization, not hardcoded. DameTuPataSV's criteria for El Salvador will differ from a US suburban rescue.
- Include a "score explanation" view for both staff and applicants so rejected adopters understand why.
- Plan for scoring rule iteration: track which rules correlate with successful vs. failed adoptions over time so rules can be refined with real data.

**Warning signs:**
- Hardcoded scoring thresholds with no per-org configuration.
- No explanation UI for how a score was calculated.
- Rescue staff cannot override or adjust scores.
- Application rejection rate above 40-50% (suggests rules are too strict).

**Phase to address:**
Phase 2 (Application and scoring system). The scoring engine architecture must support transparency, configurability, and override from day one. Opaque scoring is harder to fix retroactively because staff trust erodes.

---

### Pitfall 3: Photo Uploads Failing Silently on Poor Mobile Connections

**What goes wrong:**
Adoption applications require environment photos (housing, yard, living space). The pilot org is in El Salvador where mobile connectivity is often poor. Standard file upload (`multipart/form-data` POST) fails silently or times out on 3G/unstable connections. Users fill out a lengthy application, hit submit, the upload fails, and the entire form is lost. They don't retry. The rescue loses an applicant.

**Why it happens:**
Developers build uploads assuming reliable broadband. A 2-5MB photo over a connection that drops every 30 seconds will fail. Without resumable uploads, the user must start over. Without client-side persistence, the form data is also lost.

**How to avoid:**
- Implement resumable uploads using the tus protocol (tus.io) or chunked upload to cloud storage (S3 multipart, Cloudflare R2). If a chunk fails, only that chunk retries.
- Compress and resize images client-side before upload (target 500KB-1MB max per photo using canvas API or a library like browser-image-compression).
- Decouple photo upload from form submission: upload photos first (showing progress), store references, then submit the form with photo IDs. A failed photo upload should not lose the application text.
- Persist form state to localStorage/sessionStorage so users can recover from a page crash or accidental navigation.
- Show upload progress with clear retry UI. "Upload failed -- tap to retry" is far better than a silent failure or generic error.
- Queue uploads and process them sequentially on slow connections rather than parallel.

**Warning signs:**
- Photo uploads use a single POST request with no chunking or progress indication.
- Form submission and photo upload are a single atomic operation.
- No client-side image compression.
- No form state persistence.
- Testing only happens on fast Wi-Fi connections.

**Phase to address:**
Phase 2-3 (Application form and photo upload). This must be designed into the upload architecture from the start. Retrofitting resumable uploads onto a simple file POST requires rewriting the entire upload flow.

---

### Pitfall 4: Webhook/n8n Integration Without Idempotency

**What goes wrong:**
The platform fires webhooks to n8n for email and WhatsApp notifications. n8n processes them and sends messages. But webhooks follow "at-least-once delivery" -- network issues cause retries, and without idempotency, adopters receive duplicate WhatsApp messages ("Your application was received" x3), or worse, duplicate state changes trigger contradictory messages ("Approved" then "Under Review" from a retry of an older event).

**Why it happens:**
Developers treat webhooks as reliable fire-and-forget. They assume one send = one delivery. In reality, network failures, n8n restarts, and timeout-then-success scenarios all cause duplicates. Events arriving out of order is also common.

**How to avoid:**
- Include an idempotency key (event UUID) in every webhook payload. n8n workflows should check for and deduplicate by this key.
- Include a monotonically increasing sequence number or timestamp per entity so n8n can detect and discard out-of-order events.
- Implement webhook delivery as: validate -> enqueue (to a job queue like BullMQ) -> deliver asynchronously with exponential backoff + jitter (1s, 2s, 5s, 13s, cap at 5 retries).
- Log all webhook deliveries with status codes for debugging.
- Return 2xx from n8n webhook receiver immediately, process asynchronously.
- Build a webhook delivery dashboard in the admin panel showing delivery status, retries, and failures.

**Warning signs:**
- Webhook sends are synchronous within request handlers.
- No event UUID in webhook payloads.
- No retry mechanism (fire and forget).
- n8n workflows have no deduplication logic.
- Users report receiving duplicate notifications.

**Phase to address:**
Phase 3-4 (Notification and webhook system). Must be designed with idempotency from the first webhook. Adding idempotency keys retroactively requires migrating all existing n8n workflows.

---

### Pitfall 5: Spanish-First i18n Done as an Afterthought Translation Layer

**What goes wrong:**
The app is built in English with i18n keys, then "translated to Spanish" at the end. But Spanish UI text is 20-30% longer than English, breaking layouts. Date formats, grammatical gender (masculine/feminine adjective endings for status labels), and Latin American Spanish vs. Spain Spanish differences are ignored. The UI feels like a translated American app rather than a Spanish-native experience.

**Why it happens:**
Developers default to English because that's what they read, what tutorials use, and what libraries default to. i18n is treated as "swap strings" rather than a design constraint. The difference between "Approved" (8 chars) and "Aprobado/Aprobada" (9-10 chars, gendered) breaks fixed-width buttons. El Salvador uses "vos" (voseo) informally, which differs from "tu" used in Mexico/Spain.

**How to avoid:**
- Build Spanish as the DEFAULT locale, not a translation. All development, testing, and design reviews happen in Spanish first. English is the secondary locale added later.
- Design UI with 30% text expansion budget. Use flexible layouts, not fixed widths.
- Use the correct locale code: `es-SV` for Salvadoran Spanish, not `es` or `es-LA` (which is technically "Spanish for Laos" per ISO).
- Handle grammatical gender in status labels: either use gender-neutral phrasing or pass context to the i18n system.
- Use ICU MessageFormat for pluralization and gender (e.g., `{gender, select, male {aprobado} female {aprobada} other {aprobado/a}}`).
- Format dates as DD/MM/YYYY (Latin American standard), currencies with local conventions.
- Never use country flags to represent languages.

**Warning signs:**
- Codebase has English hardcoded strings outside of i18n files.
- UI layouts break when switching to Spanish.
- i18n keys are English sentences rather than semantic keys (use `application.status.approved` not `"Approved"`).
- Date/number formatting uses US conventions.

**Phase to address:**
Phase 1 (Project scaffolding). i18n infrastructure and Spanish-first convention must be established before any UI is built. Retrofitting i18n onto hardcoded strings is one of the most tedious refactors in web development.

---

### Pitfall 6: Applicant History Shared Across Orgs Without Consent Controls

**What goes wrong:**
The platform tracks adopter history across organizations -- a core feature for identifying repeat bad adopters. But sharing application history, rejection reasons, and internal notes across unrelated organizations creates serious privacy and ethical concerns. Org A rejects someone for "incomplete application," Org B sees the rejection flag and pre-judges the applicant. Worse: internal notes ("seemed dishonest", "messy house in photos") leak across orgs and could constitute defamation.

**Why it happens:**
The cross-org history feature is designed from the rescue's perspective (catch bad actors) without considering the adopter's perspective (privacy, fairness, fresh start). Developers build the simplest implementation: share everything.

**How to avoid:**
- Separate "platform-level" data (account exists, number of applications, number of adoptions completed) from "org-level" data (specific application details, internal notes, scores).
- Internal notes are NEVER shared across organizations. They belong to the org that wrote them.
- Cross-org visibility should show only: previous adoption count, return count, and whether the adopter has active applications elsewhere (not details).
- Add a data retention policy: old application data should age out after a configurable period.
- Consider GDPR-style data access: adopters can see what data organizations hold about them.
- Document this in terms of service before launch.

**Warning signs:**
- Internal notes model has no organization scoping.
- No distinction between org-private and platform-shared applicant data.
- Adopters cannot see their own history or what orgs see about them.
- No data retention or deletion policy.

**Phase to address:**
Phase 2 (Data model design for applications and adopter profiles). The data model must encode these privacy boundaries from the start. Splitting a flat applicant table into org-scoped and platform-scoped data retroactively requires a migration and audit of every query.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Application-level tenant filtering only (no RLS) | Faster initial development | One missed WHERE clause = data breach | Never -- RLS should be implemented from Phase 1 |
| Single admin role per org with no permissions model | Simpler auth, fewer tables | Cannot add volunteers, foster coordinators, or readonly roles without rewrite | MVP only -- design the roles table even if only one role is populated |
| Storing photos in the application server filesystem | No cloud storage setup needed | Cannot scale horizontally, no CDN, lost on server rebuild | Never for production |
| Hardcoded scoring rules in application code | Faster to build initially | Every rule change requires a code deploy; orgs cannot customize | MVP only -- extract to config within first 2 phases |
| Synchronous webhook delivery in request handlers | Simpler implementation | Slow API responses, lost webhooks on timeout, no retry | Never -- use a job queue from the start |
| Global n8n automation (no per-org config) | One n8n instance, simpler setup | All orgs get same notification templates, cannot customize messaging | Acceptable for pilot with single org, must plan for per-org config |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| n8n webhooks | Sending all event data inline in the webhook payload, creating tight coupling | Send event type + entity ID + idempotency key. Let n8n fetch details via API callback if needed. |
| Cloud storage (S3/R2) | Generating signed upload URLs server-side with long expiry | Use short-lived presigned URLs (5-15 min), validate file type and size server-side after upload, scan for malicious content |
| Cloud storage | Serving user-uploaded images from the same domain as the app | Serve from a separate domain/CDN to prevent cookie-based attacks and XSS via SVG uploads |
| n8n webhooks | No webhook signature verification | Sign webhook payloads with HMAC-SHA256; verify signature in n8n before processing |
| PostgreSQL | Using the same DB connection pool for tenant operations and admin/background jobs | Separate connection pools; admin pool should not have RLS-restricted context |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all animals with photos in a single query for public listings | Slow page loads, high memory usage | Paginate listings, lazy-load images, use thumbnail variants | 200+ animals per org |
| Scoring all applications synchronously on submission | Slow form submission response, user sees spinner | Run scoring as async job, show "Application received, scoring in progress" | 50+ concurrent applications |
| Storing original-size photos without generating thumbnails | Listing pages load 3-5MB per photo, mobile users burn data | Generate thumbnails (300px, 800px) on upload via image processing pipeline | Immediately on mobile |
| N+1 queries in application listing (load applicant, then animal, then scores, then notes) | Admin dashboard slows to crawl | Eager-load relationships, use DataLoader pattern in NestJS | 100+ applications per org |
| No database indexes on organization_id + status compound queries | Full table scans on filtered views | Add compound indexes on (organization_id, status), (organization_id, created_at) | 1000+ rows per table |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing adopter home photos via predictable/enumerable URLs | Anyone can view private housing photos by guessing URLs | Use signed URLs with short expiry, never expose raw storage paths |
| No rate limiting on application submission | Spam applications flood rescue dashboards, obscure real applicants | Rate limit per user (3 applications/day) and per IP |
| Internal notes visible to adopters via API response | Adopters see staff comments like "seemed sketchy" | Separate note endpoints with role-based access, never include notes in adopter-facing API responses |
| Adopter-uploaded photos not scanned for malicious content | XSS via SVG, malware distribution via image files | Restrict to JPEG/PNG/WebP, strip EXIF metadata, re-encode images server-side |
| Webhook payloads containing full applicant PII sent to n8n | PII stored in n8n execution logs, potential compliance issue | Send only entity IDs in webhooks; n8n fetches needed data via authenticated API call |
| No EXIF stripping on uploaded photos | GPS coordinates in home photos expose adopter's exact address | Strip all EXIF metadata on upload before storage |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Requiring account creation before browsing animals | Potential adopters bounce before seeing any animals | Public animal listings with no auth; account required only at application time |
| Long single-page application form | Users abandon halfway, especially on mobile with poor connectivity | Multi-step wizard with progress indicator and auto-save per step |
| No application status visibility for adopters | Adopters message rescue repeatedly asking "what's my status?" creating more work for staff | Clear status timeline: Received -> Under Review -> Interview -> Approved/Denied, visible in adopter dashboard |
| Rejection with no explanation | Adopters feel judged and leave angry reviews about the rescue | Provide category-level feedback ("We found a better match for this pet") without exposing internal notes |
| Forcing exact breed/species search on animal listings | Users don't always know breed; "cute medium dog" is a valid search | Filter by size, age, energy level, and compatibility attributes rather than only breed |
| Desktop-first admin dashboard | Rescue staff in El Salvador often manage from their phones between field work | Responsive admin with critical actions (approve/reject/message) usable on mobile |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Multi-tenancy:** RLS policies exist but are not tested with cross-tenant integration tests. Verify with a test that connects as Org A and attempts to read Org B data.
- [ ] **Photo upload:** Upload works but no thumbnail generation, no EXIF stripping, no file type validation beyond extension, no size limits enforced server-side.
- [ ] **Scoring engine:** Scores calculate correctly but no explanation UI, no per-org configuration, no audit trail of rule changes.
- [ ] **Webhook delivery:** Webhooks fire but no retry on failure, no idempotency key, no delivery log, no dead letter queue.
- [ ] **i18n:** All strings are in locale files but date/number formatting still uses English conventions, UI breaks with Spanish text length, hardcoded strings remain in error messages and validation.
- [ ] **Application form:** Form submits correctly but no auto-save, no resumable upload, no offline resilience, no progress indication on photo upload.
- [ ] **Notifications:** In-app notifications work but no read/unread tracking, no notification preferences, no batching (5 updates = 5 separate WhatsApp messages).
- [ ] **Public listings:** Animals display correctly but no SEO metadata, no Open Graph tags for social sharing (critical for rescue marketing), no structured data for Google.
- [ ] **Adopter history:** History tracks across orgs but no privacy boundaries, no data retention policy, no adopter visibility into their own data.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Cross-tenant data leak | HIGH | Immediately revoke access, audit all queries for missing tenant scoping, implement RLS, notify affected organizations, review all exposed data |
| Scoring rules rejecting good adopters | MEDIUM | Make all auto-rejections advisory, add override capability, review and adjust rule weights with rescue staff input |
| Photo upload failures losing applications | MEDIUM | Add form auto-save retroactively, implement chunked upload, backfill lost applications by contacting adopters via email |
| Duplicate webhook notifications | LOW | Add idempotency key to payloads, implement dedup in n8n, apologize to affected adopters for duplicate messages |
| i18n retrofit from English-first | HIGH | Audit entire codebase for hardcoded strings, fix broken layouts, retest all flows in Spanish -- typically 2-4 weeks of dedicated work |
| Privacy violation from cross-org note sharing | HIGH | Audit all shared data, restrict note visibility immediately, notify adopters if notes were exposed, update terms of service |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Cross-tenant data leakage | Phase 1: Database + Auth foundation | Integration test suite that attempts cross-tenant reads and writes; all must fail |
| Scoring bias / over-rejection | Phase 2: Scoring engine | Score explanation UI exists; all rules are configurable per org; staff can override |
| Photo upload failures on poor connections | Phase 2-3: Application form + uploads | Test upload flow on throttled 3G connection (Chrome DevTools); verify resume after disconnect |
| Webhook idempotency | Phase 3: Notification system | Send same webhook twice with same idempotency key; verify single processing in n8n |
| i18n as afterthought | Phase 1: Project scaffolding | All UI development happens Spanish-first; no English hardcoded strings in codebase |
| Cross-org privacy violations | Phase 2: Data model design | Internal notes query with different org context returns empty; adopter API never includes notes |
| No thumbnail generation | Phase 2-3: Photo pipeline | Listing page loads only thumbnail variants; original photos served only on detail/zoom |
| Desktop-first admin | Phase 1: UI framework setup | Admin critical paths tested at 375px mobile viewport width |

## Sources

- [Best Friends Animal Society: Pet Adoption Barriers and Solutions](https://bestfriends.org/network/resources-tools/pet-adoption-barriers-and-solutions)
- [NBC News: How to ace your pet rescue application](https://www.nbcnews.com/business/business-news/how-ace-your-pet-rescue-application-why-it-s-so-n634581)
- [AWS: Multi-tenant data isolation with PostgreSQL RLS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
- [Medium: Multi-Tenant Leakage When RLS Fails in SaaS](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)
- [Permit.io: Postgres RLS Implementation Guide and Common Pitfalls](https://www.permit.io/blog/postgres-rls-implementation-guide)
- [tus.io: Open protocol for resumable file uploads](https://tus.io/)
- [Modexa: Idempotent Webhook Retries in n8n](https://medium.com/@Modexa/idempotent-webhook-retries-in-n8n-without-duplicates-8380273a95a2)
- [Refactix: n8n Webhook Best Practices](https://refactix.com/ai-automation-productivity/n8n-webhook-best-practices-security-scalability)
- [Phrase: Linguistics for Developers - Real-World i18n Challenges](https://phrase.com/blog/posts/internationalization-beyond-code-a-developers-guide-to-real-world-language-challenges/)
- [Fabian Isele: Multi Tenancy with NestJS](https://fabian.ski/posts/nestjs-tenants/)
- [Petunia: Animal Rescue Software With Adoption Applications](https://www.petuniapets.com/en/blog/animal-rescue-software-with-adoption-applications)

---
*Pitfalls research for: Pet adoption platform (Kovia)*
*Researched: 2026-04-08*
