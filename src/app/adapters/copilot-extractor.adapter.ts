import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ExtractInput, LlmExtractorPort } from '../ports/llm-extractor.port';
import { ExtractResult } from '../domain/types';
import { HeuristicExtractor } from './heuristic-extractor.adapter';

/**
 * Calls the server route POST /api/extract, which uses the Copilot SDK.
 * Falls back to the offline heuristic parser if the request fails (demo safety).
 */
@Injectable({ providedIn: 'root' })
export class CopilotExtractor implements LlmExtractorPort {
  private readonly http = inject(HttpClient);
  private readonly fallback = inject(HeuristicExtractor);

  describe(input: ExtractInput) {
    return {
      system:
        '[Copilot SDK] server /api/extract — chat.completions with json_schema (strict). ' +
        'Extracts {intent, tasks[], npcReply} from a Korean utterance.',
      user: `nowISO: ${input.nowISO}\ntz: ${input.tz}\nutterance: "${input.utterance}"`,
    };
  }

  async extract(input: ExtractInput): Promise<ExtractResult> {
    try {
      return await firstValueFrom(this.http.post<ExtractResult>('/api/extract', input));
    } catch {
      return this.fallback.extract(input);
    }
  }
}
