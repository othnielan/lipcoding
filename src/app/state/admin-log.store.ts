import { Injectable, computed, signal } from '@angular/core';
import { ExtractResult, IntentName, SdkExchange } from '../domain/types';

export interface UtteranceLog {
  id: string;
  ts: string;
  utterance: string;
  intent: IntentName;
  systemPrompt: string;
  userPrompt: string;
  result: ExtractResult;
  elapsedMs: number;
  source: 'copilot' | 'heuristic';
  /** Raw request/response exchange with the LLM endpoint, for the SDK console. */
  sdk?: SdkExchange | null;
}

@Injectable({ providedIn: 'root' })
export class AdminLogStore {
  private readonly _logs = signal<UtteranceLog[]>([]);
  readonly logs = this._logs.asReadonly();
  readonly latest = computed<UtteranceLog | null>(() => this._logs()[0] ?? null);

  push(log: UtteranceLog): void {
    this._logs.update((list) => [log, ...list].slice(0, 50));
  }

  clear(): void {
    this._logs.set([]);
  }
}
