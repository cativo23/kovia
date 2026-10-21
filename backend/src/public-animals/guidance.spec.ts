import { describe, it, expect } from 'vitest';
import { computeGuidance, LOCKED_MEDICAL_COPY } from './guidance';

/**
 * guidance.ts unit spec (Phase 15-03 Task 1).
 *
 * Asserts the server-side category→pill mapping is the single source of truth
 * for verde/ámbar/rojo per D-02, and that the LOCKED PUBLIC-06 medical copy
 * appears verbatim for the two `rojo` categories (D-03).
 */
describe('computeGuidance', () => {
  it('returns verde + "Buena pareja" for SALUDABLE_ADULTO with no copy key', () => {
    const result = computeGuidance('SALUDABLE_ADULTO');
    expect(result.color).toBe('verde');
    expect(result.label).toBe('Buena pareja');
    // The function returns `{ color, label, copy: undefined }` — copy is absent
    // in practice (or explicitly undefined). Assert both shapes are acceptable.
    expect(result.copy).toBeUndefined();
  });

  it('returns ambar + "Considerá: edad senior" for SENIOR', () => {
    const result = computeGuidance('SENIOR');
    expect(result.color).toBe('ambar');
    expect(result.label).toBe('Considerá: edad senior');
    expect(result.copy).toBeUndefined();
  });

  it('returns ambar + "Considerá: manejo cuidadoso" for REACTIVO', () => {
    const result = computeGuidance('REACTIVO');
    expect(result.color).toBe('ambar');
    expect(result.label).toBe('Considerá: manejo cuidadoso');
    expect(result.copy).toBeUndefined();
  });

  it('returns rojo + LOCKED PUBLIC-06 copy verbatim for MEDICO_CRONICO', () => {
    const result = computeGuidance('MEDICO_CRONICO');
    expect(result.color).toBe('rojo');
    expect(result.label).toBe('Necesidades especiales · revisá dossier');
    expect(result.copy).toBe(LOCKED_MEDICAL_COPY);
    expect(result.copy).toBe(
      'Animal con condición médica activa. Conocé los detalles y costos antes de aplicar',
    );
  });

  it('returns rojo + LOCKED PUBLIC-06 copy verbatim for ESPECIAL', () => {
    const result = computeGuidance('ESPECIAL');
    expect(result.color).toBe('rojo');
    expect(result.label).toBe('Necesidades especiales · revisá dossier');
    expect(result.copy).toBe(LOCKED_MEDICAL_COPY);
  });
});
