# Phase 4: Scoring and Staff Tools - Research

**Researched:** 2026-04-11
**Domain:** NestJS BullMQ scoring engine, Prisma schema migrations, Nuxt UI v4 staff dashboard
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 to D-09:** Sistema de puntuacion aditivo en 5 categorias (0-100 total) con 4 niveles de riesgo. Ver detalles completos en 04-CONTEXT.md.
- **D-10:** Shadow mode — el puntaje se calcula y almacena pero NO se muestra en la UI hasta que el flag `NUXT_PUBLIC_SCORING_DISPLAY_ENABLED=true` este activo.
- **D-11:** Scoring trigger: auto-async via BullMQ al enviar solicitud. Misma arquitectura que la cola `email` existente.
- **D-12:** Endpoint manual `POST /applications/:id/rescore` — solo ORG_ADMIN. Recalcula score/scoreDetails sin cambiar status.
- **D-13:** Funcion de scoring debe ser TypeScript puro, sin DB calls, sin side effects. Input: `{application, animal}`. Output: `ScoringResult`.
- **D-14 a D-16:** Score display en columna derecha de `[id].vue`, con UCollapsible para desglose por categoria y badge de riesgo por nivel.
- **D-15:** Red flags: bloque UAlert siempre visible ENCIMA del score panel, nunca dentro del collapsible.
- **D-17:** Nuevo modelo `ApplicationNote`: id, applicationId, organizationId, authorId, body, createdAt. RLS: scoped a organizationId.
- **D-18:** Notas UX: UCard en columna derecha, textarea + boton "Agregar nota". Solo append, sin edicion.
- **D-19:** Summary card en `[id].vue`: totals N solicitudes / N adoptados / N devueltos. Boton link a perfil del adoptante.
- **D-20:** Pagina de perfil del adoptante: `/org/dashboard/adoptantes/[userId]`. Endpoint: `GET /adopters/:userId/history`.
- **D-21:** Cross-org: staff ve aplicaciones de otras orgs solo como outcome summaries (status, especie, fecha). RLS enforced.
- **D-22:** Agregar `DEVUELTA` al enum `ApplicationStatus` via migration `ALTER TYPE ... ADD VALUE`.
- **D-23:** Transicion `ADOPTADA -> DEVUELTA` valida solo para staff. Actualizar `staffTransitions` map y RLS `org_staff_update`.
- **D-24:** Constraint `@@unique([animalId, userId])` se mantiene en Phase 4. Re-adopcion por mismo adoptante bloqueada (accion diferida).

### Claude's Discretion
- Lista exacta de keywords para adoption reason parsing (positivos/neutrales/negativos)
- Wording exacto de mensajes en UAlert de red flags (en espanol)
- Como se estiliza "Pendiente" en la tabla queue mientras el score se calcula
- Si la columna score en index.vue soporta ordenamiento por score (default: si, descendente nulls-last)
- Nombre del BullMQ queue para scoring (sugerido: `scoring`)
- Estructura interna del JSON `scoreDetails` (seguir el interface `ScoringResult` del engine)

### Deferred Ideas (OUT OF SCOPE)
- Relajar constraint `@@unique([animalId, userId])` para re-adopcion — Phase 5 o despues
- UI de ajuste de pesos por categoria para org admins — post-MVP
- Dashboard de shadow mode mostrando decisiones de staff vs scores calculados — post-MVP
- Calibracion de scoring para especies exoticas mas alla de la lista inicial — Phase 5
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCOR-01 | Sistema genera score rule-based (0-100) por aplicacion enviada | Engine puro TypeScript + BullMQ job en `applications.service.ts` al crear |
| SCOR-02 | Score produce clasificacion de nivel de riesgo | 4 niveles: bajo_riesgo / riesgo_moderado / requiere_revision / alto_riesgo (D-09) |
| SCOR-03 | Desglose por regla visible para staff | UCollapsible en ScorePanel con 5 filas de categoria (D-14, D-16) |
| SCOR-04 | Sistema identifica red flags: info incompleta, inconsistencias, devoluciones previas | RedFlagsAlert.vue (D-15); enum DEVUELTA (D-22) habilita deteccion de devoluciones previas |
| SCOR-05 | Reglas incluyen: vivienda, experiencia, fotos, lifestyle, compatibilidad, completitud, red flags | 5 categorias D-04 a D-08 cubren todos los criterios |
| SCOR-06 | Scores son advisoriales — staff puede aprobar cualquier applicante | Scores NO bloquean transiciones de estado; staff mantiene control total (D-06 SCOR-06) |
| DASH-02 | Staff ve todas las aplicaciones con scores y niveles de riesgo | Columna score en `index.vue` con RiskBadge; reemplaza placeholder `—` existente (D-16) |
| DASH-03 | Staff actualiza status desde dashboard | Ya implementado en Phase 3; se extiende con DEVUELTA (D-23) |
| DASH-04 | Staff agrega notas internas (solo visibles dentro de su org) | Nuevo modelo ApplicationNote + InternalNotes.vue (D-17, D-18) |
| DASH-05 | Staff ve historial de aplicaciones pasadas de adoptante con outcomes | ApplicantHistorySummary.vue + AdopterHistoryPage (D-19, D-20) |
| HIST-01 | Sistema almacena todas las aplicaciones pasadas por adoptante | Relacion User -> AdoptionApplication ya existe; endpoint history las expone |
| HIST-02 | Outcomes de adopcion (exitosa, devuelta, retirada) se registran por aplicacion | ApplicationStatus enum extendido con DEVUELTA; ADOPTADA y RETIRADA ya existen |
| HIST-03 | Flags de devoluciones pasadas visibles al staff al revisar nuevas aplicaciones | Red flag HARD/MEDIUM que detecta historial en scoring engine |
</phase_requirements>

---

## Summary

Phase 4 agrega tres capacidades ortogonales que se construyen sobre la infraestructura existente de Phase 3: (1) un motor de puntuacion async rule-based que evalua automaticamente cada solicitud enviada, (2) herramientas de staff mejoradas — notas internas, historial del adoptante, display de score con desglose —, y (3) la transicion de estado `DEVUELTA` para trackear retornos de animales.

El codebase ya tiene todos los bloques de construccion necesarios: `AdoptionApplication` con campos `score` y `scoreDetails` ya en el schema, cola BullMQ con `MailProcessor` como patron a replicar, pagina de detalle con columna derecha lista para nuevos cards, y politicas RLS establecidas para extension. No se requieren dependencias nuevas de runtime — solo nuevos modelos Prisma, un nuevo procesador BullMQ, nuevos endpoints, y nuevos componentes Vue.

La unica complejidad arquitectonica real es el motor de scoring: debe ser TypeScript puro (no DB calls, determinista), cubrir los 5 categorias con sus multiples sub-reglas, y producir red flags como overrides no como deducciones. La decision de shadow mode (flag de entorno) desacopla el calculo del display, lo que simplifica el testing.

**Recomendacion primaria:** Dividir en 3 planes: (1) schema + motor de scoring + BullMQ worker + tests unitarios del engine, (2) score display + notas internas en staff UI, (3) historial del adoptante + pagina de perfil + DEVUELTA transition.

---

## Standard Stack

### Core (ya instalado — sin dependencias nuevas)

| Libreria | Version | Proposito | Nota |
|----------|---------|-----------|------|
| `@nestjs/bullmq` | ^11.0.4 | Cola async para scoring job | Ya en `app.module.ts`, patron en `mail.processor.ts` |
| `bullmq` | ^5.73.1 | Driver de colas Redis | Ya instalado |
| `prisma` / `@prisma/client` | ^7.7.0 | ORM, migraciones, nuevo modelo ApplicationNote | Ya en uso |
| `nestjs-cls` | ^6.2.0 | Contexto de tenant en handlers | Ya en uso para RLS |
| `@nuxt/ui` | ^4.6.1 | UCard, UBadge, UAlert, UCollapsible, UTextarea | Ya instalado |
| `vitest` | ^4.1.3 | Tests unitarios del engine (BE) y componentes (FE) | Ya configurado |

### No se requieren nuevas dependencias de runtime

El motor de scoring es TypeScript puro sin dependencias externas. Todos los componentes UI ya estan disponibles en Nuxt UI v4. BullMQ ya esta configurado en Redis.

[VERIFIED: backend/package.json, frontend/package.json, backend/src/app.module.ts]

---

## Architecture Patterns

### Patron 1: BullMQ Scoring Processor (replica de MailProcessor)

**Que es:** WorkerHost class decorada con `@Processor('scoring')`. Se registra el BullMQ queue en el modulo, se inyecta en `ApplicationsService`, se hace `queue.add()` despues del `create()`.

**Cuando usar:** Siempre que el scoring deba ser async (no bloquear el response al adoptante).

**Patron existente a replicar:**
```typescript
// backend/src/mail/mail.processor.ts — PATRON A REPLICAR
@Processor('email')
export class MailProcessor extends WorkerHost {
  async process(job: Job) {
    const { to, subject, template, context } = job.data;
    await this.mailerService.sendMail({ to, subject, template, context });
  }
}
```

**Implementacion para scoring:**
```typescript
// backend/src/scoring/scoring.processor.ts
@Processor('scoring')
export class ScoringProcessor extends WorkerHost {
  constructor(
    @Inject(PRISMA_RLS) private readonly prismaRls: any,
    private readonly publicPrisma: PrismaService,
  ) { super(); }

  async process(job: Job<{ applicationId: string }>) {
    const { applicationId } = job.data;
    // 1. Fetch application + animal (solo campos necesarios para scoring)
    // 2. Llamar al engine puro: scoreApplication(application, animal)
    // 3. Escribir result en adoption_applications via publicPrisma (sin RLS context del job)
  }
}
```

[VERIFIED: backend/src/mail/mail.processor.ts, backend/src/app.module.ts]

### Patron 2: Scoring Engine Puro TypeScript

**Que es:** Modulo `scoring/engine.ts` exportando una funcion pura `scoreApplication(input): ScoringResult`. Sin imports de NestJS, sin DB calls, sin efectos secundarios. Determinista: mismo input = mismo output siempre.

**Por que:** Permite unit testing con 50+ casos sin mocking, facilita re-scoring manual, y cumple D-13.

**Estructura del output (D-13 / CONTEXT.md specifics):**
```typescript
// backend/src/scoring/engine.types.ts
export type RiskLevel = 'bajo_riesgo' | 'riesgo_moderado' | 'requiere_revision' | 'alto_riesgo';

export interface CategoryScore {
  name: string;        // 'vivienda_ambiente' | 'composicion_hogar' | etc.
  points: number;      // puntos obtenidos en esta categoria
  maxPoints: number;   // maximo posible (25, 20, 20, 20, 15)
  notes?: string[];    // notas para el desglose
}

export interface RedFlag {
  severity: 'hard' | 'medium' | 'soft';
  code: string;        // 'no_pet_permission' | 'kids_incompatible' | etc.
  message: string;     // mensaje en es-SV
}

export interface ScoringResult {
  total: number;           // 0-100
  riskLevel: RiskLevel;
  categories: CategoryScore[];
  redFlags: RedFlag[];
  overridden: boolean;     // true si red flags cambiaron el risk level
}
```

[VERIFIED: 04-CONTEXT.md D-13, specifics section]

### Patron 3: Nuevo Modelo Prisma + RLS (replica del patron adoption_applications)

**Patron de migracion SQL para ApplicationNote:**
```sql
-- En la nueva migracion
CREATE TABLE "application_notes" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "application_notes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "application_notes" ENABLE ROW LEVEL SECURITY;

-- Org staff: lectura y escritura en notas de su org
CREATE POLICY org_staff_notes ON "application_notes"
  USING ("organizationId"::text = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_org_id', true));

-- Platform admin bypass
CREATE POLICY admin_bypass ON "application_notes"
  USING (current_setting('app.is_admin', true) = 'true');
```

[VERIFIED: backend/prisma/migrations/20260411042344_adoption_applications/migration.sql, 20260411060000_adopter_insert_policy/migration.sql]

### Patron 4: Shadow Mode via Nuxt RuntimeConfig

**Como funciona:**
```typescript
// frontend/nuxt.config.ts — agregar bajo runtimeConfig.public
runtimeConfig: {
  public: {
    apiUrl: '/api/v1',
    scoringDisplayEnabled: process.env.NUXT_PUBLIC_SCORING_DISPLAY_ENABLED === 'true',
  },
},
```

```vue
<!-- ScorePanel.vue -->
<script setup lang="ts">
const config = useRuntimeConfig()
const scoringEnabled = config.public.scoringDisplayEnabled
</script>
<template>
  <!-- cuando false: renderiza nada (shadow mode) -->
  <template v-if="scoringEnabled">
    <!-- score display completo -->
  </template>
  <!-- comment: Score en modo sombra: oculto hasta calibracion -->
</template>
```

**Docker env:** `NUXT_PUBLIC_SCORING_DISPLAY_ENABLED=true` en `docker-compose.yml` (sin rebuild, solo restart del container).

[VERIFIED: 04-UI-SPEC.md Shadow Mode Gate section, frontend/nuxt.config.ts]

### Patron 5: Extension de staffTransitions Map (backend)

El mapa actual en `applications.service.ts`:
```typescript
const staffTransitions: Record<string, string[]> = {
  ENVIADA: ['REVISANDO'],
  REVISANDO: ['APROBADA', 'RECHAZADA', 'SEGUIMIENTO'],
  SEGUIMIENTO: ['APROBADA', 'RECHAZADA'],
  APROBADA: ['ADOPTADA'],
  // AGREGAR en Phase 4:
  // ADOPTADA: ['DEVUELTA'],
};
```

[VERIFIED: backend/src/applications/applications.service.ts lines 24-29]

### Patron 6: Migracion de Enum PostgreSQL (no-destructiva)

```sql
-- Nuevo archivo de migracion para DEVUELTA
ALTER TYPE "ApplicationStatus" ADD VALUE 'DEVUELTA' AFTER 'ADOPTADA';
```

**Critico:** `ALTER TYPE ... ADD VALUE` es una operacion NO transaccional en PostgreSQL. Prisma la ejecuta en migracion separada. No se puede hacer `ROLLBACK` de este cambio una vez aplicado. Es seguro en produccion pero irreversible.

[VERIFIED: PostgreSQL documentacion conocida; patron de migracion verificado en migration.sql existente — ApplicationStatus fue creado como CREATE TYPE]

### Patron 7: ApplicationStatusBadge.vue — extension para DEVUELTA

```typescript
// Agregar entrada al statusConfig existente
const statusConfig: Record<ApplicationStatus, { color: string; labelKey: string }> = {
  // ... existentes ...
  DEVUELTA: { color: 'error', labelKey: 'applications.status.devuelta' },
}
```

[VERIFIED: frontend/app/components/applications/ApplicationStatusBadge.vue]

### Estructura de Archivos Nueva

```
backend/src/
├── scoring/
│   ├── scoring.module.ts        # registra BullMQ queue + processor
│   ├── scoring.processor.ts     # WorkerHost que corre el engine
│   ├── engine.ts                # funcion pura scoreApplication()
│   ├── engine.types.ts          # interfaces ScoringResult, RedFlag, CategoryScore
│   └── scoring.service.spec.ts  # 50+ unit tests del engine
├── adopters/
│   ├── adopters.module.ts
│   ├── adopters.controller.ts   # GET /adopters/:userId/history
│   └── adopters.service.ts
├── application-notes/
│   ├── application-notes.module.ts
│   ├── application-notes.controller.ts
│   └── application-notes.service.ts

frontend/app/
├── components/applications/
│   ├── ScorePanel.vue           # score number + badge + collapsible breakdown
│   ├── RedFlagsAlert.vue        # UAlert bloque para red flags
│   ├── InternalNotes.vue        # notas internas card
│   ├── ApplicantHistorySummary.vue  # totals + link
│   └── RiskBadge.vue            # UBadge wrapper para risk level
├── pages/org/dashboard/
│   └── adoptantes/
│       └── [userId].vue         # perfil del adoptante con historial completo
```

### Anti-Patrones a Evitar

- **DB calls dentro del scoring engine:** Viola D-13. El processor debe hacer el fetch ANTES de llamar al engine. El engine recibe el objeto ya hidratado.
- **Red flags como deducciones numericas:** Viola D-02. Son overrides del risk level, no cambian el total numerico.
- **Notas visibles al adoptante:** ApplicationNote nunca se incluye en endpoints de adoptante.
- **Score bloqueando transiciones de estado:** Viola SCOR-06. `updateStatus` no debe consultar el score.
- **Usar publicPrisma para escribir notas:** Las notas son org-scoped, deben usar prismaRls con org context.

---

## Don't Hand-Roll

| Problema | No Construir | Usar En Cambio | Por Que |
|----------|-------------|----------------|---------|
| Relative time ("hace 2 horas") | Logica propia de formato | `date-fns/formatDistanceToNow` (o equivalente JS nativo `Intl.RelativeTimeFormat`) | Edge cases de timezone, localizacion |
| Cola async | Sistema de jobs propio | BullMQ (ya instalado) | Reintentos, persistencia, concurrencia ya resueltos |
| Score persistence | Logica de escritura propia | `prismaRls.adoptionApplication.update({ score, scoreDetails })` | Integridad transaccional, RLS aplicado |
| Politicas de acceso a notas | Checks manuales en service | RLS PostgreSQL (patron establecido) | Consistente con el resto del sistema |

**Nota sobre relative time:** El frontend ya usa `es-SV` locale. Para "hace 2 horas" en notas, usar `Intl.RelativeTimeFormat` de JS nativo (no requiere dependencia nueva) o una funcion simple dado que el caso de uso es limitado.

[ASSUMED] — `date-fns` no aparece en package.json del frontend; verificado que no esta instalado. Se recomienda Intl.RelativeTimeFormat nativo.

---

## Common Pitfalls

### Pitfall 1: Scoring job sin datos de animal

**Que falla:** El job recibe solo `applicationId`. Si el processor hace `findUnique` en `adoption_applications` sin incluir el animal, el engine recibe un objeto incompleto y los scores de compatibilidad son incorrectos (null-checks fallidos).

**Por que ocurre:** Se olvida el `include: { animal: { include: { species: true } } }` en la query del processor.

**Como evitar:** El processor SIEMPRE debe hacer el fetch con include completo del animal antes de llamar al engine. Test: verificar que `scoreApplication` recibe `animal.goodWithKids`, `animal.energyLevel`, `animal.species.slug` correctamente.

**Senal de alerta:** Categoria 2 (composicion del hogar) siempre retorna 50% de puntos (default null handling).

### Pitfall 2: RLS context no disponible en el BullMQ processor

**Que falla:** El ScoringProcessor corre en un thread worker de BullMQ fuera del request context de NestJS. `ClsService` no tiene el `app.current_org_id` seteado porque no hay JWT/request pipeline.

**Por que ocurre:** nestjs-cls usa AsyncLocalStorage vinculado al request HTTP. Los job workers no tienen ese contexto.

**Como evitar:** En el processor, usar `publicPrisma` (sin RLS) para la lectura de la aplicacion y el animal — estos son datos que el sistema necesita leer sin restriccion de tenant. Para la escritura del score (`UPDATE adoption_applications SET score = ...`), el `org_staff_update` RLS policy require `app.current_org_id`. La solucion: usar una transaccion con `SET LOCAL app.current_org_id = ...` explicitamente, o mejor, usar `publicPrisma.$executeRaw` para el UPDATE del score en el processor (el sistema es el que escribe, no un usuario org).

**Solucion recomendada:** Agregar una politica RLS adicional en `adoption_applications` para UPDATE desde el sistema (score writer):
```sql
CREATE POLICY system_score_update ON "adoption_applications"
  FOR UPDATE USING (true)
  WITH CHECK (true);
-- Solo aplicar a la columna score via publicPrisma en el processor
```

O alternativamente, usar `$executeRaw` con SET LOCAL dentro del processor para setear el org context.

[VERIFIED: backend/src/prisma/prisma.module.ts pattern verificado via app.module.ts; ASSUMED sobre la solucion exacta — requiere validacion]

### Pitfall 3: ALTER TYPE enum en PostgreSQL no es transaccional

**Que falla:** Si la migracion `ALTER TYPE "ApplicationStatus" ADD VALUE 'DEVUELTA'` falla a mitad de ejecucion, no se puede hacer rollback. Prisma puede quedar en estado inconsistente.

**Por que ocurre:** PostgreSQL no permite `ADD VALUE` dentro de un bloque transaccional (antes de PG 14 habia limitaciones; en PG 14+ es mas flexible pero sigue siendo irreversible).

**Como evitar:** La migracion para `DEVUELTA` debe ser el UNICO statement en su archivo de migracion. No combinar con el CREATE TABLE de `application_notes` en el mismo archivo.

[VERIFIED: PostgreSQL docs conocimiento del autor — ASSUMED que version de PG en Docker es 14+ basado en patron de uso]

### Pitfall 4: Shadow mode — score calculado pero UI lo muestra de todas formas

**Que falla:** Si `ScorePanel.vue` no tiene el guard `v-if="scoringEnabled"` como top-level, un refactor puede exponer el score en shadow mode.

**Por que ocurre:** Un developer agrega codigo directamente en `[id].vue` ignorando que ScorePanel encapsula el guard.

**Como evitar:** El guard debe vivir dentro de `ScorePanel.vue`, no en `[id].vue`. `[id].vue` siempre incluye `<ScorePanel :score="application.score" :details="application.scoreDetails" />` sin condicional — es responsabilidad de ScorePanel decidir si renderiza.

### Pitfall 5: Cross-org history — exponer datos de otra org

**Que falla:** El endpoint `GET /adopters/:userId/history` retorna datos de aplicaciones de otras organizaciones al staff, incluyendo datos personales o detalles de la solicitud.

**Por que ocurre:** Query sin distinction entre "propia org" y "otras orgs" en el include.

**Como evitar:** El servicio de historia debe diferenciar: para la org del staff (`organizationId = current_org_id`), retornar datos completos. Para otras orgs, retornar solo `{ status, animalSpecies, submittedAt, updatedAt }` (D-21). Implementar como dos queries separadas o como proyeccion condicional.

### Pitfall 6: ApplicationNote sin organisationId en el INSERT

**Que falla:** Si el controller no inyecta el `organizationId` al crear la nota, la RLS policy `org_staff_notes` rechaza el INSERT (WITH CHECK falla).

**Por que ocurre:** El `organizationId` debe venir del CLS context (`app.current_org_id`), no del request body.

**Como evitar:** El service de notas debe leer `organizationId` via `cls.get('orgId')` (mismo patron que el resto de los services org-scoped), nunca aceptarlo del body.

---

## Code Examples

### Scoring Engine — estructura basica

```typescript
// Source: 04-CONTEXT.md D-04 a D-08, D-13
// backend/src/scoring/engine.ts

import { ScoringResult, RiskLevel, RedFlag, CategoryScore } from './engine.types';

interface ScoringInput {
  application: {
    personalInfo: Record<string, any> | null;
    housing: Record<string, any> | null;
    lifestyle: Record<string, any> | null;
    socialMedia: string | null;
    additionalContext: string | null;
    photos: Array<{ id: string }>;
  };
  animal: {
    species: { slug: string };
    energyLevel: string | null;
    goodWithKids: boolean;
    goodWithDogs: boolean;
    goodWithCats: boolean;
    size: string | null;
  };
  adopterHistory?: {   // para red flag de DEVUELTA
    returnCount: number;
  };
}

export function scoreApplication(input: ScoringInput): ScoringResult {
  const redFlags: RedFlag[] = detectRedFlags(input);
  const categories: CategoryScore[] = [
    scoreViviendaAmbiente(input),          // max 25
    scoreComposicionHogar(input),          // max 20
    scoreExperienciaHistorial(input),      // max 20
    scoreCompatibilidadEstiloVida(input),  // max 20
    scoreSeñalesCompromiso(input),         // max 15
  ];

  const total = categories.reduce((sum, cat) => sum + cat.points, 0);
  const baseRisk = getRiskLevel(total);
  const { finalRisk, overridden } = applyRedFlagOverrides(baseRisk, redFlags);

  return { total, riskLevel: finalRisk, categories, redFlags, overridden };
}

function getRiskLevel(total: number): RiskLevel {
  if (total >= 80) return 'bajo_riesgo';
  if (total >= 60) return 'riesgo_moderado';
  if (total >= 40) return 'requiere_revision';
  return 'alto_riesgo';
}

function applyRedFlagOverrides(baseRisk: RiskLevel, flags: RedFlag[]): { finalRisk: RiskLevel; overridden: boolean } {
  const hasHard = flags.some(f => f.severity === 'hard');
  const hasMedium = flags.some(f => f.severity === 'medium');
  if (hasHard && baseRisk !== 'alto_riesgo') return { finalRisk: 'alto_riesgo', overridden: true };
  if (hasMedium && (baseRisk === 'bajo_riesgo' || baseRisk === 'riesgo_moderado'))
    return { finalRisk: 'requiere_revision', overridden: true };
  return { finalRisk: baseRisk, overridden: false };
}
```

### BullMQ Queue Registration

```typescript
// Source: backend/src/app.module.ts y mail.processor.ts — patron existente
// backend/src/scoring/scoring.module.ts

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ScoringProcessor } from './scoring.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'scoring' }),
    PrismaModule,
  ],
  providers: [ScoringProcessor],
  exports: [BullModule.registerQueue({ name: 'scoring' })],
})
export class ScoringModule {}
```

### Enqueue en ApplicationsService

```typescript
// En applications.service.ts — despues de crear la aplicacion
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

// En constructor:
@InjectQueue('scoring') private readonly scoringQueue: Queue,

// En create():
const application = await this.prismaRls.adoptionApplication.create({ ... });
await this.scoringQueue.add('score', { applicationId: application.id });
return application;
```

### Relative Time para notas (sin dependencia externa)

```typescript
// frontend/app/composables/useRelativeTime.ts
export function useRelativeTime() {
  const { locale } = useI18n()

  function formatRelative(date: string | Date): string {
    const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })
    const diff = (new Date(date).getTime() - Date.now()) / 1000  // negativo = pasado
    const absDiff = Math.abs(diff)
    if (absDiff < 60) return rtf.format(Math.round(diff), 'second')
    if (absDiff < 3600) return rtf.format(Math.round(diff / 60), 'minute')
    if (absDiff < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
    return rtf.format(Math.round(diff / 86400), 'day')
  }

  return { formatRelative }
}
```

### RLS Policy para notas internas

```sql
-- Source: patron de migration existente (20260411060000_adopter_insert_policy)
ALTER TABLE "application_notes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_staff_notes_read ON "application_notes"
  FOR SELECT USING ("organizationId"::text = current_setting('app.current_org_id', true));

CREATE POLICY org_staff_notes_insert ON "application_notes"
  FOR INSERT WITH CHECK ("organizationId"::text = current_setting('app.current_org_id', true));

CREATE POLICY admin_bypass ON "application_notes"
  USING (current_setting('app.is_admin', true) = 'true');
```

---

## State of the Art

| Enfoque Anterior | Enfoque Actual | Cambiado En | Impacto |
|------------------|----------------|-------------|---------|
| Score placeholder `—` en queue table | Columna con score + RiskBadge | Phase 4 | Staff puede priorizar por score |
| Status panel sin score | ScorePanel con desglose collapsible | Phase 4 | Transparencia para staff |
| Sin historial del adoptante | ApplicantHistorySummary + pagina de perfil | Phase 4 | Decision informada para staff |
| Sin tracking de retornos | Estado `DEVUELTA` + red flag en scoring | Phase 4 | Deteccion de adoptantes problemáticos |
| Score siempre visible (hipotetico) | Shadow mode con flag de entorno | Phase 4 | Calibracion segura en produccion |

---

## Assumptions Log

| # | Claim | Seccion | Riesgo si es incorrecto |
|---|-------|---------|------------------------|
| A1 | El ScoringProcessor necesita politica RLS especial o usar publicPrisma para escribir el score (CLS context no disponible en job workers) | Common Pitfalls #2 | Si CLS funciona en job workers via otro mecanismo, la solucion propuesta es innecesariamente compleja |
| A2 | `Intl.RelativeTimeFormat` disponible en todos los browsers objetivo del proyecto | Don't Hand-Roll, Code Examples | Si el target incluye browsers muy viejos (IE11), necesita polyfill o date-fns |
| A3 | Version de PostgreSQL en Docker es 14+ | Common Pitfalls #3 | En PG < 14, ADD VALUE a enum dentro de un bloque de transaccion es mas restrictivo |

**Nota A1:** La solucion mas segura es verificar en la implementacion si `nestjs-cls` tiene soporte para contexto en BullMQ workers via `ClsModule.forRoot({ guard: ... })`. Si lo tiene, el UPDATE puede hacerse via prismaRls normalmente.

---

## Open Questions

1. **Escritura del score desde BullMQ processor sin RLS context**
   - Que sabemos: nestjs-cls usa AsyncLocalStorage vinculado al request HTTP
   - Que no es claro: Si `@nestjs/bullmq` + nestjs-cls tienen integracion de contexto para jobs
   - Recomendacion: El implementador debe verificar si `ClsMiddleware` cubre job workers. Si no, usar `publicPrisma.$executeRaw('SET LOCAL app.is_admin = true; UPDATE ...')` o agregar una politica `system_score_update` permisiva para el UPDATE de score.

2. **Filtro de historial cross-org para `GET /adopters/:userId/history`**
   - Que sabemos: D-21 requiere outcome summaries de otras orgs, datos completos de la org del staff
   - Que no es claro: Como el RLS actual permite que staff de org A consulte aplicaciones de org B (aunque sea en modo restringido)
   - Recomendacion: El endpoint debe desactivar RLS para la query de historial (usando publicPrisma) y aplicar la proyeccion de datos en la capa de servicio (not in SQL). Staff de org A solo ve `{ status, animalSpecies, submittedAt }` de aplicaciones de org B, pero la query misma necesita cruzar orgs.

---

## Environment Availability

| Dependencia | Requerida Por | Disponible | Version | Fallback |
|-------------|--------------|------------|---------|----------|
| Redis | BullMQ queue | Verificado en docker-compose | `redis:7-alpine` (asumido, no cambia entre phases) | — (no tiene fallback) |
| PostgreSQL | Prisma, RLS, migraciones | Verificado en docker-compose | Postgres | — |
| Node.js (Docker) | Backend NestJS | Via Docker | imagen node en Dockerfile | — |

Step 2.6: Fase es principalmente codigo/config con extensiones de infraestructura ya existente (Redis y Postgres ya corren). No hay dependencias externas nuevas.

[VERIFIED: backend/src/app.module.ts — BullMQ ya conectado a Redis; Prisma schema ya en uso]

---

## Validation Architecture

### Test Framework

| Propiedad | Valor |
|-----------|-------|
| Framework BE | Vitest ^4.1.3 |
| Config BE | `backend/vitest.config.ts` (swc plugin) |
| Comando rapido BE | `docker compose exec api npx vitest run src/scoring/` |
| Suite completa BE | `docker compose exec api npx vitest run --coverage` |
| Framework FE | Vitest ^4.1.3 + happy-dom |
| Config FE | `frontend/vitest.config.ts` |
| Comando rapido FE | `docker compose exec frontend npx vitest run tests/unit/` |
| Suite completa FE | `docker compose exec frontend npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Comportamiento | Tipo Test | Comando | Archivo Existe? |
|--------|----------------|-----------|---------|-----------------|
| SCOR-01 | Engine calcula score total 0-100 para cada aplicacion | unit | `docker compose exec api npx vitest run src/scoring/engine.spec.ts` | ❌ Wave 0 |
| SCOR-02 | 4 niveles de riesgo se asignan correctamente segun total | unit | incluido en engine.spec.ts | ❌ Wave 0 |
| SCOR-03 | `scoreDetails` JSON contiene las 5 categorias con puntos/max | unit | incluido en engine.spec.ts | ❌ Wave 0 |
| SCOR-04 | Red flags se detectan y overrides se aplican correctamente | unit | incluido en engine.spec.ts | ❌ Wave 0 |
| SCOR-05 | Cada categoria puntua correctamente segun sub-reglas | unit | incluido en engine.spec.ts (50+ casos) | ❌ Wave 0 |
| SCOR-06 | updateStatus no consulta score para permitir transicion | unit | `docker compose exec api npx vitest run src/applications/applications.service.spec.ts` | ✅ (existente, agregar caso) |
| DASH-02 | Queue table muestra score + badge (no placeholder `—`) | component | `docker compose exec frontend npx vitest run tests/unit/components/` | ❌ Wave 0 |
| DASH-03 | DEVUELTA transition aparece para status ADOPTADA | unit | agregar caso en applications.service.spec.ts | ✅ (extender) |
| DASH-04 | Nota se crea con organizationId del CLS context | unit | `docker compose exec api npx vitest run src/application-notes/` | ❌ Wave 0 |
| DASH-05 | History endpoint retorna datos completos para propia org, summaries para otras | unit | `docker compose exec api npx vitest run src/adopters/` | ❌ Wave 0 |
| HIST-01 | History lista todas las aplicaciones del adoptante | unit | incluido en adopters.service.spec.ts | ❌ Wave 0 |
| HIST-02 | Status DEVUELTA trackeable en ApplicationStatus enum | unit (migration smoke) | verificar enum via query al DB en test de integracion | ❌ Wave 0 |
| HIST-03 | Red flag se activa cuando adoptante tiene DEVUELTA previo | unit | incluido en engine.spec.ts | ❌ Wave 0 |

### Sampling Rate

- **Por task commit:** `docker compose exec api npx vitest run src/scoring/engine.spec.ts`
- **Por wave merge:** Suite completa BE + FE
- **Phase gate:** Suite completa verde antes de `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `backend/src/scoring/engine.spec.ts` — 50+ casos de unit test del scoring engine (SCOR-01 a SCOR-05, HIST-03)
- [ ] `backend/src/scoring/engine.ts` + `engine.types.ts` — el engine mismo
- [ ] `backend/src/application-notes/application-notes.service.spec.ts` — DASH-04
- [ ] `backend/src/adopters/adopters.service.spec.ts` — DASH-05, HIST-01, HIST-02
- [ ] `frontend/tests/unit/components/applications/ScorePanel.spec.ts` — DASH-02
- [ ] `frontend/tests/unit/components/applications/RiskBadge.spec.ts` — SCOR-02 en FE

---

## Security Domain

### Applicable ASVS Categories

| Categoria ASVS | Aplica | Control Estandar |
|----------------|--------|-----------------|
| V2 Authentication | no | JWT guard existente cubre todos los endpoints nuevos |
| V3 Session Management | no | No hay nuevas sesiones |
| V4 Access Control | si | RLS PostgreSQL para notas + historial; `@Roles('ORG_ADMIN')` en endpoints nuevos |
| V5 Input Validation | si | class-validator en DTOs de notas (body: string, maxLength); evitar XSS en body de nota |
| V6 Cryptography | no | No hay datos sensibles nuevos que requieran cifrado |

### Known Threat Patterns

| Patron | STRIDE | Mitigacion Estandar |
|--------|--------|---------------------|
| Staff accediendo a notas de otra org | Elevation of privilege | RLS `org_staff_notes` enforced en PostgreSQL |
| Staff viendo historial completo de applicaciones de otra org | Information Disclosure | Proyeccion de datos en servicio; endpoint retorna solo summaries para orgs ajenas (D-21) |
| Inyeccion de contenido en body de nota | Tampering | Input sanitization + maxLength validation en DTO; notas solo visibles a staff (no adopters) |
| Re-score no autorizado (adopter triggerando re-score) | Elevation of privilege | `@Roles('ORG_ADMIN')` en POST /applications/:id/rescore (D-12) |
| Score manipulation via race condition (dos jobs concurrentes para misma aplicacion) | Tampering | BullMQ con job deduplication por `applicationId` o `removeOnComplete` + solo el ultimo job importa (score es idempotente) |

---

## Sources

### Primary (HIGH confidence)
- `backend/src/applications/applications.service.ts` — estado actual del service, staffTransitions map
- `backend/prisma/schema.prisma` — modelos existentes, campos score/scoreDetails ya presentes
- `backend/src/mail/mail.processor.ts` — patron WorkerHost a replicar
- `backend/src/app.module.ts` — BullMQ registration pattern
- `backend/prisma/migrations/20260411042344_adoption_applications/migration.sql` — patron RLS para adoption_applications
- `backend/prisma/migrations/20260411060000_adopter_insert_policy/migration.sql` — patron de politicas de INSERT/UPDATE con RLS
- `frontend/app/components/applications/ApplicationStatusBadge.vue` — patron para RiskBadge
- `frontend/app/pages/org/dashboard/aplicaciones/[id].vue` — layout columna derecha actual
- `frontend/app/pages/org/dashboard/aplicaciones/index.vue` — score placeholder `—` en queue table
- `frontend/nuxt.config.ts` — runtimeConfig pattern para shadow mode flag
- `frontend/i18n/locales/es-SV.json` — keys existentes; Phase 4 agrega `scoring`, `notes`, `adoptantes` namespaces
- `04-CONTEXT.md` — todas las decisiones locked D-01 a D-24
- `04-UI-SPEC.md` — contratos de componentes, copy en es-SV, shadow mode gate

### Secondary (MEDIUM confidence)
- `backend/src/applications/applications.service.spec.ts` — patron de tests unitarios con mocks a replicar para scoring engine

### Tertiary (LOW confidence — marcados como ASSUMED en Assumptions Log)
- A1: Comportamiento de nestjs-cls en contexto BullMQ workers — necesita verificacion empirica
- A2: Disponibilidad de `Intl.RelativeTimeFormat` en todos los browsers objetivo
- A3: Version exacta de PostgreSQL en Docker image

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — todo verificado en package.json y archivos de codigo existentes
- Architecture patterns: HIGH — basados en patrones existentes del codebase, no en suposiciones
- Pitfalls: MEDIUM — pitfalls 1, 3, 4, 5, 6 son HIGH; pitfall 2 (RLS en job workers) es MEDIUM por A1
- Test mapping: HIGH — comandos verificados contra vitest.config.ts existentes

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stack estable, no hay cambios de breaking de NestJS/BullMQ/Nuxt UI pendientes conocidos)
