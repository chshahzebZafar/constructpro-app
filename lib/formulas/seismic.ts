/**
 * Simplified lateral seismic base shear: V = Cs × I × W (form common in building codes).
 * Cs and I must be taken from your local code — values here are user-supplied.
 */

export interface SeismicInputs {
  /** Seismic weight / equivalent lateral force weight W (kN) */
  seismicWeightKn: number;
  /** Seismic response coefficient Cs (dimensionless), code-derived */
  responseCoefficientCs: number;
  /** Importance factor I (≥ 1) */
  importanceFactor: number;
}

export interface SeismicResult {
  baseShearKn: number;
}

export function calculateSeismic(inputs: SeismicInputs): SeismicResult {
  const I = Math.max(inputs.importanceFactor, 1);
  const Cs = inputs.responseCoefficientCs;
  const W = inputs.seismicWeightKn;
  return {
    baseShearKn: Cs * I * W,
  };
}
