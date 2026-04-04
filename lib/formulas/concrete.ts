export interface ConcreteInputs {
  volumeCubicM: number;
  mixRatio: '1:1.5:3' | '1:2:4' | '1:3:6' | 'custom';
  cementParts?: number;
  sandParts?: number;
  aggParts?: number;
  wastagePercent: number;
  cementPricePerBag?: number;
  sandPricePerM3?: number;
  aggPricePerM3?: number;
}

export interface ConcreteResult {
  cementBags: number;
  cementKg: number;
  sandCubicM: number;
  aggCubicM: number;
  waterLiters: number;
  estimatedCost?: number;
}

const MIX_PRESETS = {
  '1:1.5:3': { c: 1, s: 1.5, a: 3 },
  '1:2:4': { c: 1, s: 2, a: 4 },
  '1:3:6': { c: 1, s: 3, a: 6 },
} as const;

export function calculateConcrete(inputs: ConcreteInputs): ConcreteResult {
  const preset =
    inputs.mixRatio === 'custom'
      ? { c: inputs.cementParts!, s: inputs.sandParts!, a: inputs.aggParts! }
      : MIX_PRESETS[inputs.mixRatio];
  const sum = preset.c + preset.s + preset.a;
  const dryVol = inputs.volumeCubicM * 1.54;
  const wastage = 1 + inputs.wastagePercent / 100;
  const cementKg = (preset.c / sum) * dryVol * 1440 * wastage;
  const sandCubicM = (preset.s / sum) * dryVol * wastage;
  const aggCubicM = (preset.a / sum) * dryVol * wastage;
  const waterLiters = cementKg * 0.45;

  let estimatedCost: number | undefined;
  if (
    inputs.cementPricePerBag !== undefined ||
    inputs.sandPricePerM3 !== undefined ||
    inputs.aggPricePerM3 !== undefined
  ) {
    const bags = Math.ceil(cementKg / 50);
    const cPrice = (inputs.cementPricePerBag ?? 0) * bags;
    const sPrice = (inputs.sandPricePerM3 ?? 0) * sandCubicM;
    const aPrice = (inputs.aggPricePerM3 ?? 0) * aggCubicM;
    const sumCost = cPrice + sPrice + aPrice;
    if (sumCost > 0) estimatedCost = parseFloat(sumCost.toFixed(2));
  }

  return {
    cementBags: Math.ceil(cementKg / 50),
    cementKg: Math.round(cementKg),
    sandCubicM: parseFloat(sandCubicM.toFixed(2)),
    aggCubicM: parseFloat(aggCubicM.toFixed(2)),
    waterLiters: Math.round(waterLiters),
    estimatedCost,
  };
}
