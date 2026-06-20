import { InjectionToken, Signal } from '@angular/core';

export type SpeechState = 'idle' | 'listening' | 'processing' | 'unsupported';

export interface SpeechRecognizerPort {
  readonly supported: boolean;
  readonly transcript: Signal<string>;
  readonly state: Signal<SpeechState>;
  /** Human-readable error from the last recognition attempt, or null. */
  readonly error: Signal<string | null>;
  start(): void;
  stop(): void;
}

export const SPEECH = new InjectionToken<SpeechRecognizerPort>('SPEECH');
