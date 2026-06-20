import { InjectionToken } from '@angular/core';
import { ExtractResult, SdkExchange } from '../domain/types';

export interface ExtractInput {
  utterance: string;
  nowISO: string;
  tz: string;
}

export interface LlmExtractorPort {
  /** The prompt/system text used, exposed for the admin "prompt" panel. */
  describe(input: ExtractInput): { system: string; user: string };
  extract(input: ExtractInput): Promise<ExtractResult>;
  /** Where the most recent extract() result actually came from. */
  readonly lastSource?: () => 'copilot' | 'heuristic';
  /** Raw request/response exchange from the most recent extract(), for the SDK console. */
  readonly lastSdk?: () => SdkExchange | null;
}

export const LLM_EXTRACTOR = new InjectionToken<LlmExtractorPort>('LLM_EXTRACTOR');
