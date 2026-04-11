import {
  ScoringInput,
  ScoringResult,
  CategoryScore,
  RedFlag,
  RiskLevel,
} from './engine.types';

// Species classifications
const INDOOR_SPECIES = ['cat', 'gato', 'bird', 'ave', 'pajaro', 'rabbit', 'conejo'];
const EXOTIC_SPECIES = ['rabbit', 'conejo', 'bird', 'ave', 'pajaro', 'reptile', 'reptil', 'hamster', 'fish', 'pez'];

// Adoption reason keywords
const POSITIVE_KEYWORDS = ['companero', 'compania', 'familia', 'responsable', 'responsablemente', 'amo', 'amor', 'quiero', 'hogar', 'rescate', 'adoptar'];
const HARD_REASON_KEYWORDS = ['cria', 'criar', 'breeding', 'pelea', 'fighting', 'guardia', 'guard', 'proteccion'];
const MEDIUM_REASON_KEYWORDS = ['regalo', 'regalar'];

// Activity level ordering
const ACTIVITY_LEVELS = ['low', 'medium', 'high'];

function isIndoorSpecies(slug: string): boolean {
  return INDOOR_SPECIES.includes(slug.toLowerCase());
}

function isExoticSpecies(slug: string): boolean {
  return EXOTIC_SPECIES.includes(slug.toLowerCase());
}

// ============================================================
// Category 1: Vivienda y ambiente (25 pts max)
// ============================================================
function scoreViviendaAmbiente(input: ScoringInput): CategoryScore {
  const housing = input.application.housing ?? {};
  const speciesSlug = input.animal.species.slug.toLowerCase();
  const isIndoor = isIndoorSpecies(speciesSlug);
  const isLargeDog = !isIndoor && input.animal.size === 'LARGE';
  const photos = input.application.photos ?? [];
  const notes: string[] = [];

  let points = 0;

  // Housing type (max 10)
  const housingType = housing.housingType ?? '';
  if (housingType === 'farm' || housingType === 'finca') {
    points += 10;
  } else if (housingType === 'house') {
    points += 8;
  } else if (housingType === 'apartment') {
    points += isIndoor ? 7 : 5;
  } else {
    // Unknown type - give middle value
    points += 4;
  }

  // Ownership status (max 7)
  const ownershipStatus = housing.ownershipStatus ?? '';
  if (ownershipStatus === 'owned') {
    points += 7;
  } else if (ownershipStatus === 'rented') {
    if (housing.petPermission === true) {
      points += 5;
    }
    // no_permission = 0, already at 0
  } else if (ownershipStatus) {
    points += 3; // unknown but provided
  }

  // Outdoor space (max 5)
  const hasOutdoorSpace = housing.hasOutdoorSpace ?? false;
  if (hasOutdoorSpace) {
    points += 5;
  } else if (isIndoor) {
    points += 3; // indoor species don't need outdoor as much
  }

  // Photos bonus (max 3) - uses vivienda photos sub-score
  if (photos.length >= 3) {
    points += 3;
  }

  // Special cap: large dog + apartment + no outdoor => max 8
  if (isLargeDog && housingType === 'apartment' && !hasOutdoorSpace) {
    if (points > 8) {
      points = 8;
      notes.push('Puntuacion limitada: perro grande en apartamento sin espacio exterior');
    }
  }

  // Cap at max
  points = Math.min(25, points);

  return {
    name: 'vivienda_ambiente',
    label: 'Vivienda y ambiente',
    points,
    maxPoints: 25,
    notes,
  };
}

// ============================================================
// Category 2: Composición del hogar (20 pts max)
// ============================================================
function scoreComposicionHogar(input: ScoringInput): CategoryScore {
  const personalInfo = input.application.personalInfo ?? {};
  const animal = input.animal;
  const notes: string[] = [];

  // Children (8 pts)
  let childrenPts = 0;
  const hasChildren = personalInfo.hasChildren;
  if (!hasChildren) {
    childrenPts = 8;
  } else {
    // has children
    if (animal.goodWithKids === true) {
      childrenPts = 8;
    } else if (animal.goodWithKids === false) {
      childrenPts = 0;
    } else {
      // null - uncertain
      childrenPts = 4;
    }
  }

  // Dogs compatibility (6 pts)
  let dogsPts = 0;
  const hasDogs = personalInfo.hasDogs;
  if (!hasDogs) {
    // no dogs
    if (animal.goodWithDogs === false) {
      dogsPts = 6; // no risk
    } else if (animal.goodWithDogs === true) {
      dogsPts = 4;
    } else {
      dogsPts = 3; // null
    }
  } else {
    // has dogs
    if (animal.goodWithDogs === true) {
      dogsPts = 6;
    } else if (animal.goodWithDogs === false) {
      dogsPts = 0;
    } else {
      dogsPts = 3; // null
    }
  }

  // Cats compatibility (6 pts)
  let catsPts = 0;
  const hasCats = personalInfo.hasCats;
  if (!hasCats) {
    if (animal.goodWithCats === false) {
      catsPts = 6; // no risk
    } else if (animal.goodWithCats === true) {
      catsPts = 4;
    } else {
      catsPts = 3; // null
    }
  } else {
    // has cats
    if (animal.goodWithCats === true) {
      catsPts = 6;
    } else if (animal.goodWithCats === false) {
      catsPts = 0;
    } else {
      catsPts = 3; // null
    }
  }

  // When all animal compatibility flags are null, default to 50%: 4+3+3=10
  // This is already handled by the null=3 logic above for dogs and cats
  // and null children=4 when hasChildren
  // If hasChildren=false and all compat null: 8+3+3=14 (not 10, because no risk scenario)
  // The plan says: all null => 50% of available. With no children=8pts,
  // dogs_null=3, cats_null=3 -> 14. With children=null=4, dogs_null=3, cats_null=3 -> 10.
  // This matches the test expectation of 14 when hasChildren=false.

  const total = Math.min(20, childrenPts + dogsPts + catsPts);

  return {
    name: 'composicion_hogar',
    label: 'Composicion del hogar',
    points: total,
    maxPoints: 20,
    notes,
  };
}

// ============================================================
// Category 3: Experiencia e historial (20 pts max)
// ============================================================
function scoreExperienciaHistorial(input: ScoringInput): CategoryScore {
  const personalInfo = input.application.personalInfo ?? {};
  const speciesSlug = input.animal.species.slug.toLowerCase();
  const notes: string[] = [];

  // Prior pet ownership (5 pts for had pets, 2 pts for first time)
  let priorPts = 0;
  const hadPets = personalInfo.hadPetsBefore;
  if (hadPets === true) {
    priorPts = 5;
  } else if (hadPets === false) {
    priorPts = 2;
  } else {
    priorPts = 2; // unknown = first-time default
  }

  // Prior outcome (max 6)
  let outcomePts = 0;
  const outcome = personalInfo.priorPetOutcome;
  if (!outcome || outcome === 'no_prior') {
    outcomePts = 3;
  } else if (outcome === 'still_have' || outcome === 'natural_death') {
    outcomePts = 6;
  } else if (outcome === 'rehomed') {
    outcomePts = 2;
  } else if (outcome === 'ran_away') {
    outcomePts = 1;
  } else if (outcome === 'surrendered' || outcome === 'abandoned') {
    outcomePts = 0;
  } else {
    outcomePts = 2;
  }

  // Species experience match (max 6)
  let speciesPts = 0;
  const experiencedSpecies: string[] = personalInfo.experiencedSpecies ?? [];
  const isExotic = isExoticSpecies(speciesSlug);

  const hasSpeciesExperience = experiencedSpecies.some(
    s => s.toLowerCase() === speciesSlug || s.toLowerCase().includes(speciesSlug) || speciesSlug.includes(s.toLowerCase())
  );

  if (hasSpeciesExperience) {
    speciesPts = 6;
  } else if (isExotic && experiencedSpecies.length === 0 && hadPets === false) {
    speciesPts = 0; // handled as red flag
  } else {
    speciesPts = 2; // no match or unknown
  }

  // Adults in household (max 3)
  let adultsPts = 0;
  const adults = personalInfo.adultsInHousehold;
  if (adults >= 3) {
    adultsPts = 3;
  } else if (adults === 2) {
    adultsPts = 2;
  } else if (adults === 1) {
    adultsPts = 1;
  } else {
    adultsPts = 1; // unknown = 1
  }

  const total = Math.min(20, priorPts + outcomePts + speciesPts + adultsPts);

  return {
    name: 'experiencia_historial',
    label: 'Experiencia e historial',
    points: total,
    maxPoints: 20,
    notes,
  };
}

// ============================================================
// Category 4: Compatibilidad de estilo de vida (20 pts max)
// ============================================================
function scoreCompatibilidadEstiloVida(input: ScoringInput): CategoryScore {
  const lifestyle = input.application.lifestyle ?? {};
  const speciesSlug = input.animal.species.slug.toLowerCase();
  const notes: string[] = [];

  // Hours alone (max 8) - species specific thresholds
  let hoursPts = 0;
  const hoursAlone: number | undefined = lifestyle.hoursAlonePerDay;
  if (hoursAlone !== undefined && hoursAlone !== null) {
    if (speciesSlug === 'dog' || speciesSlug === 'perro') {
      if (hoursAlone < 6) {
        hoursPts = 8;
      } else if (hoursAlone < 8) {
        hoursPts = 5;
      } else {
        hoursPts = 1;
      }
    } else if (speciesSlug === 'cat' || speciesSlug === 'gato') {
      if (hoursAlone < 10) {
        hoursPts = 8;
      } else if (hoursAlone < 12) {
        hoursPts = 5;
      } else {
        hoursPts = 1;
      }
    } else {
      // other species
      if (hoursAlone < 8) {
        hoursPts = 8;
      } else if (hoursAlone < 10) {
        hoursPts = 5;
      } else {
        hoursPts = 1;
      }
    }
  } else {
    hoursPts = 4; // unknown = middle value
  }

  // Activity level match (max 6)
  let activityPts = 0;
  const applicantActivity: string | undefined = lifestyle.activityLevel;
  const animalEnergy = input.animal.energyLevel?.toLowerCase();

  if (applicantActivity && animalEnergy) {
    const applicantIdx = ACTIVITY_LEVELS.indexOf(applicantActivity.toLowerCase());
    const animalIdx = ACTIVITY_LEVELS.indexOf(animalEnergy);

    if (applicantIdx !== -1 && animalIdx !== -1) {
      const diff = Math.abs(applicantIdx - animalIdx);
      if (diff === 0) {
        activityPts = 6;
      } else if (diff === 1) {
        activityPts = 3;
      } else {
        activityPts = 0; // two step mismatch
      }
    } else {
      activityPts = 3; // unknown = middle
    }
  } else {
    activityPts = 3; // unknown = middle
  }

  // Adoption reason (max 6)
  let reasonPts = 3; // default neutral
  const reason: string | undefined = lifestyle.adoptionReason;
  if (reason) {
    const reasonLower = reason.toLowerCase();

    const hasHardKeyword = HARD_REASON_KEYWORDS.some(k => reasonLower.includes(k));
    const hasMediumKeyword = MEDIUM_REASON_KEYWORDS.some(k => reasonLower.includes(k));
    const hasPositiveKeyword = POSITIVE_KEYWORDS.some(k => reasonLower.includes(k));

    if (hasHardKeyword) {
      reasonPts = 0;
    } else if (hasMediumKeyword) {
      reasonPts = 0;
    } else if (hasPositiveKeyword) {
      reasonPts = 6;
    } else {
      reasonPts = 3;
    }
  }

  const total = Math.min(20, hoursPts + activityPts + reasonPts);

  return {
    name: 'compatibilidad_estilo_vida',
    label: 'Compatibilidad de estilo de vida',
    points: total,
    maxPoints: 20,
    notes,
  };
}

// ============================================================
// Category 5: Señales de compromiso (15 pts max)
// ============================================================
function scoresenalesCompromiso(input: ScoringInput): CategoryScore {
  const photos = input.application.photos ?? [];
  const socialMedia = input.application.socialMedia;
  const additionalContext = input.application.additionalContext;
  const personalInfo = input.application.personalInfo ?? {};
  const housing = input.application.housing ?? {};
  const lifestyle = input.application.lifestyle ?? {};
  const notes: string[] = [];

  // Photos (max 5)
  let photosPts = 0;
  if (photos.length >= 3) {
    photosPts = 5;
  } else if (photos.length === 2) {
    photosPts = 3;
  }

  // Social media (max 3)
  const socialPts = socialMedia ? 3 : 0;

  // Additional context (max 4)
  let contextPts = 0;
  if (additionalContext && additionalContext.length > 50) {
    contextPts = 4;
  } else if (additionalContext && additionalContext.length > 0) {
    contextPts = 1;
  }

  // Required fields completeness (max 3)
  let fieldsPts = 0;
  const hasPersonalInfo = personalInfo && Object.keys(personalInfo).length > 0;
  const hasHousing = housing && Object.keys(housing).length > 0;
  const hasLifestyle = lifestyle && Object.keys(lifestyle).length > 0;

  if (hasPersonalInfo && hasHousing && hasLifestyle) {
    fieldsPts = 3;
  } else if (hasPersonalInfo || hasHousing || hasLifestyle) {
    fieldsPts = 2;
  }

  const total = Math.min(15, photosPts + socialPts + contextPts + fieldsPts);

  return {
    name: 'senales_compromiso',
    label: 'Senales de compromiso',
    points: total,
    maxPoints: 15,
    notes,
  };
}

// ============================================================
// Risk level calculation
// ============================================================
function getRiskLevel(total: number): RiskLevel {
  if (total >= 80) return 'bajo_riesgo';
  if (total >= 60) return 'riesgo_moderado';
  if (total >= 40) return 'requiere_revision';
  return 'alto_riesgo';
}

// ============================================================
// Red flag detection
// ============================================================
function detectRedFlags(input: ScoringInput): RedFlag[] {
  const flags: RedFlag[] = [];
  const housing = input.application.housing ?? {};
  const personalInfo = input.application.personalInfo ?? {};
  const lifestyle = input.application.lifestyle ?? {};
  const animal = input.animal;
  const speciesSlug = animal.species.slug.toLowerCase();

  // HARD: Renter without pet permission
  if (housing.ownershipStatus === 'rented' && housing.petPermission === false) {
    flags.push({
      severity: 'hard',
      code: 'no_pet_permission',
      message: 'El solicitante es arrendatario y no tiene permiso del propietario para tener mascotas.',
    });
  }

  // HARD: Children + goodWithKids=false
  if (personalInfo.hasChildren && animal.goodWithKids === false) {
    flags.push({
      severity: 'hard',
      code: 'kids_incompatible',
      message: 'El animal no es compatible con ninos y el hogar tiene menores de edad.',
    });
  }

  // HARD: Current dogs + goodWithDogs=false
  if (personalInfo.hasDogs && animal.goodWithDogs === false) {
    flags.push({
      severity: 'hard',
      code: 'dogs_incompatible',
      message: 'El animal no es compatible con perros y el hogar tiene perros.',
    });
  }

  // HARD: Current cats + goodWithCats=false
  if (personalInfo.hasCats && animal.goodWithCats === false) {
    flags.push({
      severity: 'hard',
      code: 'cats_incompatible',
      message: 'El animal no es compatible con gatos y el hogar tiene gatos.',
    });
  }

  // HARD: Adoption reason contains breeding/fighting keywords
  const reason: string | undefined = lifestyle.adoptionReason;
  if (reason) {
    const reasonLower = reason.toLowerCase();
    if (HARD_REASON_KEYWORDS.some(k => reasonLower.includes(k))) {
      flags.push({
        severity: 'hard',
        code: 'breeding_fighting',
        message: 'La razon de adopcion sugiere uso para cria, pelea u otros fines no permitidos.',
      });
    }
  }

  // MEDIUM: Prior pets surrendered/abandoned
  const outcome = personalInfo.priorPetOutcome;
  if (outcome === 'surrendered' || outcome === 'abandoned') {
    flags.push({
      severity: 'medium',
      code: 'prior_pets_surrendered',
      message: 'Mascotas anteriores reportadas como abandonadas o cedidas sin razon clara.',
    });
  }

  // MEDIUM: Adoption reason "regalo"
  if (reason) {
    const reasonLower = reason.toLowerCase();
    if (MEDIUM_REASON_KEYWORDS.some(k => reasonLower.includes(k))) {
      flags.push({
        severity: 'medium',
        code: 'gift_adoption',
        message: 'La adopcion parece ser un regalo para una tercera persona.',
      });
    }
  }

  // MEDIUM: Exotic species + no experience
  const experiencedSpecies: string[] = personalInfo.experiencedSpecies ?? [];
  const isExotic = isExoticSpecies(speciesSlug);
  if (isExotic && experiencedSpecies.length === 0 && personalInfo.hadPetsBefore === false) {
    flags.push({
      severity: 'medium',
      code: 'exotic_no_experience',
      message: 'Sin experiencia previa con esta especie exotica.',
    });
  }

  // MEDIUM: Applicant age < 21
  const age = personalInfo.age;
  if (typeof age === 'number' && age < 21) {
    flags.push({
      severity: 'medium',
      code: 'applicant_under_21',
      message: 'El solicitante es menor de 21 anos.',
    });
  }

  // MEDIUM: Dog + hours alone > 10h
  const hoursAlone: number | undefined = lifestyle.hoursAlonePerDay;
  if ((speciesSlug === 'dog' || speciesSlug === 'perro') && hoursAlone !== undefined && hoursAlone > 10) {
    flags.push({
      severity: 'medium',
      code: 'dog_long_hours_alone',
      message: 'El perro estaria solo mas de 10 horas al dia.',
    });
  }

  // SOFT: Activity mismatch >= 2 levels for dogs
  const applicantActivity: string | undefined = lifestyle.activityLevel;
  const animalEnergy = animal.energyLevel?.toLowerCase();
  if ((speciesSlug === 'dog' || speciesSlug === 'perro') && applicantActivity && animalEnergy) {
    const applicantIdx = ACTIVITY_LEVELS.indexOf(applicantActivity.toLowerCase());
    const animalIdx = ACTIVITY_LEVELS.indexOf(animalEnergy);
    if (applicantIdx !== -1 && animalIdx !== -1 && Math.abs(applicantIdx - animalIdx) >= 2) {
      flags.push({
        severity: 'soft',
        code: 'activity_mismatch',
        message: 'El nivel de actividad del solicitante difiere significativamente del del animal.',
      });
    }
  }

  // MEDIUM: Repeat returns — adopter has returned 2 or more animals previously
  if (input.adopterHistory && input.adopterHistory.returnCount >= 2) {
    flags.push({
      severity: 'medium',
      code: 'repeat_return',
      message: `El solicitante ha devuelto ${input.adopterHistory.returnCount} animales anteriormente.`,
    });
  }

  return flags;
}

// ============================================================
// Apply red flag overrides to risk level
// ============================================================
function applyRedFlagOverrides(
  baseRisk: RiskLevel,
  flags: RedFlag[],
): { finalRisk: RiskLevel; overridden: boolean } {
  const hasHard = flags.some(f => f.severity === 'hard');
  const hasMedium = flags.some(f => f.severity === 'medium');

  if (hasHard) {
    // overridden=true whenever HARD flags are present (they forced/confirm alto_riesgo)
    return { finalRisk: 'alto_riesgo', overridden: true };
  }

  if (hasMedium) {
    if (baseRisk === 'bajo_riesgo' || baseRisk === 'riesgo_moderado') {
      return { finalRisk: 'requiere_revision', overridden: true };
    }
  }

  return { finalRisk: baseRisk, overridden: false };
}

// ============================================================
// Main scoring function (PURE - no side effects)
// ============================================================
export function scoreApplication(input: ScoringInput): ScoringResult {
  const categories = [
    scoreViviendaAmbiente(input),
    scoreComposicionHogar(input),
    scoreExperienciaHistorial(input),
    scoreCompatibilidadEstiloVida(input),
    scoresenalesCompromiso(input),
  ];

  const total = categories.reduce((sum, cat) => sum + cat.points, 0);
  const baseRisk = getRiskLevel(total);
  const redFlags = detectRedFlags(input);
  const { finalRisk, overridden } = applyRedFlagOverrides(baseRisk, redFlags);

  return {
    total,
    riskLevel: finalRisk,
    categories,
    redFlags,
    overridden,
  };
}
