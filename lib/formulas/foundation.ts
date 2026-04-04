/**
 * Square spread footing sizing from column load and allowable bearing (service SBC).
 * Includes approximate footing self-weight (concrete block γ·d·A).
 */

export interface FoundationInputs {
  /** Service or factored column reaction (kN) — be consistent with SBC */
  columnLoadKn: number;
  /** Allowable bearing capacity (kN/m²) */
  allowableBearingKnPerM2: number;
  /** Footing thickness for self-weight estimate (m) */
  footingDepthM: number;
  /** Wet concrete density (kN/m³), default 24 */
  concreteDensityKnPerM3: number;
}

export interface FoundationResult {
  requiredAreaM2: number;
  squareSideM: number;
  footingSelfWeightKn: number;
  totalLoadOnSoilKn: number;
  bearingPressureKnPerM2: number;
}

function iterateFootingArea(
  columnLoadKn: number,
  q: number,
  depthM: number,
  gamma: number,
  iterations: number
): { area: number; sw: number } {
  let A = columnLoadKn / q;
  for (let i = 0; i < iterations; i++) {
    const sw = gamma * depthM * A;
    A = (columnLoadKn + sw) / q;
  }
  const sw = gamma * depthM * A;
  return { area: A, sw };
}

export function calculateFoundation(inputs: FoundationInputs): FoundationResult {
  const q = Math.max(inputs.allowableBearingKnPerM2, 1e-9);
  const d = Math.max(inputs.footingDepthM, 0);
  const gamma = inputs.concreteDensityKnPerM3 > 0 ? inputs.concreteDensityKnPerM3 : 24;

  const { area: A, sw } = iterateFootingArea(inputs.columnLoadKn, q, d, gamma, 8);
  const B = Math.sqrt(Math.max(A, 0));
  const total = inputs.columnLoadKn + sw;
  const pressure = total / Math.max(A, 1e-12);

  return {
    requiredAreaM2: A,
    squareSideM: B,
    footingSelfWeightKn: sw,
    totalLoadOnSoilKn: total,
    bearingPressureKnPerM2: pressure,
  };
}
