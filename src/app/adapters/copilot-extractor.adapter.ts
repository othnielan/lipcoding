import { Injectable, inject, signal } from '@angular/core';
import { ExtractInput, LlmExtractorPort } from '../ports/llm-extractor.port';
import { ExtractResult, SdkExchange } from '../domain/types';
import { HeuristicExtractor } from './heuristic-extractor.adapter';

/**
 * Calls the server route POST /api/extract, which uses the Copilot SDK.
 * Falls back to the offline heuristic parser if the request fails (demo safety).
 * `lastSource` reflects whether the latest result came from the live LLM
 * (server `X-Extract-Source: copilot`) or a heuristic fallback.
 */
@Injectable({ providedIn: 'root' })
export class CopilotExtractor implements LlmExtractorPort {
  private readonly fallback = inject(HeuristicExtractor);
  private readonly _source = signal<'copilot' | 'heuristic'>('heuristic');
  private readonly _sdk = signal<SdkExchange | null>(null);

  readonly lastSource = () => this._source();
  readonly lastSdk = () => this._sdk();

  describe(input: ExtractInput) {
    return {
      system:
        '[Copilot SDK] server /api/extract — chat.completions with json_schema (strict). ' +
        'Extracts {intent, tasks[], npcReply} from a Korean utterance.',
      user: `nowISO: ${input.nowISO}\ntz: ${input.tz}\nutterance: "${input.utterance}"`,
    };
  }

  async extract(input: ExtractInput, opts?: { signal?: AbortSignal }): Promise<ExtractResult> {
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
        signal: opts?.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const header = res.headers.get('X-Extract-Source');
      this._source.set(header === 'copilot' ? 'copilot' : 'heuristic');
      const body = (await res.json()) as ExtractResult & { _sdk?: SdkExchange };
      this._sdk.set(body._sdk ?? null);
      const { _sdk, ...result } = body;
      return result as ExtractResult;
    } catch (err) {
      // A user-initiated cancel must not silently fall back to the heuristic.
      if ((err as Error)?.name === 'AbortError') throw err;
      this._source.set('heuristic');
      this._sdk.set({
        source: 'heuristic',
        endpoint: '/api/extract (network error)',
        model: 'heuristic-rules',
        status: 0,
        elapsedMs: 0,
        request: input,
        response: null,
        usage: null,
        error: 'request failed — client-side heuristic fallback',
      });
      return this.fallback.extract(input);
    }
  }
}
