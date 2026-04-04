/** Default site inspection items — IDs stable for persisted check state. */

export interface ChecklistItemDef {
  id: string;
  label: string;
}

export interface ChecklistSectionDef {
  id: string;
  title: string;
  items: ChecklistItemDef[];
}

export const SAFETY_CHECKLIST_SECTIONS: ChecklistSectionDef[] = [
  {
    id: 'general',
    title: 'General & housekeeping',
    items: [
      { id: 'gh_1', label: 'Site tidy; trip hazards controlled' },
      { id: 'gh_2', label: 'Waste segregated and bins provided' },
      { id: 'gh_3', label: 'Lighting adequate for work / movement' },
      { id: 'gh_4', label: 'Fire extinguishers accessible and signed' },
    ],
  },
  {
    id: 'ppe',
    title: 'PPE',
    items: [
      { id: 'ppe_1', label: 'Hard hats worn where required' },
      { id: 'ppe_2', label: 'Hi-vis clothing where required' },
      { id: 'ppe_3', label: 'Safety footwear' },
      { id: 'ppe_4', label: 'Eye / face protection for relevant tasks' },
      { id: 'ppe_5', label: 'Hearing protection where noise risk' },
    ],
  },
  {
    id: 'access',
    title: 'Access & work at height',
    items: [
      { id: 'ah_1', label: 'Ladders / steps suitable and footed' },
      { id: 'ah_2', label: 'Guardrails / edge protection where required' },
      { id: 'ah_3', label: 'Scaffold inspected / tagged if in use' },
    ],
  },
  {
    id: 'plant',
    title: 'Plant & logistics',
    items: [
      { id: 'pl_1', label: 'Plant segregated from pedestrians' },
      { id: 'pl_2', label: 'Banksman / signalling where needed' },
      { id: 'pl_3', label: 'Lifting plan followed for lifts' },
    ],
  },
  {
    id: 'utilities',
    title: 'Temporary services',
    items: [
      { id: 'ut_1', label: 'Cable routing protected / overhead height OK' },
      { id: 'ut_2', label: 'Excavations / services located before dig' },
    ],
  },
];

export function allChecklistItemIds(): string[] {
  return SAFETY_CHECKLIST_SECTIONS.flatMap((s) => s.items.map((i) => i.id));
}
