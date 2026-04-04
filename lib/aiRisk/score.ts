/** 1 = low concern, 5 = high concern — inverted to a 0–100 “exposure” score for display. */
export interface RiskInputs {
  schedulePressure: number;
  costExposure: number;
  safetyExposure: number;
  weatherOrSite: number;
  stakeholderComplexity: number;
}

export interface RiskScoreResult {
  /** 0–100, higher = more overall risk exposure */
  score: number;
  band: 'Lower' | 'Moderate' | 'Elevated' | 'High';
  /** Human-readable lines */
  breakdown: string[];
}

const LABELS: Record<keyof RiskInputs, string> = {
  schedulePressure: 'Schedule / time pressure',
  costExposure: 'Cost / commercial exposure',
  safetyExposure: 'Safety / compliance exposure',
  weatherOrSite: 'Weather / site difficulty',
  stakeholderComplexity: 'Stakeholder / interface complexity',
};

function clamp1to5(n: number): number {
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/** Weighted mean of 1–5 inputs → 0–100 (higher = more risk). */
export function computeAdvisoryRiskScore(raw: RiskInputs): RiskScoreResult {
  const v: RiskInputs = {
    schedulePressure: clamp1to5(raw.schedulePressure),
    costExposure: clamp1to5(raw.costExposure),
    safetyExposure: clamp1to5(raw.safetyExposure),
    weatherOrSite: clamp1to5(raw.weatherOrSite),
    stakeholderComplexity: clamp1to5(raw.stakeholderComplexity),
  };

  const weights = {
    schedulePressure: 0.22,
    costExposure: 0.22,
    safetyExposure: 0.22,
    weatherOrSite: 0.17,
    stakeholderComplexity: 0.17,
  } as const;

  let wsum = 0;
  for (const k of Object.keys(weights) as (keyof RiskInputs)[]) {
    wsum += v[k] * weights[k];
  }

  const score = Math.round(((wsum - 1) / 4) * 100);
  const band: RiskScoreResult['band'] =
    score < 30 ? 'Lower' : score < 55 ? 'Moderate' : score < 75 ? 'Elevated' : 'High';

  const breakdown = (Object.keys(v) as (keyof RiskInputs)[]).map(
    (k) => `${LABELS[k]}: ${v[k]}/5`
  );

  return { score, band, breakdown };
}
