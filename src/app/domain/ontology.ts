import { Task, TaskDraft, Triple } from './types';
import { newId } from './id';

/**
 * Immutable ontology graph of tasks. All mutations return a new instance so it
 * plays well with Angular signals (set/update with a fresh reference).
 */
export class OntologyGraph {
  private constructor(readonly tasks: ReadonlyArray<Task>) {}

  static empty(): OntologyGraph {
    return new OntologyGraph([]);
  }

  static fromTasks(tasks: Task[]): OntologyGraph {
    return new OntologyGraph(tasks);
  }

  /** Insert drafts, resolving dependsOnTitles within the same batch + existing tasks. */
  upsertDrafts(drafts: TaskDraft[]): OntologyGraph {
    const created: Task[] = [];
    const titleToId = new Map<string, string>();
    for (const t of this.tasks) titleToId.set(normalize(t.title), t.id);

    // First pass: create tasks and register titles.
    for (const d of drafts) {
      const id = newId('t');
      titleToId.set(normalize(d.title), id);
      created.push({
        id,
        title: d.title,
        start: d.start ?? null,
        end: d.end ?? null,
        location: d.location ?? null,
        priority: d.priority,
        category: d.category,
        status: 'pending',
        dependsOn: [],
        xpReward: d.priority === 'main' ? 100 : 30,
        createdAt: new Date().toISOString(),
      });
    }

    // Second pass: resolve explicit dependencies by title.
    created.forEach((task, i) => {
      const titles = drafts[i].dependsOnTitles ?? [];
      task.dependsOn = titles
        .map((t) => titleToId.get(normalize(t)))
        .filter((id): id is string => !!id && id !== task.id);
    });

    const next = new OntologyGraph([...this.tasks, ...created]);
    return next.inferImplicitOrder();
  }

  /** Add implicit BEFORE edges based on start time when no explicit dep exists. */
  inferImplicitOrder(): OntologyGraph {
    const timed = [...this.tasks]
      .filter((t) => t.start || t.end)
      .sort((a, b) => keyTime(a) - keyTime(b));
    const tasks = this.tasks.map((t) => ({ ...t, dependsOn: [...t.dependsOn] }));
    const byId = new Map(tasks.map((t) => [t.id, t]));

    for (let i = 1; i < timed.length; i++) {
      const cur = byId.get(timed[i].id)!;
      const prev = timed[i - 1];
      if (cur.dependsOn.length === 0 && cur.priority === 'main') {
        if (!cur.dependsOn.includes(prev.id)) cur.dependsOn.push(prev.id);
      }
    }
    return new OntologyGraph(tasks);
  }

  markDone(taskIds: string[]): OntologyGraph {
    const set = new Set(taskIds);
    return new OntologyGraph(
      this.tasks.map((t) => (set.has(t.id) ? { ...t, status: 'done' as const } : t)),
    );
  }

  markSkipped(taskIds: string[]): OntologyGraph {
    const set = new Set(taskIds);
    return new OntologyGraph(
      this.tasks.map((t) => (set.has(t.id) ? { ...t, status: 'skipped' as const } : t)),
    );
  }

  removeLast(): OntologyGraph {
    if (this.tasks.length === 0) return this;
    return new OntologyGraph(this.tasks.slice(0, -1));
  }

  predecessorsOf(taskId: string): Task[] {
    const t = this.tasks.find((x) => x.id === taskId);
    if (!t) return [];
    return t.dependsOn
      .map((id) => this.tasks.find((x) => x.id === id))
      .filter((x): x is Task => !!x);
  }

  /** Flatten to RDF-style triples for the admin triple store view. */
  toTriples(): Triple[] {
    const out: Triple[] = [];
    for (const t of this.tasks) {
      const s = `task:${shortId(t.id)}`;
      out.push({ subject: s, predicate: 'rdf:type', object: 'qlog:Task' });
      out.push({ subject: s, predicate: 'qlog:title', object: `"${t.title}"` });
      if (t.start) out.push({ subject: s, predicate: 'qlog:start', object: fmtTime(t.start) });
      if (t.end) out.push({ subject: s, predicate: 'qlog:end', object: fmtTime(t.end) });
      out.push({ subject: s, predicate: 'qlog:priority', object: `"${t.priority}"` });
      out.push({ subject: s, predicate: 'qlog:category', object: `cat:${t.category}` });
      out.push({ subject: s, predicate: 'qlog:status', object: `"${t.status}"` });
      if (t.location) out.push({ subject: s, predicate: 'qlog:atLocation', object: `loc:${normalize(t.location)}` });
      for (const dep of t.dependsOn) {
        out.push({ subject: `task:${shortId(dep)}`, predicate: 'qlog:before', object: s });
      }
    }
    return out;
  }

  toJSON(): Task[] {
    return this.tasks.map((t) => ({ ...t }));
  }
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function shortId(id: string): string {
  return id.split('_')[0] === 'task' ? id : id;
}

function keyTime(t: Task): number {
  const v = t.start ?? t.end;
  return v ? new Date(v).getTime() : Number.MAX_SAFE_INTEGER;
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `"${hh}:${mm}"`;
  } catch {
    return `"${iso}"`;
  }
}
