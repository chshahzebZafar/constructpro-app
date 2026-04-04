/**
 * Simplified axial capacity for a rectangular bearing wall/column strip.
 * Design resistance uses material partial factor; optional slenderness reduces capacity (indicative).
 */

export interface LoadBearingInputs {
  /** Bearing width / length of wall (m) */
  widthM: number;
  /** Wall thickness or column depth (m) */
  thicknessM: number;
  /** Clear height for slenderness h/t; 0 = no slenderness reduction */
  heightM: number;
  /** Characteristic compressive strength f (MPa) */
  compressiveStrengthMpa: number;
  /** Partial factor on material strength γM (e.g. 1.5 masonry / concrete) */
  materialPartialFactor: number;
  /** Factored axial demand (kN); 0 = skip FoS / utilization */
  appliedLoadKn: number;
}

export interface LoadBearingResult {
  areaM2: number;
  slendernessRatio: number | null;
  slendernessReduction: number;
  /** f × A × 1000 (no slenderness φ) */
  grossCapacityKn: number;
  /** (f / γM) × A × 1000 × φ */
  designCapacityKn: number;
  factorOfSafety: number | null;
  utilizationPercent: number | null;
}

/** Indicative φ(h/t) for unreinforced masonry–style walls (not a code substitute). */
export function slendernessReduction(hOverT: number): number {
  if (!Number.isFinite(hOverT) || hOverT <= 0) return 1;
  if (hOverT <= 12) return 1;
  if (hOverT <= 27) return Math.max(0.7, 1 - 0.02 * (hOverT - 12));
  return Math.max(0.35, 0.7 - 0.015 * (hOverT - 27));
}

export function calculateLoadBearing(inputs: LoadBearingInputs): LoadBearingResult {
  const A = inputs.widthM * inputs.thicknessM;
  const phi =
    inputs.heightM > 0 && inputs.thicknessM > 0
      ? slendernessReduction(inputs.heightM / inputs.thicknessM)
      : 1;
  const hOverT =
    inputs.heightM > 0 && inputs.thicknessM > 0 ? inputs.heightM / inputs.thicknessM : null;

  const f = inputs.compressiveStrengthMpa;
  const gm = Math.max(inputs.materialPartialFactor, 1e-6);
  const Ngross = f * A * 1000;
  const Nrd = (f / gm) * A * 1000 * phi;

  const Ned = inputs.appliedLoadKn;
  let fos: number | null = null;
  let util: number | null = null;
  if (Ned > 0 && Number.isFinite(Ned)) {
    fos = Nrd / Ned;
    util = (Ned / Nrd) * 100;
  }

  return {
    areaM2: A,
    slendernessRatio: hOverT,
    slendernessReduction: phi,
    grossCapacityKn: Ngross,
    designCapacityKn: Nrd,
    factorOfSafety: fos,
    utilizationPercent: util,
  };
}
