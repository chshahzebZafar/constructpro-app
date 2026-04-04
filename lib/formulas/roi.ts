export interface RoiInputs {
  totalInvestment: number;
  expectedRevenue: number;
  durationMonths: number;
  annualOperatingCost: number;
  financingInterestRatePercent: number;
}

export interface RoiResult {
  financingCost: number;
  totalOpex: number;
  grossProfit: number;
  netProfit: number;
  roiPercent: number;
  annualisedRoiPercent: number;
  /** Months to recover investment from average monthly net; null if not profitable monthly */
  breakevenMonths: number | null;
}

export function calculateRoi(inputs: RoiInputs): RoiResult {
  const fin = inputs.financingInterestRatePercent / 100;
  const financingCost = inputs.totalInvestment * fin * (inputs.durationMonths / 12);
  const totalOpex = inputs.annualOperatingCost * (inputs.durationMonths / 12);
  const grossProfit = inputs.expectedRevenue - inputs.totalInvestment;
  const netProfit = grossProfit - totalOpex - financingCost;
  const inv = inputs.totalInvestment;
  const roiPercent = inv > 0 ? (netProfit / inv) * 100 : 0;
  const dm = inputs.durationMonths;
  const annualisedRoiPercent = dm > 0 ? roiPercent * (12 / dm) : 0;
  const monthlyNet = dm > 0 ? netProfit / dm : 0;
  const breakevenMonths =
    monthlyNet > 0 && inv > 0 ? parseFloat((inv / monthlyNet).toFixed(1)) : null;
  return {
    financingCost,
    totalOpex,
    grossProfit,
    netProfit,
    roiPercent,
    annualisedRoiPercent,
    breakevenMonths,
  };
}
