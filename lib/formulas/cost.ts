export interface CostInputs {
  projectType: 'residential' | 'commercial' | 'industrial' | 'infrastructure';
  areaSqm: number;
  materialGrade: 'basic' | 'standard' | 'premium';
  laborRatePerDay: number;
  laborDays: number;
  contingencyPercent: number;
  taxPercent: number;
}

export interface CostResult {
  materialCost: number;
  laborCost: number;
  contingency: number;
  tax: number;
  total: number;
}

const BASE_RATES: Record<CostInputs['projectType'], number> = {
  residential: 450,
  commercial: 620,
  industrial: 380,
  infrastructure: 520,
};

const GRADE_MULTIPLIERS: Record<CostInputs['materialGrade'], number> = {
  basic: 1.0,
  standard: 1.35,
  premium: 1.75,
};

export function calculateCost(inputs: CostInputs): CostResult {
  const baseRate = BASE_RATES[inputs.projectType];
  const multiplier = GRADE_MULTIPLIERS[inputs.materialGrade];
  const materialCost = inputs.areaSqm * baseRate * multiplier;
  const laborCost = inputs.laborDays * inputs.laborRatePerDay;
  const subtotal = materialCost + laborCost;
  const contingency = subtotal * (inputs.contingencyPercent / 100);
  const tax = (subtotal + contingency) * (inputs.taxPercent / 100);
  const total = subtotal + contingency + tax;
  return { materialCost, laborCost, contingency, tax, total };
}
