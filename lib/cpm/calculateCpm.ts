import type { CpmActivity, CpmActivityResult, CpmComputeResult } from './types';

const EPS = 1e-6;

/** Critical path method: finish-to-start, zero lag. Durations in working days. */
export function calculateCpm(activities: CpmActivity[]): CpmComputeResult {
  if (activities.length === 0) {
    return { ok: false, error: 'Add at least one activity.' };
  }

  const byId = new Map<string, CpmActivity>();
  for (const a of activities) {
    if (byId.has(a.id)) {
      return { ok: false, error: 'Duplicate activity id.' };
    }
    if (!Number.isFinite(a.durationDays) || a.durationDays <= 0) {
      return { ok: false, error: `Activity "${a.name || a.id}" needs duration greater than zero.` };
    }
    byId.set(a.id, a);
  }

  for (const a of activities) {
    const seen = new Set<string>();
    for (const p of a.predecessorIds) {
      if (p === a.id) {
        return { ok: false, error: `Activity "${a.name}" cannot depend on itself.` };
      }
      if (!byId.has(p)) {
        return { ok: false, error: `Unknown predecessor id for "${a.name}".` };
      }
      if (seen.has(p)) {
        return { ok: false, error: `Duplicate predecessor for "${a.name}".` };
      }
      seen.add(p);
    }
  }

  const n = activities.length;
  const indeg = new Map<string, number>();
  const successors = new Map<string, string[]>();
  for (const a of activities) {
    indeg.set(a.id, 0);
    successors.set(a.id, []);
  }
  for (const a of activities) {
    for (const p of a.predecessorIds) {
      indeg.set(a.id, (indeg.get(a.id) ?? 0) + 1);
      const list = successors.get(p);
      if (list) list.push(a.id);
    }
  }

  const queue: string[] = [];
  for (const [id, d] of indeg) {
    if (d === 0) queue.push(id);
  }

  const topo: string[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    topo.push(u);
    for (const v of successors.get(u) ?? []) {
      const next = (indeg.get(v) ?? 0) - 1;
      indeg.set(v, next);
      if (next === 0) queue.push(v);
    }
  }

  if (topo.length !== n) {
    return { ok: false, error: 'The network has a cycle — check predecessor links.' };
  }

  const es = new Map<string, number>();
  const ef = new Map<string, number>();

  for (const id of topo) {
    const a = byId.get(id)!;
    let start = 0;
    for (const p of a.predecessorIds) {
      start = Math.max(start, ef.get(p) ?? 0);
    }
    es.set(id, start);
    ef.set(id, start + a.durationDays);
  }

  let projectDuration = 0;
  for (const id of activities.map((x) => x.id)) {
    projectDuration = Math.max(projectDuration, ef.get(id) ?? 0);
  }

  const ls = new Map<string, number>();
  const lf = new Map<string, number>();

  const rev = [...topo].reverse();
  for (const id of rev) {
    const a = byId.get(id)!;
    const succs = successors.get(id) ?? [];
    if (succs.length === 0) {
      lf.set(id, projectDuration);
    } else {
      let minStartSuccessor = Infinity;
      for (const s of succs) {
        const lsJ = ls.get(s);
        if (lsJ === undefined) {
          return { ok: false, error: 'Internal order error in backward pass.' };
        }
        minStartSuccessor = Math.min(minStartSuccessor, lsJ);
      }
      lf.set(id, minStartSuccessor);
    }
    ls.set(id, lf.get(id)! - a.durationDays);
  }

  const out: CpmActivityResult[] = [];
  for (const a of activities) {
    const eS = es.get(a.id) ?? 0;
    const eF = ef.get(a.id) ?? 0;
    const lS = ls.get(a.id) ?? 0;
    const lF = lf.get(a.id) ?? 0;
    const tf = lS - eS;
    const critical = Math.abs(tf) < EPS;
    out.push({
      id: a.id,
      name: a.name,
      durationDays: a.durationDays,
      predecessorIds: [...a.predecessorIds],
      es: eS,
      ef: eF,
      ls: lS,
      lf: lF,
      totalFloat: tf,
      critical,
    });
  }

  out.sort((x, y) => x.es - y.es || x.name.localeCompare(y.name));

  return { ok: true, projectDurationDays: projectDuration, activities: out };
}
