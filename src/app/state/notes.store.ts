import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CLOCK } from '../ports/clock.port';
import { Note, NoteSource } from '../domain/note';
import { newId } from '../domain/id';

const STORAGE_KEY = 'schedule-gamification:notes:v1';

/**
 * Stores free-form notes. Non-schedule utterances are auto-captured here, and
 * the user can also add notes directly (typed or by voice) from the notes view.
 */
@Injectable({ providedIn: 'root' })
export class NotesStore {
  private readonly clock = inject(CLOCK);

  private readonly _notes = signal<Note[]>([]);

  /** Newest first. */
  readonly notes = computed(() =>
    [...this._notes()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
  readonly count = computed(() => this._notes().length);

  /** The most recently added note — used to surface a transient toast. */
  readonly lastAdded = signal<Note | null>(null);

  constructor() {
    this.restore();
    effect(() => {
      const snapshot = this._notes();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      }
    });
  }

  /** Adds a note. Ignores blank text. Returns the created note (or null). */
  add(text: string, source: NoteSource = 'text'): Note | null {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const note: Note = {
      id: newId('note'),
      text: trimmed,
      createdAt: this.clock.nowISO(),
      source,
    };
    this._notes.update((list) => [...list, note]);
    this.lastAdded.set(note);
    return note;
  }

  remove(id: string): void {
    this._notes.update((list) => list.filter((n) => n.id !== id));
  }

  clear(): void {
    this._notes.set([]);
  }

  private restore(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const snap = JSON.parse(raw) as Note[];
      if (Array.isArray(snap)) this._notes.set(snap.filter((n) => n && n.id && n.text));
    } catch {
      /* ignore corrupt storage */
    }
  }
}
