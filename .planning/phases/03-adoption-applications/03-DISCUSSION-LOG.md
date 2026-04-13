# Phase 3: Adoption Applications - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 03-adoption-applications
**Areas discussed:** Pasos y campos del formulario, Fotos del ambiente, Auth gate al aplicar, Cola de aplicaciones (staff), Persistencia en localStorage, Transiciones de estado

---

## Pasos y campos del formulario

| Option | Description | Selected |
|--------|-------------|----------|
| 4 pasos | Info personal → Vivienda y estilo de vida → Experiencia con mascotas → Fotos del ambiente | ✓ |
| 3 pasos | Info personal + vivienda → Experiencia y contexto → Fotos | |
| 5 pasos | Info personal → Vivienda → Estilo de vida → Experiencia → Fotos | |

**User's choice:** 4 pasos (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Sí, paso de revisión | El adoptante ve un resumen de todo antes de enviar | ✓ |
| No, submit directo | Al terminar el último paso, un botón "Enviar solicitud" | |

**User's choice:** Sí, paso de revisión

| Option | Description | Selected |
|--------|-------------|----------|
| Teléfono + ocupación + fecha nacimiento | Para contacto WhatsApp, evaluar estabilidad, edad | ✓ |
| Teléfono + identificación (DUI) | Mínimo viable | |
| Tú decides | Claude define los campos | |

**User's choice:** Teléfono + ocupación + fecha de nacimiento

| Option | Description | Selected |
|--------|-------------|----------|
| Tipo + propiedad + espacio exterior | Casa/apartamento, propio/alquilado, patio | |
| Tipo + otras personas + otros animales | Tipo de vivienda, adultos/niños, mascotas actuales | |
| Completo: tipo + propiedad + espacio + personas + animales | Toda la información junta | |
| Tú decides | Claude sugiere | ✓ |

**User's choice:** Claude decides (user said "Sugiere tú")
**Notes:** Claude to define full housing step fields including tipo, propiedad/alquiler, permiso mascotas si alquila, espacio exterior, adultos, niños, mascotas actuales

| Option | Description | Selected |
|--------|-------------|----------|
| Experiencia + estilo de vida juntos | Mascotas anteriores, horas solas, nivel de actividad, razones para adoptar | ✓ |
| Solo experiencia pasada | Mascotas anteriores, experiencia con especie específica | |
| Tú decides | Claude organiza los campos | |

**User's choice:** Experiencia + estilo de vida juntos (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| En el paso de revisión como opcionales | Instagram/Facebook y texto libre en el paso final | ✓ |
| En paso 3 como opcionales | Redes sociales junto con experiencia | |
| Tú decides | Claude decide dónde ubica campos opcionales | |

**User's choice:** En el paso de revisión como opcionales (Recommended)

---

## Fotos del ambiente

| Option | Description | Selected |
|--------|-------------|----------|
| Mínimo 2, máximo 8 | 2 requeridas para enviar, hasta 8 opcionales | ✓ |
| Mínimo 1, máximo 5 | Barrera más baja | |
| Opcionales (0 mínimo) | No bloquean el envío | |

**User's choice:** Mínimo 2, máximo 8 (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Mismo PhotoUploader adaptado | Reutiliza presigned URLs, resize client-side, progress bar | ✓ |
| Input file simple con preview | Más ligero, sin arrastrar | |

**User's choice:** Mismo PhotoUploader adaptado (Recommended)

---

## Auth gate al aplicar

| Option | Description | Selected |
|--------|-------------|----------|
| Modal: registrarse o iniciar sesión | Modal con dos opciones, redirige de vuelta al animal | ✓ |
| Redirect a /auth/login con return URL | Redirige a la página de login | |
| Botón deshabilitado con tooltip | Usuario tiene que navegar al login manualmente | |

**User's choice:** Modal: registrarse o iniciar sesión (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Botón cambia a "Ver solicitud" | Muestra estado actual, lleva a solicitud existente | ✓ |
| Bloquear con mensaje | "Ya tienes una solicitud" con link, botón deshabilitado | |

**User's choice:** Botón cambia a "Ver solicitud" (Recommended)

---

## Cola de aplicaciones (staff)

| Option | Description | Selected |
|--------|-------------|----------|
| Sección global "Aplicaciones" en el nav | Nav: Animales \| Aplicaciones \| Perfil | ✓ |
| Tab dentro de cada animal | Staff entra al animal → tab "Solicitudes" | |

**User's choice:** Sección global "Aplicaciones" en el nav (Recommended)
**Notes:** Confirmed nav item was already planned in Phase 2

| Option | Description | Selected |
|--------|-------------|----------|
| Nombre + animal + fecha + estado + acciones | Columnas core para trabajo eficiente | |
| Nombre + estado + puntuación (Fase 4) | Incluye scoring placeholder | |
| Tú decides (con sugerencia del usuario) | Claude define columnas | ✓ |

**User's choice:** Claude decides
**Notes:** User suggested: nombre persona, animal, fecha, puntuación, estado, acciones. Puntuación shows "—" placeholder until Phase 4.

---

## Persistencia en localStorage

| Option | Description | Selected |
|--------|-------------|----------|
| Guardar en cada paso + limpiar al enviar | Auto-save al completar cada paso | |
| Guardar en cada cambio de campo | debounce 500ms en cada campo | |
| Tú decides | Claude define la estrategia | ✓ |

**User's choice:** Claude decides

---

## Transiciones de estado

| Option | Description | Selected |
|--------|-------------|----------|
| Staff: todo menos retirar. Adoptante: solo retirar | Staff maneja el flujo, adoptante solo puede retirar | ✓ |
| Solo staff maneja todas las transiciones | Adoptante no tiene controles | |

**User's choice:** Staff: todo menos retirar. Adoptante: solo retirar (Recommended)

---
