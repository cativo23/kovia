# Kovia v3.0 — Adoption Experience & Brand Redesign

**Spec author:** Carlos Cativo (with Claude as collaborator)
**Date:** 2026-04-27
**Status:** Approved for implementation planning
**Milestone target:** v3.0
**Predecessor milestone:** v2.1 Polish & Hardening (shipped 2026-04-27)

---

## Goal

Replace Kovia's generic NuxtUI default aesthetic with a distinctive, modern, pet-aware visual identity AND restructure the adoption application process around best-practice responsible-adoption frameworks. Both surfaces (org dashboard + public-facing listings/landing) must hit a top-tier UX/UI bar with light + dark mode, animations, and a catching landing page. Spanish-first, multi-tenant aware (Kovia is a platform — not a single rescue's site).

## Non-Goals

- New rescue features (n8n integration, WhatsApp messaging API, per-org webhook config) — those belong to a later milestone.
- Replacing the Phase 4 scoring system. Scoring stays; only its **presentation** changes (score numerico is hidden from adopters; refugio sees full breakdown).
- Mobile native app. Web-first responsive remains the strategy.
- Multi-language. Spanish-first; English deferred.

## Scope (In)

### A. Adoption Application Process Restructure

The existing flow embeds all adopter information inside each `AdoptionApplication`. The new flow separates persistent profile from per-application specifics, adds compatibility safeguards drawn from ASPCA Meet Your Match / Match-Up II / Best Friends post-adoption research, and introduces LATAM-specific adaptations.

**10-step adopter flow:**

1. **Crear perfil persistente** — `AdopterProfile` entity (one-per-user). Datos básicos, hogar, estilo de vida, experiencia general, fotos. Editable anytime.
2. **Browse animales** — cards show categorical guidance, NOT numeric score:
   - Verde: "Buena pareja para tu hogar"
   - Ámbar: "Considerá: [factor]"
   - Rojo: "Necesidades especiales · revisá dossier"
3. **Solicitar dossier** — mandatory view before applying. Animal dossier includes evaluación conductual, historial médico + costo mensual USD, disparadores conocidos, regla 3-3-3 de adaptación, tiempo en refugio. Adopter must check "Reconozco haber leído este dossier" to unlock apply button.
4. **Aplicar** — uses profile snapshot + animal-specific extras (refugio configures from category templates: "Saludable adulto", "Senior", "Médico crónico", "Reactivo", "Especial"). Tags CRÍTICA/IMPORTANTE/OPCIONAL **hidden from adopter** (telegraph effect mitigation). Question framing uses behavioral specificity ("¿cuántas caminatas >20min en últimos 7 días?") not self-evaluation. **Co-aplicante** receives WhatsApp confirmation link — any adult in household, not just legal partner.
5. **Refugio revisa** — refugio sees full numeric score, criticality tags, inconsistency triangulation between profile and per-animal answers. Inconsistencies alert counselor; do not auto-reject.
6. **Encuentro obligatorio** — presencial or video. Counselor logs structured observations. Cannot be skipped.
7. **Branch: Foster-to-adopt 14d** — mandatory if (categoría ∈ {senior, médico, reactivo, especial} AND adopter lacks prior experience with that category). Optional otherwise.
8. **Aprobación → 48h de reflexión → finalización** — approval is conditional; finalization unlocks after 48h. Adopter may withdraw without stigma.
9. **Adopción finalizada** — refugio entrega documentación, plan adaptación 3-3-3, contacto del counselor. "Devolución sin estigma" framing always visible.
10. **Check-ins post-adopción** — Day 14: WhatsApp 3-question check-in. Day 60: opcional deeper. Flags posted back to refugio dashboard.

### B. Visual Identity System

**Dual personality, single brand family:**
- **Public surfaces** (landing, animal listings, dossier, application flow, profile, adopter dashboard) — táctil + trendy + warm. Bento grids, sticker mascot, marquee strips, custom paw-based iconography, squircle shapes, variable typography, electric coral pop.
- **Org dashboard** (refugio operations) — herramienta pro. Dense data, Linear-tier polish, but in the same color family (terracota + verde forestal accents on dark/light base, NOT neutral gray slate).

**Color tokens (CSS custom properties):**
- Cream: `#FEF3E2` — primary light surface
- Terracota: `#D97706` — primary brand accent
- Verde forestal: `#16A34A` — success, "buena pareja", confirm actions
- Coral eléctrico: `#FF6B47` — Kovia signature pop, used sparingly for emphasis (CTAs, key badges)
- Marrón profundo: `#1A0F06` — primary dark surface, primary text on cream
- Ámbar: `#F59E0B` — caution, "considerá", medical
- Rojo: `#EF4444` — urgent, special needs flag

Light mode + Dark mode tokens for both surfaces. CSS variables, navbar toggle (☾/☼), respects `prefers-color-scheme`, persists per user via localStorage.

**Typography:**
- **Display:** Söhne (or Inter as free fallback) at weight 800-900, italic for accent. Variable font; hero animates 800→900 on hover.
- **Body:** Söhne 600 / Inter 600 — denser warmth than Geist's airy default.
- Reasoning: Geist is now the "obvious" choice (Vercel/Linear/Resend). Söhne (or Inter at 800) signals taste without being weird. NOT Geist.

**Shape language:**
- Squircles 24-32px on cards/large surfaces (iOS 17+ widget aesthetic)
- 14px radius on icon containers
- 32px radius (pill) on buttons
- 18-20px on small chips/badges

**Iconography:**
- Custom paw-based primary icon system (NOT Lucide defaults)
- All SVG, hand-authored
- Icons live in `/frontend/app/components/icons/` as Vue components
- Every icon designed in 24×24 grid with 2-2.5 stroke or solid fill versions

**Illustration system (ALL SVG, hand-authored — Claude's responsibility, not external illustrator):**
- **Brand mascot** — character sticker (warm tan/orange dog or generic friendly mammal) with dimensional shadows, blush cheeks, animated ears/tail. Used on landing hero, empty states, onboarding.
- **Animal category icons** — geometric SVG for dog, cat, rabbit, bird, etc.
- **Empty states** — "no animales encontrados", "no aplicaciones aún", "no notificaciones" — each with mascot variant.
- **Loading states** — paw walk animation (3 dots that morph to paw prints), wagging tail spinner.
- **Status illustrations** — pending (mascot waiting), approved (mascot celebrating), rejected (mascot apologetic, not sad-pitying).
- **Decorative elements** — confetti shapes, scattered dots, soft blob backgrounds.

**Motion language:**
- Spring physics on card hovers (subtle lift + shadow deepen + accent border brighten)
- Page transitions via Vue/Nuxt view-transitions API
- Variable font weight animation on hero text hover
- Marquee strip of recent adopters scrolling continuously at landing footer
- Mascot ear flicks every ~8s on idle
- Fade-up on scroll for content sections
- Skeleton shimmer in pet-themed shape (paw outline) for loading

**Bento grid landing:**
- Hero (full-width)
- Stats block (1×2 spanning) + Featured animal (2×2 spanning) + Recent adoption story (1×1) + Category quick-link (1×1)
- Animal grid section
- Refugios verificados block
- Stories section
- CTA + footer

### C. Org Dashboard Redesign

- Sidebar in same color family (cream/dark), terracota active state with white text
- Dense table views for solicitudes, animales, adoptantes
- Application review surface shows: full numeric score + criticality tags + inconsistency flags + counselor notes section
- Encuentro scheduling widget (calendar + video link generation)
- Foster-to-adopt status tracker
- Post-adoption check-in inbox

## Data Model Changes (Backend Impact)

Phase 3's `AdoptionApplication` likely embeds all adopter-side data. Required refactor:

1. **New entity: `AdopterProfile`** (1:1 with User where role = ADOPTER)
   - Fields: housing, family, lifestyle, generalExperience, photos[]
   - `completionPct` computed
2. **`AdoptionApplication` slimmed to:**
   - `userId` → FK
   - `animalId` → FK
   - `profileSnapshot` — JSON snapshot at time of application (for legal audit)
   - `applicationExtras` — JSONB of answers to animal-specific questions
   - `coAplicanteUserId` / `coAplicanteWhatsapp` + confirmation status
   - `score` + `risks` + `flags` (existing Phase 4 output)
   - `inconsistencyFlags` (NEW, computed from snapshot vs. extras)
   - `state` enum extended with: `EN_ENCUENTRO`, `EN_FOSTER`, `EN_REFLEXION`, `FINALIZADA`, etc.
3. **New entity: `ExtrasTemplate`** (per refugio, per category)
   - Refugio configures question banks tied to animal categories
   - Each question: id, label, criticality, type (single/multi/text), options
4. **New entity: `Encuentro`** (1:1 with Application)
   - Schedule, modality (presencial/video), counselor notes structured fields
5. **New entity: `FosterPeriod`** (optional 1:1 with Application)
   - Start, end, status, return path, counselor check-ins during foster
6. **New entity: `PostAdoptionCheckIn`** (N:1 with Application)
   - Scheduled day (14/60), status, responses (3-question structure for D14, deeper for D60)

Migration must preserve existing applications without data loss — historical applications stay readable in the new schema.

## Out of Scope / Deferred

- Real WhatsApp Business API integration — initial check-ins and co-aplicante confirmations use a stubbed channel + email fallback. Real WhatsApp integration is its own milestone (blocked on API credentials anyway).
- Real-time video call integration in encuentro flow — refugio enters video link manually (Google Meet / Zoom / Whereby) for v3.0. Native integration deferred.
- Adopter geolocation / distance computation — "X km de distancia" on cards needs geolocation infrastructure deferred to v3.1+.
- Profile editing for org admin (POLISH-05 stub) — actual org-profile editing was deferred from v2.1; remains deferred.
- Automated counselor matching — manual assignment for v3.0.
- Photo verification / AI moderation of adopter home photos — deferred.

## Phased Implementation Plan (proposed for v3.0)

This spec produces approximately 5 phases. Detailed plans will be authored via `/gsd-new-milestone` and `/gsd-plan-phase`:

1. **Phase 14: Design System Foundation**
   Color tokens, typography, dark/light mode infrastructure, base squircle/shape primitives, custom SVG icon system, brand mascot SVGs, motion library setup. No user-visible feature changes.

2. **Phase 15: Public Surfaces Redesign**
   Landing (with bento grid + mascot + stats Day 1 layout), public animal listing (with categorical guidance, hidden numeric score), animal dossier page (NEW, mandatory before applying), public refugios verificados page.

3. **Phase 16: Adopter Profile + Application Restructure**
   `AdopterProfile` entity + migration from existing `AdoptionApplication`. Mi Perfil page. Apply-to-Animal flow with profile snapshot + animal extras + co-aplicante WhatsApp link (stubbed channel). Mis aplicaciones table.

4. **Phase 17: Compatibility Safeguards**
   Encuentro scheduling + counselor notes. 48h reflexión enforcement. Foster-to-adopt 14d period. Post-adoption check-ins (Day 14, Day 60) via stubbed channel + email.

5. **Phase 18: Org Dashboard Redesign**
   New sidebar/layout, application review surface (numeric score + criticality + inconsistency flags visible to refugio), `ExtrasTemplate` configuration UI, encuentro/foster/check-in inbox, dashboard analytics.

Each phase produces a vertical slice that's independently shippable but builds toward the milestone.

## UX vs. Due-Diligence Trade-offs (Locked)

**DO streamline:**
- Profile reuse across applications (one-time effort)
- WhatsApp-style photo upload (mobile-first)
- Spanish copy without legalese
- Categorical guidance over numeric scores at the public surface

**DO NOT streamline:**
- Encuentro obligatorio — friction is the product, filters impulse
- 48h reflexión — sleep-on-it research-backed
- Co-aplicante consensus — 22% of returns trace to undetected family disagreement
- Medical-cost acknowledgment for chronic cases
- Dossier-before-apply — informed consent is non-negotiable

## LATAM-Specific Adaptations (Locked)

- **Housing proof:** declaración jurada + photos accepted instead of written landlord auth
- **Vet specialty access:** refugio can mark "requiere vet especialista — solo San Salvador" as hard filter
- **Family decision-making:** co-aplicante = any adult in household
- **Trust building:** "visitá el refugio antes de aplicar" optional path for cultural fit
- **Financial framing:** medical costs in monthly USD ranges, not annual lumps
- **Channel:** WhatsApp for notifications and counselor follow-up, not email-primary

## Stats (Landing — Day 1 layout)

For a brand-new platform with low data, vanity stats look desperate. Day 1 shows:
- Hero stat: "47 animales esperan un hogar hoy" (loss-framed, honest)
- Refugios verificados block with logos + founding-year + verification methodology link
- 3 recent adoption story cards (photo + first name + city + brief testimonial)

Year 2 layout (auto-activates at thresholds: ≥500 cumulative adoptions AND ≥10 refugios):
- "X esperan un hogar" (primary)
- "Y adoptados desde 2026" (cumulative)
- "Z refugios verificados en N ciudades"
- Rotating adoption-story carousel
- "Seguimiento a 6 meses: X% confirmados" — only if real measurement exists

## Risks & Open Questions

- **Migration risk:** moving adopter data from `AdoptionApplication` to `AdopterProfile` is non-trivial. Plan must include zero-downtime migration with backfill from existing applications.
- **Refugio change-management:** existing refugios using v2.x will see a different review surface in Phase 18. Need transition documentation, possibly a "preview new dashboard" toggle during the phase.
- **Brand mascot identity:** must avoid uncanny valley. Multiple SVG iterations expected before lock-in.
- **Performance:** SVG illustrations + variable font + bento grid + scroll animations risks heavy initial bundle. Phase 14 must include lazy-loading strategy and bundle budget.
- **Foster-to-adopt insurance/liability:** El Salvador legal context for foster periods needs verification — does refugio assume liability during foster? Document required.

## Success Criteria

- All public surfaces use the new bento + sticker + custom-iconography design system
- Adopter completes profile once; applies to multiple animals reusing snapshot
- Org admins see numeric score; adopters see categorical guidance only
- All 10 flow steps enforce-able and observable (audit trail)
- Light + dark mode on both surfaces
- All illustrations / icons hand-authored SVG (no external clipart, no Midjourney without curation)
- Lighthouse score ≥ 90 on landing (performance, accessibility, best-practices, SEO)
- Spanish-first; English deferred (no English copy in v3.0)

---

## Appendix A: Visual References

- Wild One (premium minimal pet brand) — palette warmth
- BARK — sticker mascots + copy with personality
- Petfolk — clinical-warm trust signals
- Maxbone — bento + squircles
- Apple iOS 17+ widgets — squircle + sticker dimensional aesthetic
- Linear / Vercel — what to avoid (everyone uses Geist, dark+green is now generic)
- Notion — friendly tactile vs. sterile

## Appendix B: Behavioral Research Citations

- ASPCA Meet Your Match (compatibility framework)
- Match-Up II Matching Tool (paper compatibility predicts ~30% of outcome variance; observed interaction predicts the rest)
- Best Friends Animal Society 2021 — Day 14 check-in cuts returns 15-20%
- Petfinder Foundation 2019 — adopter-visible numeric matching tools INCREASE return rates
- Slovic, Small &amp; Loewenstein 2007 — identifiable victim effect (loss-framing converts)
- Kogut &amp; Ritov 2005 — identifiable beneficiaries beat aggregate stats
- Weiss et al. 2014 — social-desirability bias in adoption applications
- Schindler &amp; Yalch 2006 — specific numbers (1,243) beat round numbers (1,200) for credibility

## Appendix C: Out-of-Brainstorm Decisions Carlos Made

- v2.1 milestone shipped before this redesign
- Both surfaces (org dashboard + public-facing) treated equally
- Light + dark mode required on both
- Animations + catching landing required
- Spanish-first only for v3.0
- Mascot + iconography hand-authored SVG (no paid illustrator budget)
- Real stats with monthly cadence; no live ticker; no "tasa de éxito" claim
- Pill MÉDICO does NOT promise refugio covers costs (corrected)
- Match score numeric hidden from adopter; refugio sees full number
- Criticality tags (CRÍTICA/IMPORTANTE/OPCIONAL) hidden from adopter; refugio sees them
- Co-aplicante = any adult in household (not just legal partner)
- Foster-to-adopt 14d obligatorio for complex categories + inexperienced adopter
- 48h reflexión period mandatory between approval and finalization
- Check-ins Day 14 + Day 60 via WhatsApp (stubbed channel for v3.0)

---

_Spec written: 2026-04-27_
_Brainstorming session: `.superpowers/brainstorm/1963088-1777325555/`_
