import { listBudgetProjects } from '@/lib/budget/repository';
import { formatUsdTotal, loadHomeDashboard } from '@/lib/dashboard/homeData';
import { listMilestones } from '@/lib/milestones/repository';
import { listPunchItems } from '@/lib/punchList/repository';
import type { NotificationSettings } from '@/lib/notifications/settings';

function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function milestoneNeedsAttention(plannedYmd: string, actualYmd: string, now: Date): boolean {
  const actual = actualYmd?.trim();
  if (actual) return false;
  const raw = plannedYmd?.trim();
  if (!raw) return false;
  const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  d.setHours(0, 0, 0, 0);
  const limit = new Date(now);
  limit.setDate(limit.getDate() + 30);
  return d.getTime() <= limit.getTime();
}

async function countAttentionMilestones(): Promise<number> {
  const projects = await listBudgetProjects();
  const now = startOfToday();
  let n = 0;
  for (const p of projects) {
    const ms = await listMilestones(p.id);
    for (const m of ms) {
      if (milestoneNeedsAttention(m.plannedDate, m.actualDate, now)) n++;
    }
  }
  return n;
}

async function countOpenPunchItems(): Promise<number> {
  const projects = await listBudgetProjects();
  let n = 0;
  for (const p of projects) {
    const items = await listPunchItems(p.id);
    for (const it of items) {
      if (it.status === 'open' || it.status === 'in_progress') n++;
    }
  }
  return n;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export interface DynamicNotificationBodies {
  dailyBriefing: { title: string; body: string };
  taskReminders: { title: string; body: string };
  permitExpiry: { title: string; body: string };
  milestones: { title: string; body: string };
  safety: { title: string; body: string };
  budgetAlerts: { title: string; body: string };
}

/**
 * Builds notification title/body from live dashboard + tool data.
 * Safe to call when repositories may throw (offline / no projects): falls back to short generic text.
 */
export async function buildDynamicNotificationBodies(
  settings: NotificationSettings
): Promise<DynamicNotificationBodies> {
  const permitDays = settings.permitAlertDays.join('/');
  const fallback: DynamicNotificationBodies = {
    dailyBriefing: {
      title: 'ConstructPro — daily briefing',
      body: 'Review tasks, permits, and milestones for today.',
    },
    taskReminders: {
      title: 'Task reminders',
      body: 'Review pending and overdue tasks.',
    },
    permitExpiry: {
      title: 'Permit expiry check',
      body: `Check permits expiring in ${permitDays} day windows.`,
    },
    milestones: {
      title: 'Milestone reminders',
      body: 'Review upcoming milestones and dependencies.',
    },
    safety: {
      title: 'Safety reminder',
      body: 'Complete safety checks and punch-list follow-ups.',
    },
    budgetAlerts: {
      title: 'Budget alerts',
      body: 'Review budget variance and category spend.',
    },
  };

  try {
    const home = await loadHomeDashboard();
    const [milestoneAttention, punchOpen] = await Promise.all([
      countAttentionMilestones(),
      countOpenPunchItems(),
    ]);

    const urgentTasks = home.tasks.filter((t) => t.status === 'Overdue' || t.status === 'Due Today');
    const taskLine =
      urgentTasks.length === 0
        ? 'No urgent tasks today.'
        : urgentTasks
            .slice(0, 3)
            .map((t) => `${t.title} (${t.projectName})`)
            .join(' · ');

    const briefingBody = truncate(
      `${home.openTaskCount} open tasks · ${home.permitsDueSoonCount} permits need attention · ${home.projectCount} projects`,
      180
    );

    let permitBody: string;
    if (home.permitAlert) {
      const { permitName, projectName, daysUntil, expired } = home.permitAlert;
      permitBody = expired
        ? `${permitName} (${projectName}) — expired`
        : `${permitName} (${projectName}) — ${daysUntil} day(s) to expiry`;
    } else {
      permitBody = 'No permits need attention right now.';
    }

    const mileBody =
      milestoneAttention === 0
        ? 'No upcoming milestones in the next 30 days.'
        : `${milestoneAttention} milestone(s) to review (next 30 days).`;

    const safetyBody =
      punchOpen === 0
        ? 'No open punch items. Keep up good site discipline.'
        : `${punchOpen} open punch item(s) — follow up on site.`;

    const budgetBody = truncate(
      `Planned total ${formatUsdTotal(home.budgetPlannedTotal)} across ${home.projectCount} project(s).`,
      180
    );

    return {
      dailyBriefing: {
        title: 'ConstructPro — today',
        body: briefingBody,
      },
      taskReminders: {
        title: 'Task reminders',
        body: truncate(taskLine, 200),
      },
      permitExpiry: {
        title: 'Permits',
        body: truncate(permitBody, 200),
      },
      milestones: {
        title: 'Milestones',
        body: mileBody,
      },
      safety: {
        title: 'Safety & quality',
        body: safetyBody,
      },
      budgetAlerts: {
        title: 'Budget',
        body: budgetBody,
      },
    };
  } catch {
    return fallback;
  }
}
