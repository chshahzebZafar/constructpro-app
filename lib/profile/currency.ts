import { CURRENCY_OPTIONS } from '@/lib/profile/preferencesOptions';

export const DEFAULT_CURRENCY_CODE = 'USD';

export function normalizeCurrencyCode(code: string | null | undefined): string {
  const c = (code ?? '').trim().toUpperCase();
  if (!c) return DEFAULT_CURRENCY_CODE;
  return CURRENCY_OPTIONS.some((x) => x.code === c) ? c : DEFAULT_CURRENCY_CODE;
}

export function currencySymbol(code: string): string {
  const c = normalizeCurrencyCode(code);
  return CURRENCY_OPTIONS.find((x) => x.code === c)?.symbol ?? '$';
}

export function formatCurrency(
  n: number,
  code: string,
  options?: Intl.NumberFormatOptions
): string {
  const c = normalizeCurrencyCode(code);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: c,
    maximumFractionDigits: 0,
    ...options,
  }).format(n);
}
