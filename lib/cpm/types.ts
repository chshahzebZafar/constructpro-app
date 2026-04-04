export interface CpmActivity {
  id: string;
  name: string;
  /** Working days (must be > 0) */
  durationDays: number;
  predecessorIds: string[];
}

export interface CpmActivityResult {
  id: string;
  name: string;
  durationDays: number;
  predecessorIds: string[];
  es: number;
  ef: number;
  ls: number;
  lf: number;
  totalFloat: number;
  critical: boolean;
}

export interface CpmComputeOk {
  ok: true;
  projectDurationDays: number;
  activities: CpmActivityResult[];
}

export interface CpmComputeErr {
  ok: false;
  error: string;
}

export type CpmComputeResult = CpmComputeOk | CpmComputeErr;
