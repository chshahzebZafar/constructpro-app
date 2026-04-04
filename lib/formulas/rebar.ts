export interface RebarInputs {
  memberType: 'slab' | 'beam' | 'column' | 'footing';
  lengthM: number;
  widthM: number;
  diameterMm: 8 | 10 | 12 | 16 | 20 | 25 | 32;
  spacingMm: number;
  layers: number;
  steelPricePerKg?: number;
}

export interface RebarResult {
  numberOfBars: number;
  cuttingLengthM: number;
  totalWeightKg: number;
  estimatedCost?: number;
}

export function calculateRebar(inputs: RebarInputs): RebarResult {
  const numberOfBars =
    (Math.floor((inputs.lengthM * 1000) / inputs.spacingMm) + 1) * inputs.layers;
  const cuttingLengthM = inputs.widthM + 0.3;
  const weightPerMeter = inputs.diameterMm ** 2 / 162;
  const totalWeightKg = weightPerMeter * cuttingLengthM * numberOfBars;
  const tw = parseFloat(totalWeightKg.toFixed(1));
  return {
    numberOfBars,
    cuttingLengthM: parseFloat(cuttingLengthM.toFixed(2)),
    totalWeightKg: tw,
    estimatedCost: inputs.steelPricePerKg
      ? parseFloat((tw * inputs.steelPricePerKg).toFixed(2))
      : undefined,
  };
}
