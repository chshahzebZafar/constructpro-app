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

export type BearingStatus = 'safe' | 'normal' | 'warning' | 'danger';

export interface FoundationResult {
  requiredAreaM2: number;
  squareSideM: number;
  lengthM: number;
  widthM: number;
  footingSelfWeightKn: number;
  totalLoadOnSoilKn: number;
  bearingPressureKnPerM2: number;
  bearingUtilisationPct: number;
  bearingStatus: BearingStatus;
}

export function calculateFoundation(inputs: FoundationInputs): FoundationResult {
  const q = Math.max(inputs.allowableBearingKnPerM2, 1e-9);
  const d = Math.max(inputs.footingDepthM, 0);
  const gamma = inputs.concreteDensityKnPerM3 > 0 ? inputs.concreteDensityKnPerM3 : 24;
  const P = inputs.columnLoadKn;

  // Analytical closed-form solution: A = P / (q - γ·d)
  // Derived from A = (P + γ·d·A) / q  →  A·q - A·γ·d = P  →  A = P / (q - γ·d)
  // If γ·d ≥ q (pathological input), fall back to neglecting self-weight.
  const netQ = q - gamma * d;
  const A = netQ > 1e-6 ? P / netQ : P / q;
  const sw = gamma * d * A;
  const B = Math.sqrt(Math.max(A, 0));
  const total = P + sw;
  const pressure = total / Math.max(A, 1e-12);

  // Safety badge: classify the SBC (allowable bearing capacity) value itself.
  // Since sizing always uses 100% of SBC by definition, the meaningful check
  // is whether the SBC input represents a structurally adequate soil:
  //   < 75 kN/m²  → Danger  (very soft clay / poor soil — requires specialist review)
  //   75–149      → Warning (weak soil — shallow footings may settle excessively)
  //  150–299      → Normal  (medium soil — acceptable for most structures)
  //   ≥ 300       → Safe    (stiff/dense soil — excellent bearing)
  // These match standard geotechnical classification ranges (BS 8004 / IS 1904).
  const utilisationPct = (pressure / q) * 100; // always ≈ 100 by design, shown for info
  const bearingStatus: BearingStatus =
    q < 75  ? 'danger'  :
    q < 150 ? 'warning' :
    q < 300 ? 'normal'  : 'safe';

  return {
    requiredAreaM2: A,
    squareSideM: B,
    lengthM: B,
    widthM: B,
    footingSelfWeightKn: sw,
    totalLoadOnSoilKn: total,
    bearingPressureKnPerM2: pressure,
    bearingUtilisationPct: utilisationPct,
    bearingStatus,
  };
}
