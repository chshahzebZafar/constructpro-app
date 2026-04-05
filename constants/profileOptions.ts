/** Shared with onboarding and profile edit. */

export const COMPANY_SIZES = ['1-5 people', '6-20 people', '21-100 people', '100+ people'] as const;
export type CompanySizeId = (typeof COMPANY_SIZES)[number];

export const PROFILE_ROLES: {
  id: string;
  title: string;
  description: string;
  emoji: string;
}[] = [
  { id: 'pm', title: 'Project Manager', description: 'Plan & coordinate', emoji: '📋' },
  { id: 'engineer', title: 'Site Engineer', description: 'Technical delivery', emoji: '👷' },
  { id: 'safety', title: 'Safety Officer', description: 'HSE compliance', emoji: '🦺' },
  { id: 'qs', title: 'Qty Surveyor', description: 'Costs & quantities', emoji: '📐' },
  { id: 'contractor', title: 'Contractor', description: 'Trade execution', emoji: '🔧' },
  { id: 'owner', title: 'Owner / Director', description: 'Leadership', emoji: '🏢' },
];

export function roleIdFromStoredTitle(storedTitle: string): string | null {
  const t = storedTitle.trim();
  if (!t) return null;
  const found = PROFILE_ROLES.find((r) => r.title === t);
  return found?.id ?? null;
}
