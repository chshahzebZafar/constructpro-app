export type ResourceKind = 'person' | 'plant' | 'material';

export interface ResourceBooking {
  id: string;
  createdAt: number;
  kind: ResourceKind;
  /** Resource name, e.g. "Electrician team", "25t crane", "Rebar bundle" */
  name: string;
  /** Optional quantity / unit, e.g. "3 crews", "2 units" */
  quantityLabel: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD inclusive */
  endDate: string;
  notes: string;
}

export const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = {
  person: 'People',
  plant: 'Plant / equipment',
  material: 'Materials',
};

export const RESOURCE_KINDS: ResourceKind[] = ['person', 'plant', 'material'];
