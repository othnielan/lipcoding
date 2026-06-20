import { Injectable, signal } from '@angular/core';

/** Keys for the in-phone feature sheets (todo / checklist / weekly / ...). */
export type FeatureKey = 'todo' | 'check' | 'week' | 'month' | 'stats' | 'note' | 'wbs' | 'kanban';

/**
 * Cross-component UI state that needs to be driven from more than one place
 * (the phone simulator, the feature launcher, and the guided demo player).
 *
 * Session-only — nothing here is persisted, so the intro splash replays on
 * every page load and feature sheets always start closed.
 */
@Injectable({ providedIn: 'root' })
export class UiStore {
  /** Whether the intro splash has finished for this page session. */
  readonly splashDone = signal(false);

  /** Which in-phone feature sheet is currently open (null = none). */
  readonly activeFeature = signal<FeatureKey | null>(null);

  markSplashDone(): void {
    this.splashDone.set(true);
  }

  openFeature(key: FeatureKey): void {
    this.activeFeature.set(key);
  }

  toggleFeature(key: FeatureKey): void {
    this.activeFeature.update((v) => (v === key ? null : key));
  }

  closeFeature(): void {
    this.activeFeature.set(null);
  }
}
