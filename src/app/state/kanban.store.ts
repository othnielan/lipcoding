import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CLOCK } from '../ports/clock.port';
import { KanbanCard, KanbanColumn } from '../domain/kanban';
import { newId } from '../domain/id';

const STORAGE_KEY = 'schedule-gamification:kanban:v1';

/**
 * Stores the Kanban board: a flat list of cards, each pinned to one column with
 * an `order` sort key. Moving a card simply rewrites its column and appends it
 * to the end of the destination column.
 */
@Injectable({ providedIn: 'root' })
export class KanbanStore {
  private readonly clock = inject(CLOCK);

  private readonly _cards = signal<KanbanCard[]>([]);
  readonly cards = this._cards.asReadonly();

  /** Cards in a column, sorted by their `order` key. */
  column(col: KanbanColumn): KanbanCard[] {
    return this._cards()
      .filter((c) => c.column === col)
      .sort((a, b) => a.order - b.order);
  }

  readonly todo = computed(() => this.column('todo'));
  readonly doing = computed(() => this.column('doing'));
  readonly done = computed(() => this.column('done'));

  readonly total = computed(() => this._cards().length);
  readonly donePct = computed(() => {
    const total = this._cards().length;
    if (!total) return 0;
    return Math.round((this._cards().filter((c) => c.column === 'done').length / total) * 100);
  });

  constructor() {
    this.restore();
    effect(() => {
      const snapshot = this._cards();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      }
    });
  }

  /** Adds a card to the end of `column`. */
  add(column: KanbanColumn, title: string): KanbanCard | null {
    const trimmed = title.trim();
    if (!trimmed) return null;
    const card: KanbanCard = {
      id: newId('kanban'),
      title: trimmed,
      column,
      order: this.nextOrder(column),
      createdAt: this.clock.nowISO(),
    };
    this._cards.update((list) => [...list, card]);
    return card;
  }

  /** Moves a card to `column`, appending it to the end. */
  move(id: string, column: KanbanColumn): void {
    const order = this.nextOrder(column);
    this._cards.update((list) =>
      list.map((c) => (c.id === id ? { ...c, column, order } : c)),
    );
  }

  /** Moves a card one column to the left (todo ← doing ← done). */
  moveLeft(id: string): void {
    const card = this._cards().find((c) => c.id === id);
    if (!card) return;
    const prev: Record<KanbanColumn, KanbanColumn | null> = {
      todo: null,
      doing: 'todo',
      done: 'doing',
    };
    const target = prev[card.column];
    if (target) this.move(id, target);
  }

  /** Moves a card one column to the right (todo → doing → done). */
  moveRight(id: string): void {
    const card = this._cards().find((c) => c.id === id);
    if (!card) return;
    const next: Record<KanbanColumn, KanbanColumn | null> = {
      todo: 'doing',
      doing: 'done',
      done: null,
    };
    const target = next[card.column];
    if (target) this.move(id, target);
  }

  remove(id: string): void {
    this._cards.update((list) => list.filter((c) => c.id !== id));
  }

  clear(): void {
    this._cards.set([]);
  }

  /** Seeds a sample board so the feature is explorable on first open. */
  seedDemo(): void {
    if (this._cards().length) return;
    const now = this.clock.now().getTime();
    const at = (n: number) => new Date(now + n).toISOString();
    const mk = (title: string, column: KanbanColumn, order: number): KanbanCard => ({
      id: newId('kanban'),
      title,
      column,
      order,
      createdAt: at(order),
    });
    this._cards.set([
      mk('요구사항 정리', 'todo', 0),
      mk('디자인 시안', 'todo', 1),
      mk('API 연동', 'doing', 0),
      mk('칸반 보드 구현', 'doing', 1),
      mk('프로젝트 세팅', 'done', 0),
    ]);
  }

  private nextOrder(column: KanbanColumn): number {
    const cards = this._cards().filter((c) => c.column === column);
    return cards.length ? Math.max(...cards.map((c) => c.order)) + 1 : 0;
  }

  private restore(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const snap = JSON.parse(raw) as KanbanCard[];
      if (Array.isArray(snap)) this._cards.set(snap.filter((c) => c && c.id && c.title));
    } catch {
      /* ignore corrupt storage */
    }
  }
}
