export type RiskLevel = 'bajo_riesgo' | 'riesgo_moderado' | 'requiere_revision' | 'alto_riesgo';

export interface CategoryScore {
  name: string;
  label: string;       // Spanish display name
  points: number;
  maxPoints: number;
  notes?: string[];
}

export interface RedFlag {
  severity: 'hard' | 'medium' | 'soft';
  code: string;
  message: string;     // Spanish message
}

export interface ScoringResult {
  total: number;
  riskLevel: RiskLevel;
  categories: CategoryScore[];
  redFlags: RedFlag[];
  overridden: boolean;
}

export interface ScoringInput {
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
    goodWithKids: boolean | null;
    goodWithDogs: boolean | null;
    goodWithCats: boolean | null;
    size: string | null;
  };
  adopterHistory?: {
    returnCount: number;
  };
}
