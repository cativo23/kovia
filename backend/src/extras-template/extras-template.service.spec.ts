/**
 * ExtrasTemplateService Unit Tests — Phase 16 Plan 04
 *
 * Requirement coverage:
 *   APPLY-03: findForAnimal returns empty questions (not throws) when no template exists.
 *   APPLY-05: criticality field MUST NOT appear in any adopter-facing response.
 *
 * Three-layer enforcement of APPLY-05 is validated here (Layer 3 — test level):
 *   - JSON.stringify regression lock: the string "criticality" must be absent.
 *   - Field presence: public fields (id, text, type, options, required, placeholder) preserved.
 *
 * Wave 0 spec was converted to real assertions in Plan 04 (this file).
 */

import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ExtrasTemplateService } from './extras-template.service';

// ---------------------------------------------------------------------------
// Mock Prisma client factory
// ---------------------------------------------------------------------------

function makeRlsPrisma(overrides: {
  animalResult?: any;
  templateResult?: any;
}) {
  return {
    animal: {
      findUnique: vi.fn().mockResolvedValue(overrides.animalResult ?? null),
    },
    extrasTemplate: {
      findUnique: vi.fn().mockResolvedValue(overrides.templateResult ?? null),
    },
  };
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const ANIMAL_ROW = {
  id: 'animal-1',
  organizationId: 'org-1',
  adoptionCategory: 'SALUDABLE_ADULTO',
};

/** Full raw question WITH criticality (as stored in DB). */
const RAW_QUESTION = {
  id: 'q-uuid-1',
  text: '¿Cuántas caminatas de más de 20 minutos hiciste la semana pasada?',
  type: 'number' as const,
  options: undefined,
  criticality: 'CRITICA', // present in DB — must never reach adopter response
  required: true,
  placeholder: 'Ej: 3',
};

const RAW_QUESTION_2 = {
  id: 'q-uuid-2',
  text: '¿Tenés espacio exterior en tu vivienda?',
  type: 'boolean' as const,
  options: undefined,
  criticality: 'IMPORTANTE',
  required: false,
  placeholder: undefined,
};

const RAW_QUESTION_3 = {
  id: 'q-uuid-3',
  text: '¿Cuántas personas viven en tu hogar?',
  type: 'select' as const,
  options: ['1', '2', '3', '4', '5+'],
  criticality: 'OPCIONAL',
  required: true,
  placeholder: undefined,
};

const TEMPLATE_ROW = {
  id: 'tmpl-1',
  organizationId: 'org-1',
  adoptionCategory: 'SALUDABLE_ADULTO',
  questions: [RAW_QUESTION, RAW_QUESTION_2, RAW_QUESTION_3],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ExtrasTemplateService', () => {
  let service: ExtrasTemplateService;

  describe('findForAnimal', () => {
    it('[APPLY-03] returns empty questions array when no ExtrasTemplate exists for the animal\'s adoptionCategory (does not throw NotFoundException)', async () => {
      const rlsPrisma = makeRlsPrisma({
        animalResult: ANIMAL_ROW,
        templateResult: null, // no template configured for this org+category
      });
      service = new ExtrasTemplateService(rlsPrisma as any);

      const result = await service.findForAnimal('animal-1');

      expect(result).toEqual({ questions: [] });
      expect(result.questions).toHaveLength(0);
    });

    it('throws NotFoundException when the animalId does not exist', async () => {
      const rlsPrisma = makeRlsPrisma({
        animalResult: null, // animal not found
      });
      service = new ExtrasTemplateService(rlsPrisma as any);

      await expect(service.findForAnimal('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('[APPLY-05] response JSON contains no criticality key — JSON.stringify regression lock', async () => {
      const rlsPrisma = makeRlsPrisma({
        animalResult: ANIMAL_ROW,
        templateResult: TEMPLATE_ROW,
      });
      service = new ExtrasTemplateService(rlsPrisma as any);

      const result = await service.findForAnimal('animal-1');
      const serialized = JSON.stringify(result);

      // Primary regression lock: the word "criticality" must be completely absent.
      expect(serialized.indexOf('criticality')).toBe(-1);
      // Secondary lock: the enum values must also be absent.
      expect(serialized.indexOf('CRITICA')).toBe(-1);
      expect(serialized.indexOf('IMPORTANTE')).toBe(-1);
      expect(serialized.indexOf('OPCIONAL')).toBe(-1);
    });

    it('[APPLY-05] preserves id, text, type, options, required, placeholder in public response', async () => {
      const rlsPrisma = makeRlsPrisma({
        animalResult: ANIMAL_ROW,
        templateResult: TEMPLATE_ROW,
      });
      service = new ExtrasTemplateService(rlsPrisma as any);

      const result = await service.findForAnimal('animal-1');

      expect(result.questions).toHaveLength(3);

      const q1 = result.questions[0];
      expect(q1.id).toBe(RAW_QUESTION.id);
      expect(q1.text).toBe(RAW_QUESTION.text);
      expect(q1.type).toBe(RAW_QUESTION.type);
      expect(q1.required).toBe(RAW_QUESTION.required);
      expect(q1.placeholder).toBe(RAW_QUESTION.placeholder);

      const q3 = result.questions[2];
      expect(q3.options).toEqual(['1', '2', '3', '4', '5+']);
    });
  });

  describe('findForAnimalRaw', () => {
    it('findForAnimalRaw returns criticality (internal use only — NOT for HTTP)', async () => {
      const rlsPrisma = makeRlsPrisma({
        animalResult: ANIMAL_ROW,
        templateResult: TEMPLATE_ROW,
      });
      service = new ExtrasTemplateService(rlsPrisma as any);

      const rawQuestions = await service.findForAnimalRaw('animal-1');

      // The raw method is for Plan 06 questionText freeze — criticality MUST be present here.
      expect(rawQuestions).toHaveLength(3);
      expect(rawQuestions[0]).toHaveProperty('criticality', 'CRITICA');
      expect(rawQuestions[1]).toHaveProperty('criticality', 'IMPORTANTE');
      expect(rawQuestions[2]).toHaveProperty('criticality', 'OPCIONAL');
    });

    it('findForAnimalRaw returns empty array when no template exists', async () => {
      const rlsPrisma = makeRlsPrisma({
        animalResult: ANIMAL_ROW,
        templateResult: null,
      });
      service = new ExtrasTemplateService(rlsPrisma as any);

      const rawQuestions = await service.findForAnimalRaw('animal-1');

      expect(rawQuestions).toEqual([]);
    });
  });
});
