import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CLOCK } from '../ports/clock.port';
import { OntologyGraph } from '../domain/ontology';
import { QuestEngine } from '../domain/quest-engine';
import { XpCalculator } from '../domain/xp';
import { newId } from '../domain/id';
import { ChatMessage, ExtractCard, Quest, TaskDraft } from '../domain/types';
import { PersonaStore } from './persona.store';

const STORAGE_KEY = 'schedule-gamification:v1';

@Injectable({ providedIn: 'root' })
export class ScheduleStore {
  private readonly clock = inject(CLOCK);
  private readonly persona = inject(PersonaStore);

  private readonly _graph = signal<OntologyGraph>(OntologyGraph.empty());
  private readonly _messages = signal<ChatMessage[]>([
    {
      id: newId('m'),
      role: 'npc',
      text: '모험가여, 오늘의 일정을 말해보게. 음성으로 불러도 좋다네. 🎤',
      ts: new Date().toISOString(),
    },
  ]);
  private readonly _xp = signal(0);
  private readonly _tick = signal(0);

  readonly graph = this._graph.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly xp = this._xp.asReadonly();

  readonly tasks = computed(() => this._graph().tasks);
  readonly triples = computed(() => this._graph().toTriples());
  readonly quests = computed(() => QuestEngine.build(this._graph()));
  readonly activeQuest = computed<Quest | null>(() => {
    this._tick();
    return QuestEngine.pickActive(this.quests(), this._graph(), this.clock.now());
  });
  readonly mainQuests = computed(() => this.quests().filter((q) => q.kind === 'main'));
  readonly subQuests = computed(() => this.quests().filter((q) => q.kind === 'sub'));
  readonly sideQuests = computed(() => this.quests().filter((q) => q.kind === 'side'));

  readonly level = computed(() => XpCalculator.levelFor(this._xp()));
  readonly xpProgress = computed(() => XpCalculator.progress(this._xp()));
  readonly doneCount = computed(() => this.tasks().filter((t) => t.status === 'done').length);
  readonly totalCount = computed(() => this.tasks().length);

  constructor() {
    this.restore();
    // Chat history is not persisted, so greet in the selected persona's voice.
    this.setGreeting(this.persona.selected().greeting);
    effect(() => {
      const snapshot = { tasks: this._graph().toJSON(), xp: this._xp() };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      }
    });
  }

  ingestDrafts(drafts: TaskDraft[]): void {
    this._graph.update((g) => g.upsertDrafts(drafts));
  }

  appendUser(text: string): void {
    this.append('user', text);
  }
  appendNpc(text: string): void {
    this.append('npc', text);
  }
  appendSystem(text: string): void {
    this.append('system', text);
  }

  /** Resets the chat history to a single greeting (used on persona switch). */
  setGreeting(text: string): void {
    this._messages.set([
      { id: newId('m'), role: 'npc', text, ts: new Date().toISOString() },
    ]);
  }

  /** Surfaces the SDK/LLM extraction result as a card inside the chat. */
  appendExtract(card: ExtractCard): void {
    this._messages.update((list) => [
      ...list,
      { id: newId('m'), role: 'extract', text: '', ts: new Date().toISOString(), extract: card },
    ]);
  }

  completeActive(): Quest | null {
    const q = this.activeQuest();
    if (!q) return null;
    this._graph.update((g) => g.markDone(q.taskIds));
    this._xp.update((v) => v + XpCalculator.reward(q.kind));
    this._tick.update((v) => v + 1);
    return q;
  }

  skipActive(): Quest | null {
    const q = this.activeQuest();
    if (!q) return null;
    this._graph.update((g) => g.markSkipped(q.taskIds));
    this._tick.update((v) => v + 1);
    return q;
  }

  /** Toggle a single task done/undone (used by the todo & checklist views). */
  toggleTaskDone(taskId: string): void {
    const t = this.tasks().find((x) => x.id === taskId);
    if (!t) return;
    if (t.status === 'done') {
      this._graph.update((g) => g.setStatus(taskId, 'pending'));
      this._xp.update((v) => Math.max(0, v - t.xpReward));
    } else {
      this._graph.update((g) => g.setStatus(taskId, 'done'));
      this._xp.update((v) => v + t.xpReward);
    }
    this._tick.update((v) => v + 1);
  }

  cancelLast(): void {
    this._graph.update((g) => g.removeLast());
  }

  refreshActive(): void {
    this._tick.update((v) => v + 1);
  }

  reset(): void {
    this._graph.set(OntologyGraph.empty());
    this._xp.set(0);
    this.setGreeting(this.persona.selected().greeting);
  }

  private append(role: ChatMessage['role'], text: string): void {
    this._messages.update((list) => [
      ...list,
      { id: newId('m'), role, text, ts: new Date().toISOString() },
    ]);
  }

  private restore(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const snap = JSON.parse(raw) as { tasks: any[]; xp: number };
      if (Array.isArray(snap.tasks)) this._graph.set(OntologyGraph.fromTasks(snap.tasks));
      if (typeof snap.xp === 'number') this._xp.set(snap.xp);
    } catch {
      /* ignore corrupt storage */
    }
  }
}
