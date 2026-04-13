# Feature Research

**Domain:** Pet Adoption Management Platform (CRM for Rescues/Shelters)
**Researched:** 2026-04-08
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features rescue staff assume exist. Missing these = platform feels incomplete and they stay on spreadsheets.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Animal profile management | Core purpose of any shelter software — every animal needs a record with species, breed, age, photos, status, description | MEDIUM | Generic animal model (not just dogs/cats) adds schema complexity but is essential for Kovia's target audience |
| Animal status lifecycle | Animals move through intake -> available -> applied -> adopted/returned/transferred. Every competitor tracks this | LOW | Statuses: draft, available, on-hold, pending-adoption, adopted, returned, transferred, deceased |
| Public animal listings | Adopters need to browse available animals without an account. Every platform from Petfinder to Shelterluv does this | MEDIUM | Must be SEO-friendly, filterable by species/breed/age/size, mobile-responsive |
| Adoption application form | The fundamental workflow — structured application replacing DMs and emails. All competitors offer this | MEDIUM | Must support photo uploads (housing/environment), conditional fields by species, and be completable on mobile |
| Application status tracking | Staff need a queue view of all applications with statuses (new, under-review, approved, denied, withdrawn). Applicants need to see their status | MEDIUM | This is the core "CRM" aspect — without visible status, rescuers lose track |
| Staff dashboard | Central view for rescue operators: pending applications, animal counts by status, recent activity. Every shelter CRM has this | MEDIUM | Most important screen in the app — must load fast and surface actionable items |
| Internal notes on applications | Staff discuss applicants privately before making decisions. Standard in every CRM | LOW | Timestamped notes per application, visible only to org staff |
| Applicant accounts with application history | Adopters need accounts to track their applications. Standard across AnimalsFirst, Shelterluv, Petstablished | LOW | Email/password auth, profile with contact info, list of past applications |
| Photo management | Animal listings need multiple photos; applications need environment photos. Cloud storage is expected | MEDIUM | Need upload, resize/compress, ordering for animal galleries, and secure storage |
| Basic notifications | Applicants expect updates when their application status changes. Staff expect alerts on new applications | LOW | In-app notifications minimum; email/WhatsApp via n8n webhooks |
| Organization profile and settings | Each rescue needs to configure their name, logo, contact info, and application questions | LOW | Basic org management — the tenant identity |
| Multi-tenant data isolation | Multiple organizations on one platform with strict data separation. Standard SaaS pattern | HIGH | All queries scoped by organization_id. Critical for trust and security |

### Differentiators (Competitive Advantage)

Features that set Kovia apart. These are where the product competes — most existing shelter software does NOT do these well.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Rule-based applicant scoring (0-100) | No competitor offers structured, transparent scoring. Rescues currently rely on gut feeling and memory. Automated scoring based on housing, experience, environment photos, red flags, and lifestyle fit reduces bias and speeds decisions | HIGH | This is Kovia's core differentiator. Scoring factors: housing situation, pet experience, environment photos quality, red flags (past returns, incomplete info, inconsistencies), lifestyle fit, other pets/children compatibility, application completeness, response time. Must be configurable per org |
| Cross-organization applicant reputation | Adopters build reputation across rescues. Bad actors (animal hoarders, returners, abusers) get flagged platform-wide. No existing platform shares applicant data across organizations | HIGH | Privacy-sensitive — needs consent model. Shows adoption history, return rate, and flags from other orgs. This is the "credit score for adopters" concept and Kovia's strongest moat |
| Risk-level classification with flags | Beyond a raw score — categorize applicants as low/medium/high risk with specific flag reasons (e.g., "incomplete info", "housing mismatch", "prior return") | MEDIUM | Flags are more actionable than scores. Staff can filter queue by risk level to prioritize reviews |
| Webhook-driven automation (n8n) | Most shelter software has rigid built-in notifications. Webhooks let rescues build custom automation: WhatsApp messages, email sequences, Slack alerts, Google Sheets logging — whatever they need | MEDIUM | Emit events for: application submitted, status changed, score calculated, animal status changed. n8n handles the rest |
| Admin-approved organization onboarding | Platform quality control — new rescues must be verified before they can use the system. Prevents misuse and builds trust | LOW | Simple approval workflow: org registers -> admin reviews -> approved/rejected. Keeps platform legitimate |
| Spanish-first UI | Zero competition in the Latin American rescue management space. Existing platforms are English-only or have poor translations. Latin America is 5% of the global shelter software market — completely underserved | LOW | i18n architecture from day one, but Spanish is the default. English added later. Huge regional advantage for DameTuPataSV and similar orgs |
| Application completeness tracking | Auto-detect missing required fields, missing photos, unanswered questions. Prompt applicants to complete before submission or allow staff to request missing info | LOW | Reduces "incomplete application" problem that bogs down every rescue's queue |
| Configurable scoring rules per organization | Each rescue has different priorities — some care most about housing, others about experience with specific breeds. Let orgs weight scoring factors | MEDIUM | Default weights work out-of-box, but power users can tune. Defer full configurability to post-MVP |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for Kovia's scope and audience.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| AI-based matching/scoring | Sounds impressive, attracts attention | Requires large training datasets that don't exist yet. Opaque decisions erode trust with rescuers who need to understand WHY an applicant scored a certain way. Rule-based is debuggable | Rule-based scoring first. Collect data. Consider ML after thousands of adoptions provide training data |
| Built-in messaging/chat | "We need to talk to applicants in the app" | Rescues already use WhatsApp (especially in Latin America). Building chat is HIGH complexity and competes with tools people already prefer | Webhook events trigger WhatsApp/email via n8n. Link to WhatsApp from application view |
| Payment/donation processing | "We need to collect adoption fees" | Payment processing adds PCI compliance burden, financial reporting, refund handling. Completely separate domain from adoption management | Link out to external payment (PayPal, bank transfer info). Consider integration later |
| Petfinder/Adopt-A-Pet syndication | "Push our listings to adoption sites" | Syndication APIs are complex, change frequently, and require ongoing maintenance. Kovia is a management platform, not a listing aggregator | Manual export or future webhook-to-syndication via n8n. Not core to the management workflow |
| Volunteer/staff management | "We need to manage our volunteers" | Scope creep into HR/scheduling territory. Most rescues are 1-3 person operations. Existing tools (Google Calendar, WhatsApp groups) work fine | Single admin per org for MVP. Multi-role permissions added later |
| Medical records management | "Track vaccinations, spay/neuter, vet visits" | Full medical records is a separate product domain (veterinary software). High complexity, regulatory considerations | Basic health notes field on animal profiles. Not a structured medical system |
| Foster home management | "Match animals to foster homes" | Foster management is its own workflow (availability, capacity, preferences, check-ins). Pawlytics already specializes here | Animal status can indicate "in foster" with foster contact info. Full foster management deferred |
| Mobile native app | "Our staff work from phones" | Native mobile dev doubles engineering cost. Responsive web covers 90% of mobile use cases | Responsive web design, PWA if needed later |
| Real-time collaborative editing | "Multiple staff reviewing same application" | WebSocket complexity, conflict resolution, operational overhead for 1-3 person teams | Optimistic concurrency with internal notes. Staff see latest state on refresh |
| Per-organization webhook configuration | "Each org should configure their own automations" | UI for webhook management is complex. Most rescue operators are not technical | Global n8n automation managed by platform admin for MVP. Per-org config is a v2 feature |

## Feature Dependencies

```
[Multi-tenant org isolation]
    |
    +--requires--> [Organization profile and settings]
    |                  |
    |                  +--enables--> [Admin-approved org onboarding]
    |
    +--enables--> [Animal profile management]
    |                  |
    |                  +--requires--> [Photo management]
    |                  |
    |                  +--enables--> [Public animal listings]
    |                  |
    |                  +--enables--> [Animal status lifecycle]
    |
    +--enables--> [Applicant accounts]
                       |
                       +--enables--> [Adoption application form]
                       |                  |
                       |                  +--requires--> [Photo management]
                       |                  |
                       |                  +--enables--> [Application status tracking]
                       |                  |                  |
                       |                  |                  +--enables--> [Staff dashboard]
                       |                  |                  |
                       |                  |                  +--enables--> [Internal notes]
                       |                  |                  |
                       |                  |                  +--enables--> [Notifications]
                       |                  |                  |
                       |                  |                  +--enables--> [Webhook events]
                       |                  |
                       |                  +--enables--> [Rule-based scoring]
                       |                                     |
                       |                                     +--enables--> [Risk-level flags]
                       |                                     |
                       |                                     +--enhances--> [Application status tracking]
                       |
                       +--enables--> [Cross-org applicant reputation]
                                          |
                                          +--requires--> [Rule-based scoring]
                                          +--requires--> [Application history across orgs]
```

### Dependency Notes

- **Adoption application form requires Photo management:** Applications need environment photos uploaded; photo infrastructure must exist first
- **Rule-based scoring requires Adoption application form:** Scoring evaluates application data — the form must capture structured data for scoring to work
- **Cross-org reputation requires Scoring + History:** Reputation is built from scored applications across multiple organizations — both must exist
- **Staff dashboard requires Application status tracking:** The dashboard aggregates application statuses — tracking must be in place
- **Webhook events require Application status tracking:** Events fire on status changes — status workflow must be defined first
- **Public listings require Animal profiles + Photos:** Listings are the public view of animal data with images

## MVP Definition

### Launch With (v1)

Minimum viable product to validate with DameTuPataSV. Ruthlessly scoped to the core adoption workflow.

- [ ] Multi-tenant organization management with data isolation — foundation for everything
- [ ] Admin-approved organization onboarding — control platform quality from day one
- [ ] Organization profile and settings — name, logo, contact info
- [ ] Animal profile management (CRUD) — species-generic with photos, description, attributes
- [ ] Animal status lifecycle — draft through adopted/returned
- [ ] Public animal listings with filtering — browsable without account, filterable by species/age/size
- [ ] Applicant account creation and auth — email/password, profile info
- [ ] Structured adoption application form — with photo uploads, conditional fields
- [ ] Application status tracking and queue — the core CRM workflow for rescue staff
- [ ] Staff dashboard — pending apps, animal counts, recent activity
- [ ] Internal notes on applications — private staff discussion per application
- [ ] Rule-based applicant scoring (0-100) — the primary differentiator, default weights
- [ ] Risk-level classification with flags — actionable risk categories for staff
- [ ] In-app notifications — status change alerts for applicants and staff
- [ ] Webhook events for n8n — application and animal status change events
- [ ] Photo uploads to cloud storage — for animal listings and application environment photos
- [ ] Spanish-first UI — i18n ready, Spanish default

### Add After Validation (v1.x)

Features to add once core workflow is proven with DameTuPataSV.

- [ ] Cross-organization applicant reputation — when second org onboards, enable reputation sharing
- [ ] Configurable scoring weights per org — let orgs tune scoring to their priorities
- [ ] Application completeness tracking with prompts — auto-detect missing info, request from applicants
- [ ] Enhanced dashboard analytics — adoption rates, average processing time, scoring distribution
- [ ] Email notification templates — customizable per org via n8n
- [ ] Bulk actions on applications — approve/deny multiple, bulk status changes
- [ ] Animal search/filter improvements — advanced filtering, saved searches for staff
- [ ] Applicant communication log — record of all outreach attempts (manual logging, not built-in chat)

### Future Consideration (v2+)

Features to defer until product-market fit is established and multiple orgs are active.

- [ ] Multi-role permissions within organizations — admin, reviewer, viewer roles
- [ ] Per-organization webhook/automation configuration — let orgs manage their own n8n triggers
- [ ] English UI and additional languages — expand beyond Spanish-first
- [ ] Configurable application form fields per org — let orgs customize what they ask
- [ ] Reporting and data export — CSV exports, adoption outcome reports, scoring analytics
- [ ] Foster management basics — track which animals are in foster, foster parent contacts
- [ ] API for third-party integrations — public API for external tools
- [ ] AI-assisted scoring suggestions — ML layer on top of rule-based scoring once data exists
- [ ] OAuth/social login — Google, Facebook login options
- [ ] PWA support — installable web app for mobile-heavy users

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Animal profile management | HIGH | MEDIUM | P1 |
| Animal status lifecycle | HIGH | LOW | P1 |
| Public animal listings | HIGH | MEDIUM | P1 |
| Adoption application form | HIGH | MEDIUM | P1 |
| Application status tracking | HIGH | MEDIUM | P1 |
| Staff dashboard | HIGH | MEDIUM | P1 |
| Rule-based applicant scoring | HIGH | HIGH | P1 |
| Risk-level flags | HIGH | MEDIUM | P1 |
| Multi-tenant org isolation | HIGH | HIGH | P1 |
| Applicant accounts | HIGH | LOW | P1 |
| Internal notes | MEDIUM | LOW | P1 |
| Photo management | HIGH | MEDIUM | P1 |
| In-app notifications | MEDIUM | LOW | P1 |
| Webhook events (n8n) | MEDIUM | LOW | P1 |
| Spanish-first UI (i18n) | HIGH | MEDIUM | P1 |
| Org onboarding (admin-approved) | MEDIUM | LOW | P1 |
| Cross-org applicant reputation | HIGH | HIGH | P2 |
| Configurable scoring weights | MEDIUM | MEDIUM | P2 |
| Application completeness tracking | MEDIUM | LOW | P2 |
| Dashboard analytics | MEDIUM | MEDIUM | P2 |
| Bulk application actions | MEDIUM | LOW | P2 |
| Multi-role permissions | MEDIUM | MEDIUM | P3 |
| Per-org webhook config | LOW | HIGH | P3 |
| Configurable form fields | MEDIUM | HIGH | P3 |
| Reporting and export | MEDIUM | MEDIUM | P3 |
| Foster management | LOW | HIGH | P3 |
| AI-assisted scoring | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch — core adoption workflow + scoring differentiator
- P2: Should have, add after validation with pilot org
- P3: Nice to have, future consideration after multi-org growth

## Competitor Feature Analysis

| Feature | Shelterluv | Petstablished | Pawlytics | AnimalsFirst | Kovia (Our Approach) |
|---------|------------|---------------|-----------|--------------|---------------------|
| Animal management | Full (intake, kennel, medical) | Full | Full (foster-focused) | Full | Focused: profiles, status, photos. No medical records system |
| Adoption applications | Online forms, basic workflow | Comprehensive with communication tools | Basic | Portal with e-contracts, payment | Structured form with scoring. No e-contracts or payment |
| Applicant scoring | None — manual review only | None | None | None | Rule-based 0-100 scoring with risk flags. Primary differentiator |
| Cross-org reputation | None | None | None | None | Applicant history shared across orgs. Unique in market |
| Foster management | Yes | Yes | Core strength (FosterFix algorithm) | Foster portal | Deferred — status indicator only |
| Medical records | Yes | Basic | Yes | Yes | Deferred — notes field only |
| Petfinder syndication | Yes | Yes | Yes (auto-export) | Varies | Not in scope — n8n webhook if needed |
| Donor/fundraising | Some | Yes | No | No | Not in scope |
| Spanish language | No | No | No | No | Spanish-first. No competitor serves this market |
| Automation/webhooks | Limited built-in | Built-in notifications | Limited | Built-in approval flow | Webhook events for n8n — flexible, extensible |
| Multi-tenant | No (single-org) | No (single-org) | No (single-org) | No (single-org) | Yes — platform serves multiple orgs with data isolation |
| Pricing | Paid SaaS | Paid SaaS | Paid SaaS | Paid SaaS | TBD |

### Key Competitive Insights

1. **No competitor offers applicant scoring.** Every platform relies on manual review. This is Kovia's strongest differentiator.
2. **No competitor shares applicant data across organizations.** Each org is an island. Cross-org reputation is novel.
3. **No competitor serves Spanish-speaking markets natively.** The Latin American rescue ecosystem is underserved.
4. **Most competitors are single-tenant.** They serve one org per instance. Kovia's multi-tenant model enables cross-org features.
5. **Competitors are feature-heavy.** They bundle medical records, fundraising, volunteer management, foster matching. Kovia wins by being focused on the adoption decision workflow.

## Sources

- [Capterra Animal Shelter Software Reviews 2026](https://www.capterra.com/animal-shelter-software/)
- [AnimalsFirst - All-in-One Management Platform](https://animalsfirst.com/)
- [Pawlytics - Animal Welfare Database](https://pawlytics.com/)
- [ShelterBuddy - Animal Shelter Database System](https://www.shelterbuddy.com/)
- [Shelterluv](https://www.shelterluv.com/)
- [Petstablished - AWO Management Software](https://petstablished.com/)
- [Giveffect - Animal Welfare Software](https://www.giveffect.com/animal-welfare)
- [24Pet Blog - Best Animal Shelter Software Features](https://www.24pet.com/blog/best-animal-shelter-software)
- [Cognitoforms - Building Reliable Pet Adoption Screening](https://www.cognitoforms.com/blog/443/building-a-reliable-pet-adoption-screening-process)
- [Best Friends - Pet Adoption Barriers and Solutions](https://bestfriends.org/network/resources-tools/pet-adoption-barriers-and-solutions)
- [ShelterManager - Open Source Shelter Software](https://sheltermanager.com/)
- [Maddie's Fund Forum - Shelterluv vs ShelterBuddy Discussion](https://forum.maddiesfund.org/discussion/shelterluv-vs-shelterbuddy-and-adopets)

---
*Feature research for: Pet Adoption Management Platform (CRM for Rescues/Shelters)*
*Researched: 2026-04-08*
