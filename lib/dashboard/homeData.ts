import { listBudgetProjects, listBudgetLines } from '@/lib/budget/repository';
import { computeBudgetTotals } from '@/lib/budget/types';
import { listPermits } from '@/lib/permits/repository';
import { listTasks } from '@/lib/tasks/repository';
import type { PermitItem } from '@/lib/permits/types';
import type { TaskRow } from '@/lib/tasks/types';

export interface HomeTaskRow {
  id: string;
  title: string;
  projectName: string;
  projectId: string;
  status: 'On Track' | 'Due Today' | 'Overdue';
}

export interface HomePermitAlert {
  permitName: string;
  projectName: string;
  /** Negative = overdue */
  daysUntil: number;
  expired: boolean;
  projectId: string;
}

export interface HomeDashboardData {
  projectCount: number;
  budgetPlannedTotal: number;
  openTaskCount: number;
  permitsDueSoonCount: number;
  tasks: HomeTaskRow[];
  permitAlert: HomePermitAlert | null;
}

function classifyTask(t: TaskRow): HomeTaskRow['status'] {
  if (t.done) return 'On Track';
  const raw = t.dueDate?.trim();
  if (!raw) return 'On Track';
  const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return 'On Track';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const td = new Date(d);
  td.setHours(0, 0, 0, 0);
  if (td < today) return 'Overdue';
  if (td.getTime() === today.getTime()) return 'Due Today';
  return 'On Track';
}

function parseDueMs(d: string | undefined): number {
  const raw = d?.trim();
  if (!raw) return Number.POSITIVE_INFINITY;
  const t = Date.parse(raw.includes('T') ? raw : `${raw}T12:00:00`);
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
}

function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function daysFromExpiry(expiryYmd: string, now: Date): number | null {
  const raw = expiryYmd.trim();
  if (!raw) return null;
  const ed = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
  if (Number.isNaN(ed.getTime())) return null;
  ed.setHours(0, 0, 0, 0);
  return Math.ceil((ed.getTime() - now.getTime()) / 86400000);
}

function permitNeedsAttention(p: PermitItem, now: Date): boolean {
  const days = p.expiryDate ? daysFromExpiry(p.expiryDate, now) : null;
  if (days === null) return false;
  if (p.status === 'expired' || days < 0) return true;
  if (days >= 0 && days <= 30 && (p.status === 'active' || p.status === 'submitted' || p.status === 'pending')) {
    return true;
  }
  return false;
}

export function formatUsdTotal(n: number, currencyCode = 'USD'): string {
  if (!Number.isFinite(n)) return '—';
  if (n === 0) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(0);
  }
  if (Math.abs(n) >= 1_000_000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(n);
}

export async function loadHomeDashboard(): Promise<HomeDashboardData> {
  const projects = await listBudgetProjects();
  let budgetPlannedTotal = 0;
  const incomplete: { task: TaskRow; projectId: string; projectName: string }[] = [];
  const now = startOfToday();
  let permitsDueSoonCount = 0;
  type Cand = {
    permit: PermitItem;
    projectName: string;
    projectId: string;
    days: number;
    expired: boolean;
  };
  const permitCandidates: Cand[] = [];

  for (const p of projects) {
    const lines = await listBudgetLines(p.id);
    budgetPlannedTotal += computeBudgetTotals(lines).planned;

    const tasks = await listTasks(p.id);
    for (const t of tasks) {
      if (!t.done) incomplete.push({ task: t, projectId: p.id, projectName: p.name });
    }

    const permits = await listPermits(p.id);
    for (const permit of permits) {
      const days = permit.expiryDate ? daysFromExpiry(permit.expiryDate, now) : null;
      if (days === null) continue;

      if (permitNeedsAttention(permit, now)) {
        permitsDueSoonCount++;
        const expired = permit.status === 'expired' || days < 0;
        permitCandidates.push({
          permit,
          projectName: p.name,
          projectId: p.id,
          days,
          expired,
        });
      }
    }
  }

  incomplete.sort((a, b) => parseDueMs(a.task.dueDate) - parseDueMs(b.task.dueDate));

  const tasks: HomeTaskRow[] = incomplete.slice(0, 5).map(({ task, projectId, projectName }) => ({
    id: task.id,
    title: task.title,
    projectId,
    projectName,
    status: classifyTask(task),
  }));

  permitCandidates.sort((a, b) => {
    if (a.expired !== b.expired) return a.expired ? -1 : 1;
    return a.days - b.days;
  });

  let permitAlert: HomePermitAlert | null = null;
  if (permitCandidates.length > 0) {
    const c = permitCandidates[0]!;
    permitAlert = {
      permitName: c.permit.name,
      projectName: c.projectName,
      daysUntil: c.days,
      expired: c.expired,
      projectId: c.projectId,
    };
  }

  return {
    projectCount: projects.length,
    budgetPlannedTotal,
    openTaskCount: incomplete.length,
    permitsDueSoonCount,
    tasks,
    permitAlert,
  };
}
