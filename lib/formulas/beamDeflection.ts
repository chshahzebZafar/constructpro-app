/**
 * Simply supported beam: elastic deflection (UDL or mid-span point load).
 * E in GPa, I in cm⁴, span L in m.
 */

export type BeamLoadType = 'udl' | 'point';

export interface BeamDeflectionInputs {
  loadType: BeamLoadType;
  /** UDL (kN/m) */
  wKnm: number;
  /** Mid-span point load (kN) */
  pointLoadKn: number;
  spanM: number;
  elasticModulusGpa: number;
  secondMomentCm4: number;
}

export interface BeamDeflectionResult {
  deflectionMm: number;
  /** L/δ if δ > 0 */
  spanOverDeflection: number | null;
}

function Icm4ToM4(iCm4: number): number {
  return iCm4 * 1e-8;
}

export function calculateBeamDeflection(inputs: BeamDeflectionInputs): BeamDeflectionResult {
  const E = inputs.elasticModulusGpa * 1e9;
  const I = Icm4ToM4(inputs.secondMomentCm4);
  const L = inputs.spanM;
  let deltaM = 0;

  if (inputs.loadType === 'udl') {
    const w = inputs.wKnm * 1000;
    deltaM = (5 * w * Math.pow(L, 4)) / (384 * E * I);
  } else {
    const P = inputs.pointLoadKn * 1000;
    deltaM = (P * Math.pow(L, 3)) / (48 * E * I);
  }

  const deflectionMm = deltaM * 1000;
  const spanOver = deltaM > 1e-12 ? L / deltaM : null;

  return {
    deflectionMm,
    spanOverDeflection: spanOver,
  };
}

/** Typical SLS limit: δ ≤ L / ratio (e.g. 250 floors, 360 roofs). */
export function deflectionPassesSpanLimit(spanM: number, deflectionMm: number, limitRatio: number): boolean {
  const maxMm = (spanM * 1000) / limitRatio;
  return deflectionMm <= maxMm + 1e-9;
}
