export type IncidentCategory = 'injury' | 'near_miss' | 'property_damage' | 'environmental' | 'other';

export interface IncidentReport {
  id: string;
  createdAt: number;
  title: string;
  siteLocation: string;
  /** YYYY-MM-DD */
  dateOccurred: string;
  timeOccurred: string;
  category: IncidentCategory;
  description: string;
  immediateActions: string;
  witnesses: string;
  reportedBy: string;
}

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  injury: 'Injury',
  near_miss: 'Near miss',
  property_damage: 'Property damage',
  environmental: 'Environmental',
  other: 'Other',
};

export const INCIDENT_CATEGORIES: IncidentCategory[] = [
  'injury',
  'near_miss',
  'property_damage',
  'environmental',
  'other',
];
