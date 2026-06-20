import { Quest, Task, XP_BY_KIND } from './types';
import { OntologyGraph } from './ontology';
import { newId } from './id';

/** Builds RPG quests from the ontology graph and picks the active one. */
export class QuestEngine {
  static build(graph: OntologyGraph): Quest[] {
    const tasks = graph.tasks;
    const quests: Quest[] = [];
    const claimed = new Set<string>();

    // Main quests + their sub quests (predecessors).
    for (const task of tasks) {
      if (task.priority !== 'main') continue;
      const main: Quest = {
        id: newId('q'),
        kind: 'main',
        title: task.title,
        narrative: narrate('main', task),
        taskIds: [task.id],
      };
      claimed.add(task.id);

      for (const pred of graph.predecessorsOf(task.id)) {
        if (claimed.has(pred.id)) continue;
        quests.push({
          id: newId('q'),
          kind: 'sub',
          title: pred.title,
          narrative: narrate('sub', pred),
          taskIds: [pred.id],
          parentQuestId: main.id,
        });
        claimed.add(pred.id);
      }
      quests.push(main);
    }

    // Everything else becomes a side quest.
    for (const task of tasks) {
      if (claimed.has(task.id)) continue;
      quests.push({
        id: newId('q'),
        kind: 'side',
        title: task.title,
        narrative: narrate('side', task),
        taskIds: [task.id],
      });
      claimed.add(task.id);
    }

    return quests;
  }

  static pickActive(quests: Quest[], graph: OntologyGraph, now: Date): Quest | null {
    const taskById = new Map(graph.tasks.map((t) => [t.id, t]));
    const open = quests.filter((q) => {
      const t = taskById.get(q.taskIds[0]);
      if (!t) return false;
      return t.status === 'pending' || t.status === 'active';
    });
    if (open.length === 0) return null;

    const rank: Record<string, number> = { sub: 0, main: 1, side: 2 };
    return [...open].sort((a, b) => {
      const ta = taskById.get(a.taskIds[0])!;
      const tb = taskById.get(b.taskIds[0])!;
      const r = rank[a.kind] - rank[b.kind];
      if (r !== 0) return r;
      return startTime(ta) - startTime(tb);
    })[0];
  }
}

function startTime(t: Task): number {
  const v = t.start ?? t.end;
  return v ? new Date(v).getTime() : Number.MAX_SAFE_INTEGER;
}

function narrate(kind: 'main' | 'sub' | 'side', t: Task): string {
  const when = t.start ? ` ${fmtClock(t.start)}` : '';
  const where = t.location ? ` ${t.location}(으)로` : '';
  switch (kind) {
    case 'main':
      return `용사여,${when}${where} 향하라. 오늘의 핵심 임무다. (+${XP_BY_KIND.main} XP)`;
    case 'sub':
      return `그 전에 "${t.title}" 두루마리를 완성해야 한다네. (+${XP_BY_KIND.sub} XP)`;
    default:
      return `짬을 내어 "${t.title}"도 해치우게.${when} (+${XP_BY_KIND.side} XP)`;
  }
}

function fmtClock(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}시 ${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}분`;
  } catch {
    return '';
  }
}
