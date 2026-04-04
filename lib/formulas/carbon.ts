/** Simplified embodied carbon (tCO₂e) — indicative factors from spec; local only. */

export interface CarbonInputs {
  projectAreaSqm?: number;
  concreteCubicM: number;
  steelTonnes: number;
  brickCount: number;
  timberCubicM: number;
  tonneKm: number;
  dieselLiters: number;
  electricityKwh: number;
  gridKgCo2PerKwh: number;
  wasteToLandfillTonnes: number;
}

export interface CarbonResult {
  concreteTco2e: number;
  steelTco2e: number;
  brickTco2e: number;
  timberTco2e: number;
  transportTco2e: number;
  machineryTco2e: number;
  electricityTco2e: number;
  wasteTco2e: number;
  totalTco2e: number;
  kgCo2ePerSqm: number | null;
  /** Null when project area not provided */
  rating: 'A+' | 'A' | 'B' | 'C' | 'D' | null;
}

export function calculateCarbon(inputs: CarbonInputs): CarbonResult {
  const concreteTco2e = inputs.concreteCubicM * 0.15;
  const steelTco2e = inputs.steelTonnes * 1.85;
  const brickTco2e = inputs.brickCount * 0.00024;
  const timberTco2e = inputs.timberCubicM * -0.9;
  const transportTco2e = (inputs.tonneKm * 0.096) / 1000;
  const machineryTco2e = (inputs.dieselLiters * 2.68) / 1000;
  const electricityTco2e = (inputs.electricityKwh * inputs.gridKgCo2PerKwh) / 1000;
  const wasteTco2e = (inputs.wasteToLandfillTonnes * 21) / 1000;

  const totalTco2e =
    concreteTco2e +
    steelTco2e +
    brickTco2e +
    timberTco2e +
    transportTco2e +
    machineryTco2e +
    electricityTco2e +
    wasteTco2e;

  const area = inputs.projectAreaSqm;
  const kgCo2ePerSqm =
    area && area > 0 ? (totalTco2e * 1000) / area : null;

  let rating: CarbonResult['rating'] = null;
  if (kgCo2ePerSqm !== null) {
    const k = kgCo2ePerSqm;
    if (k < 300) rating = 'A+';
    else if (k < 500) rating = 'A';
    else if (k < 800) rating = 'B';
    else if (k < 1200) rating = 'C';
    else rating = 'D';
  }

  return {
    concreteTco2e: parseFloat(concreteTco2e.toFixed(3)),
    steelTco2e: parseFloat(steelTco2e.toFixed(3)),
    brickTco2e: parseFloat(brickTco2e.toFixed(3)),
    timberTco2e: parseFloat(timberTco2e.toFixed(3)),
    transportTco2e: parseFloat(transportTco2e.toFixed(3)),
    machineryTco2e: parseFloat(machineryTco2e.toFixed(3)),
    electricityTco2e: parseFloat(electricityTco2e.toFixed(3)),
    wasteTco2e: parseFloat(wasteTco2e.toFixed(3)),
    totalTco2e: parseFloat(totalTco2e.toFixed(3)),
    kgCo2ePerSqm: kgCo2ePerSqm !== null ? parseFloat(kgCo2ePerSqm.toFixed(1)) : null,
    rating,
  };
}
