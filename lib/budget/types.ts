export interface BudgetProject {
  id: string;
  name: string;
  createdAt: number;
}

export interface BudgetLine {
  id: string;
  category: string;
  label: string;
  planned: number;
  actual: number;
  order: number;
}

export interface BudgetLineInput {
  category: string;
  label: string;
  planned: number;
  actual: number;
}

export interface BudgetTotals {
  planned: number;
  actual: number;
  /** planned − actual (positive = under budget) */
  variance: number;
  byCategory: Record<string, { planned: number; actual: number }>;
}

export const BUDGET_CATEGORY_PRESETS = [
  'Labour',
  'Materials',
  'Equipment',
  'Subcontractors',
  'Fees',
  'Contingency',
  'Other',
] as const;

export function computeBudgetTotals(lines: BudgetLine[]): BudgetTotals {
  const byCategory: Record<string, { planned: number; actual: number }> = {};
  let planned = 0;
  let actual = 0;
  for (const l of lines) {
    planned += l.planned;
    actual += l.actual;
    const c = l.category.trim() || 'Uncategorised';
    if (!byCategory[c]) byCategory[c] = { planned: 0, actual: 0 };
    byCategory[c].planned += l.planned;
    byCategory[c].actual += l.actual;
  }
  return {
    planned,
    actual,
    variance: planned - actual,
    byCategory,
  };
}
