# Phase 4: Scoring and Staff Tools - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 04-scoring-and-staff-tools
**Areas discussed:** Reglas de Puntuación, Cuándo y cómo puntuar, Display del score, Notas internas y historial, Tracking de devoluciones pasadas

---

## Reglas de Puntuación

| Option | Description | Selected |
|--------|-------------|----------|
| 5 categorías ponderadas | Vivienda 25 + Hogar 20 + Experiencia 20 + Estilo 20 + Compromiso 15. Red flags = override. | ✓ |
| Aditivo plano | Cada regla suma puntos directamente, sin categorías. | |
| Deducción desde 100 | Empieza en 100 y se restan puntos por riesgos. | |

**User's choice:** 5 categorías ponderadas
**Notes:** Usuario pidió investigación profunda. Se usó agente Opus para research de plataformas existentes (ShelterLuv, PetPoint, Rescue Groups). Hallazgo: ninguna plataforma tiene scoring automatizado — Kovia es diferenciadora. Se adoptó la filosofía "deal-breakers primero, compatibilidad segundo". El Opus agent diseñó el sistema completo con reglas específicas por campo.

| Option | Description | Selected |
|--------|-------------|----------|
| 4 niveles 80/60/40 | bajo / moderado / requiere revisión / alto. | ✓ |
| 3 niveles 70/40 | bajo / medio / alto. | |

**User's choice:** 4 niveles — 80-100 bajo / 60-79 moderado / 40-59 requiere revisión / 0-39 alto

| Option | Description | Selected |
|--------|-------------|----------|
| Shadow mode primero | Score calculado pero no visible hasta calibración. | ✓ |
| Mostrar desde el inicio | Score visible desde day 1. | |

**User's choice:** Shadow mode para las primeras 30-50 aplicaciones del piloto.

---

## Cuándo y cómo puntuar

| Option | Description | Selected |
|--------|-------------|----------|
| Auto async + re-score manual | BullMQ al enviar + POST /:id/rescore para ORG_ADMIN | ✓ |
| Auto async solamente | BullMQ al enviar, sin re-score. | |
| Auto sync (inline) | Score en el mismo request de submit. | |

**User's choice:** Auto async + re-score manual
**Notes:** BullMQ ya está instalado en el proyecto para mail. El mismo patrón WorkerHost aplica directamente.

---

## Display del score

| Option | Description | Selected |
|--------|-------------|----------|
| Score + collapsible en panel derecho | Score visible, desglose expandible. UCollapsible nativo. | ✓ |
| UCard dedicado en columna izquierda | Siempre visible, encima de datos de la aplicación. | |
| Badge + modal | Score compacto + click para tabla completa. | |

**User's choice:** Score + collapsible en panel derecho

| Option | Description | Selected |
|--------|-------------|----------|
| Alertas rojas siempre visibles | Bloque de alertas arriba del score. Siempre visible. | ✓ |
| Dentro del desglose collapsible | Flags solo visibles al expandir. | |
| Badge contador | Score muestra "2 flags", expandir para ver. | |

**User's choice:** Alertas rojas siempre visibles (no collapsible, no click requerido)

---

## Notas internas y historial

| Option | Description | Selected |
|--------|-------------|----------|
| Panel en columna derecha | UCard "Notas internas" en [id].vue. Append-only. | ✓ |
| Drawer lateral | Slide-over al hacer click. | |

**User's choice:** Panel en columna derecha

| Option | Description | Selected |
|--------|-------------|----------|
| Resumen en detalle + página completa | Tarjeta resumen en [id].vue + /adoptantes/[userId]. | ✓ |
| Solo en la página de detalle | Todo en [id].vue, sin ruta separada. | |
| Solo página separada | /adoptantes/[userId] únicamente. | |

**User's choice:** Híbrido — resumen compacto inline + página completa de adoptante

---

## Tracking de devoluciones pasadas

| Option | Description | Selected |
|--------|-------------|----------|
| Nuevo estado DEVUELTA | ALTER TYPE migration, terminal desde ADOPTADA. | ✓ |
| Campos returnedAt + returnReason | Dos columnas nullable, preserva ADOPTADA. | |
| No trackear en Phase 4 | Diferir. | |

**User's choice:** Nuevo estado DEVUELTA en el ApplicationStatus enum
**Notes:** Gap detectado por el agente durante el análisis — HIST-02 requería tracking de outcomes pero el schema no tenía forma de registrar una devolución. Migración non-destructiva (ALTER TYPE ADD VALUE).
