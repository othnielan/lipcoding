import { InjectionToken } from '@angular/core';
import { ExtractResult } from '../domain/types';

export interface ExtractInput {
  utterance: string;
  nowISO: string;
  tz: string;
}

export interface LlmExtractorPort {
  /** The prompt/system text used, exposed for the admin "prompt" panel. */
  describe(input: ExtractInput): { system: string; user: string };
  extract(input: ExtractInput): Promise<ExtractResult>;
}

export const LLM_EXTRACTOR = new InjectionToken<LlmExtractorPort>('LLM_EXTRACTOR');
