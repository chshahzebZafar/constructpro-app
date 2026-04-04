import { computeBudgetTotals, type BudgetLine } from '@/lib/budget/types';
import { listBudgetLines, listBudgetProjects } from '@/lib/budget/repository';
import { listTasks } from '@/lib/tasks/repository';
import type { TaskRow } from '@/lib/tasks/types';
import { listMilestones } from '@/lib/milestones/repository';
import type { Milestone } from '@/lib/milestones/types';

export interface AnalyticsSnapshot {
  /** Display name for the scope */
  scopeLabel: string;
  projectCount: number;
  budget: {
    planned: number;
    actual: number;
    variance: number;
    /** (planned − actual) / planned */
    variancePct: number | null;
    /** actual / planned */
    spendRatio: number | null;
  };
  tasks: {
    total: number;
    done: number;
    open: number;
    overdue: number;
  };
  milestones: {
    total: number;
    completed: number;
    /** Forecast after planned, not yet completed */
    atRisk: number;
  };
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

export function taskOverdue(t: TaskRow, today: string): boolean {
  if (t.done) return false;
  const d = t.dueDate?.trim();
  if (!d) return false;
  return d < today;
}

export function milestoneDone(m: Milestone): boolean {
  return Boolean(m.actualDate?.trim());
}

export function milestoneAtRisk(m: Milestone): boolean {
  if (milestoneDone(m)) return false;
  const p = m.plannedDate?.trim();
  const f = m.forecastDate?.trim();
  if (!p || !f) return false;
  return f > p;
}

function accumulateLines(lines: BudgetLine[]) {
  const t = computeBudgetTotals(lines);
  const planned = t.planned;
  const actual = t.actual;
  const variance = t.variance;
  const variancePct = planned > 0 ? variance / planned : null;
  const spendRatio = planned > 0 ? actual / planned : null;
  return { planned, actual, variance, variancePct, spendRatio };
}

function accumulateTasks(tasks: TaskRow[], today: string) {
  let done = 0;
  let overdue = 0;
  for (const x of tasks) {
    if (x.done) done++;
    else if (taskOverdue(x, today)) overdue++;
  }
  const total = tasks.length;
  const open = total - done;
  return { total, done, open, overdue };
}

function accumulateMilestones(rows: Milestone[]) {
  let completed = 0;
  let atRisk = 0;
  for (const m of rows) {
    if (milestoneDone(m)) completed++;
    else if (milestoneAtRisk(m)) atRisk++;
  }
  return { total: rows.length, completed, atRisk };
}

/** Single project analytics */
export async function loadProjectAnalytics(projectId: string, projectName: string): Promise<AnalyticsSnapshot> {
  const today = todayYmd();
  const [lines, tasks, milestones] = await Promise.all([
    listBudgetLines(projectId),
    listTasks(projectId),
    listMilestones(projectId),
  ]);
  return {
    scopeLabel: projectName,
    projectCount: 1,
    budget: accumulateLines(lines),
    tasks: accumulateTasks(tasks, today),
    milestones: accumulateMilestones(milestones),
  };
}

/** Sum metrics across all budget projects */
export async function loadPortfolioAnalytics(): Promise<AnalyticsSnapshot> {
  const today = todayYmd();
  const projects = await listBudgetProjects();
  if (projects.length === 0) {
    return {
      scopeLabel: 'All projects',
      projectCount: 0,
      budget: { planned: 0, actual: 0, variance: 0, variancePct: null, spendRatio: null },
      tasks: { total: 0, done: 0, open: 0, overdue: 0 },
      milestones: { total: 0, completed: 0, atRisk: 0 },
    };
  }

  let planned = 0;
  let actual = 0;
  let tasksTotal = 0;
  let tasksDone = 0;
  let tasksOverdue = 0;
  let msTotal = 0;
  let msCompleted = 0;
  let msAtRisk = 0;

  for (const p of projects) {
    const [lines, tasks, milestones] = await Promise.all([
      listBudgetLines(p.id),
      listTasks(p.id),
      listMilestones(p.id),
    ]);
    const bt = computeBudgetTotals(lines);
    planned += bt.planned;
    actual += bt.actual;

    const ta = accumulateTasks(tasks, today);
    tasksTotal += ta.total;
    tasksDone += ta.done;
    tasksOverdue += ta.overdue;

    const ma = accumulateMilestones(milestones);
    msTotal += ma.total;
    msCompleted += ma.completed;
    msAtRisk += ma.atRisk;
  }

  const variance = planned - actual;
  const variancePct = planned > 0 ? variance / planned : null;
  const spendRatio = planned > 0 ? actual / planned : null;

  return {
    scopeLabel: 'All projects',
    projectCount: projects.length,
    budget: { planned, actual, variance, variancePct, spendRatio },
    tasks: {
      total: tasksTotal,
      done: tasksDone,
      open: tasksTotal - tasksDone,
      overdue: tasksOverdue,
    },
    milestones: { total: msTotal, completed: msCompleted, atRisk: msAtRisk },
  };
}
