import { Injectable } from '@angular/core';
import { ExtractInput, LlmExtractorPort } from '../ports/llm-extractor.port';
import { ExtractResult } from '../domain/types';
import { parseUtterance } from '../domain/nlu';

/**
 * Offline Korean schedule parser. Implements LlmExtractorPort so it can be
 * swapped for a Copilot SDK backed adapter without touching callers.
 * Delegates the actual parsing to the framework-agnostic `parseUtterance`,
 * which is also reused by the server-side /api/extract fallback.
 */
@Injectable({ providedIn: 'root' })
export class HeuristicExtractor implements LlmExtractorPort {
  describe(input: ExtractInput): { system: string; user: string } {
    return {
      system:
        '[local heuristic parser] 한국어 발화에서 일정(Task)과 인텐트를 추출합니다. ' +
        'priority=main(회의/미팅/시험/마감/약속/면접), category=work|health|study|errand|personal.',
      user: `nowISO: ${input.nowISO}\ntz: ${input.tz}\nutterance: "${input.utterance}"`,
    };
  }

  async extract(input: ExtractInput): Promise<ExtractResult> {
    return parseUtterance(input.utterance, input.nowISO);
  }
}
