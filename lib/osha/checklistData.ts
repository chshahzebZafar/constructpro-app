/** Indicative OSHA-style construction audit checklist — not legal advice; IDs stable for storage. */

export interface OshaChecklistItemDef {
  id: string;
  label: string;
}

export interface OshaChecklistSectionDef {
  id: string;
  title: string;
  items: OshaChecklistItemDef[];
}

export const OSHA_CHECKLIST_SECTIONS: OshaChecklistSectionDef[] = [
  {
    id: 'records',
    title: 'Programme & records',
    items: [
      { id: 'os_rec_1', label: 'Written safety programme available on site' },
      { id: 'os_rec_2', label: 'Safety meetings / toolbox talks documented' },
      { id: 'os_rec_3', label: 'Incident / near-miss reporting process known to crew' },
    ],
  },
  {
    id: 'ppe_osha',
    title: 'PPE & training',
    items: [
      { id: 'os_ppe_1', label: 'PPE policy enforced (hard hat, eye, foot, hi-vis as required)' },
      { id: 'os_ppe_2', label: 'Task-specific training / competency verified for high-risk work' },
    ],
  },
  {
    id: 'fall',
    title: 'Fall protection',
    items: [
      { id: 'os_fa_1', label: 'Guardrails / covers / hole protection where required' },
      { id: 'os_fa_2', label: 'PFAS / lifelines used where fall hazard exists' },
      { id: 'os_fa_3', label: 'Ladders / scaffolds inspected and used per manufacturer' },
    ],
  },
  {
    id: 'electrical',
    title: 'Electrical',
    items: [
      { id: 'os_el_1', label: 'GFCI / protection for temporary power' },
      { id: 'os_el_2', label: 'Cords / equipment inspected; damaged items removed' },
    ],
  },
  {
    id: 'excavation',
    title: 'Excavation & utilities',
    items: [
      { id: 'os_ex_1', label: 'Utilities located before digging' },
      { id: 'os_ex_2', label: 'Sloping / shoring / trench boxes where required' },
    ],
  },
  {
    id: 'materials',
    title: 'Materials handling',
    items: [
      { id: 'os_mat_1', label: 'Rigging / lifting plan followed for picks' },
      { id: 'os_mat_2', label: 'Exclusion zones for crane / swing areas' },
    ],
  },
  {
    id: 'health',
    title: 'Health & environment',
    items: [
      { id: 'os_he_1', label: 'Dust / noise controls where required' },
      { id: 'os_he_2', label: 'SDS available for hazardous products on site' },
    ],
  },
];

export function allOshaChecklistItemIds(): string[] {
  return OSHA_CHECKLIST_SECTIONS.flatMap((s) => s.items.map((i) => i.id));
}
