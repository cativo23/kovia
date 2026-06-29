import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRISMA_RLS } from '../prisma/prisma.module';
import type {
  PublicExtrasQuestionDto,
  PublicExtrasTemplateDto,
} from './dto/public-extras-template.dto';

/**
 * ExtrasTemplateService — Phase 16 Plan 04 (APPLY-03 + APPLY-05).
 *
 * Single-client per CLAUDE.md PATTERN-01: injects only `rlsPrisma` (@Inject(PRISMA_RLS)).
 * Does NOT inject PublicPrismaService — this avoids triggering PATTERN-03 and the
 * associated integration spec overhead (per plan decision).
 *
 * APPLY-05 criticality strip — enforced at THREE layers:
 *   1. Type-level:  `PublicExtrasQuestionDto` interface omits `criticality` entirely.
 *   2. Impl-level:  `toPublicQuestion()` uses an explicit field-by-field copy — no spread.
 *                   The `criticality` field is NEVER read, referenced, or copied.
 *   3. Test-level:  `extras-template.service.spec.ts` JSON.stringify regression lock
 *                   asserts `criticality` is absent from the serialized response.
 *
 * Public API consumed by Plan 06 ApplicationsService:
 *   - `findForAnimal(animalId)`    — adopter-safe response, criticality stripped.
 *   - `findForAnimalRaw(animalId)` — INTERNAL ONLY, includes criticality for questionText freeze.
 *     This method MUST NOT be exposed via any HTTP endpoint.
 */
@Injectable()
export class ExtrasTemplateService {
  constructor(@Inject(PRISMA_RLS) private readonly rlsPrisma: any) {}

  /**
   * Returns the adopter-safe extras template for the given animal.
   *
   * - Throws NotFoundException if the animalId does not exist.
   * - Returns `{ questions: [] }` (NOT throws) when no template exists for
   *   the animal's (organizationId, adoptionCategory) pair. This handles
   *   non-DameTuPataSV orgs that haven't configured templates yet (Pitfall 5).
   */
  async findForAnimal(animalId: string): Promise<PublicExtrasTemplateDto> {
    const animal = await this.rlsPrisma.animal.findUnique({
      where: { id: animalId },
      select: { id: true, organizationId: true, adoptionCategory: true },
    });

    if (!animal) {
      throw new NotFoundException(`Animal with ID ${animalId} not found`);
    }

    const template = await this.rlsPrisma.extrasTemplate.findUnique({
      where: {
        organizationId_adoptionCategory: {
          organizationId: animal.organizationId,
          adoptionCategory: animal.adoptionCategory,
        },
      },
    });

    if (!template) {
      return { questions: [] };
    }

    const rawQuestions: any[] = Array.isArray(template.questions)
      ? template.questions
      : [];

    return {
      questions: rawQuestions.map((q: any) => this.toPublicQuestion(q)),
    };
  }

  /**
   * INTERNAL USE ONLY — Plan 06 ApplicationsService calls this to freeze
   * `questionText` into `extraAnswers` at write time (D-08).
   *
   * Returns the FULL questions JSON including `criticality`. This method
   * MUST NOT be serialized to any HTTP response or called from any controller.
   * The name `findForAnimalRaw` signals its internal-only intent.
   */
  async findForAnimalRaw(animalId: string): Promise<any[]> {
    const animal = await this.rlsPrisma.animal.findUnique({
      where: { id: animalId },
      select: { id: true, organizationId: true, adoptionCategory: true },
    });

    if (!animal) {
      throw new NotFoundException(`Animal with ID ${animalId} not found`);
    }

    const template = await this.rlsPrisma.extrasTemplate.findUnique({
      where: {
        organizationId_adoptionCategory: {
          organizationId: animal.organizationId,
          adoptionCategory: animal.adoptionCategory,
        },
      },
    });

    return Array.isArray(template?.questions) ? template.questions : [];
  }

  /**
   * Maps a raw DB question object to the adopter-safe DTO.
   *
   * CRITICAL: explicit field-by-field copy — spread is FORBIDDEN here.
   * Using `{ ...raw, criticality: undefined }` or `Object.assign({}, raw)`
   * would still expose `criticality` as `undefined` in JSON.stringify output
   * (and in some serializers as `null`), defeating the APPLY-05 regression lock.
   */
  private toPublicQuestion(raw: any): PublicExtrasQuestionDto {
    return {
      id: raw.id,
      text: raw.text,
      type: raw.type,
      options: raw.options,
      required: raw.required,
      placeholder: raw.placeholder,
    };
  }
}
