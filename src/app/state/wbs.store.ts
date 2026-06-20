import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CLOCK } from '../ports/clock.port';
import { WbsItem } from '../domain/wbs';
import { newId } from '../domain/id';

const STORAGE_KEY = 'schedule-gamification:wbs:v1';

/** A WBS node enriched with derived presentation data. */
export interface WbsRow extends WbsItem {
  depth: number;
  code: string; // hierarchical number e.g. "1.2.1"
  hasChildren: boolean;
  progress: number; // 0..100 (rolled up for parents)
  leafCount: number;
}

/**
 * Stores the project work breakdown structure. A flat list of nodes linked by
 * `parentId`; the store derives the ordered/numbered tree and progress rollups.
 */
@Injectable({ providedIn: 'root' })
export class WbsStore {
  private readonly clock = inject(CLOCK);

  private readonly _items = signal<WbsItem[]>([]);
  readonly items = this._items.asReadonly();

  /** Overall completion across every leaf node, 0..100. */
  readonly overall = computed(() => {
    const leaves = this._items().filter((i) => !this.hasChildrenOf(i.id, this._items()));
    if (!leaves.length) return 0;
    const done = leaves.filter((l) => l.done).length;
    return Math.round((done / leaves.length) * 100);
  });

  readonly projectCount = computed(() => this._items().filter((i) => i.parentId === null).length);

  constructor() {
    this.restore();
    effect(() => {
      const snapshot = this._items();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      }
    });
  }

  /** Adds a node under `parentId` (null = new top-level project). */
  add(parentId: string | null, title: string): WbsItem | null {
    const trimmed = title.trim();
    if (!trimmed) return null;
    const item: WbsItem = {
      id: newId('wbs'),
      title: trimmed,
      parentId,
      done: false,
      createdAt: this.clock.nowISO(),
    };
    this._items.update((list) => [...list, item]);
    return item;
  }

  /** Toggles a leaf node's completion. */
  toggleDone(id: string): void {
    this._items.update((list) =>
      list.map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
    );
  }

  /** Removes a node and all of its descendants. */
  remove(id: string): void {
    const all = this._items();
    const doomed = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const i of all) {
        if (i.parentId && doomed.has(i.parentId) && !doomed.has(i.id)) {
          doomed.add(i.id);
          changed = true;
        }
      }
    }
    this._items.set(all.filter((i) => !doomed.has(i.id)));
  }

  clear(): void {
    this._items.set([]);
  }

  /** Seeds a sample project so the feature is explorable on first open. */
  seedDemo(): void {
    if (this._items().length) return;
    const now = this.clock.now().getTime();
    const at = (n: number) => new Date(now + n).toISOString();
    const mk = (title: string, parentId: string | null, off: number, done = false): WbsItem => ({
      id: newId('wbs'),
      title,
      parentId,
      done,
      createdAt: at(off),
    });
    const p = mk('앱 출시 프로젝트', null, 0);
    const a = mk('기획', p.id, 1);
    const b = mk('개발', p.id, 2);
    const c = mk('출시', p.id, 3);
    const items: WbsItem[] = [
      p,
      a,
      mk('요구사항 정의', a.id, 4, true),
      mk('와이어프레임', a.id, 5, true),
      b,
      mk('프론트엔드', b.id, 6, true),
      mk('백엔드 API', b.id, 7),
      mk('통합 테스트', b.id, 8),
      c,
      mk('스토어 등록', c.id, 9),
      mk('마케팅', c.id, 10),
    ];
    this._items.set(items);
  }

  private hasChildrenOf(id: string, list: WbsItem[]): boolean {
    return list.some((i) => i.parentId === id);
  }

  private restore(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const snap = JSON.parse(raw) as WbsItem[];
      if (Array.isArray(snap)) this._items.set(snap.filter((i) => i && i.id && i.title));
    } catch {
      /* ignore corrupt storage */
    }
  }
}
