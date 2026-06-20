import { Injectable, computed, effect, signal } from '@angular/core';
import {
  DEFAULT_PERSONA_ID,
  Persona,
  PersonaId,
  PERSONAS,
  getPersona,
} from '../domain/persona';

const STORAGE_KEY = 'schedule-gamification:persona:v1';

interface PersonaSnapshot {
  selectedId: PersonaId;
  onboarded: boolean;
}

/**
 * Holds the chosen chatbot persona and whether the user has completed the
 * splash/home onboarding. Persisted so returning users skip straight to the
 * console with their persona intact.
 */
@Injectable({ providedIn: 'root' })
export class PersonaStore {
  private readonly _selectedId = signal<PersonaId>(DEFAULT_PERSONA_ID);
  private readonly _onboarded = signal(false);

  readonly personas = PERSONAS;
  readonly selectedId = this._selectedId.asReadonly();
  readonly onboarded = this._onboarded.asReadonly();
  readonly selected = computed<Persona>(() => getPersona(this._selectedId()));

  constructor() {
    this.restore();
    effect(() => {
      const snapshot: PersonaSnapshot = {
        selectedId: this._selectedId(),
        onboarded: this._onboarded(),
      };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      }
    });
  }

  /** Picks a persona and marks onboarding complete. */
  select(id: PersonaId): void {
    this._selectedId.set(id);
    this._onboarded.set(true);
  }

  /** Clears onboarding so the splash routes back through persona selection. */
  resetOnboarding(): void {
    this._onboarded.set(false);
  }

  private restore(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const snap = JSON.parse(raw) as Partial<PersonaSnapshot>;
      if (snap.selectedId && PERSONAS.some((p) => p.id === snap.selectedId)) {
        this._selectedId.set(snap.selectedId);
      }
      if (typeof snap.onboarded === 'boolean') this._onboarded.set(snap.onboarded);
    } catch {
      /* ignore corrupt storage */
    }
  }
}
