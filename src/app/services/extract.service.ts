import { Injectable, inject, signal } from '@angular/core';
import { LLM_EXTRACTOR } from '../ports/llm-extractor.port';
import { CLOCK } from '../ports/clock.port';
import { ScheduleStore } from '../state/schedule.store';
import { AdminLogStore } from '../state/admin-log.store';
import { newId } from '../domain/id';

/** Orchestrates: utterance -> extractor -> store + admin log. */
@Injectable({ providedIn: 'root' })
export class ExtractService {
  private readonly llm = inject(LLM_EXTRACTOR);
  private readonly clock = inject(CLOCK);
  private readonly store = inject(ScheduleStore);
  private readonly admin = inject(AdminLogStore);

  readonly busy = signal(false);

  async submit(utterance: string): Promise<void> {
    const text = utterance.trim();
    if (!text || this.busy()) return;

    this.busy.set(true);
    this.store.appendUser(text);

    const input = { utterance: text, nowISO: this.clock.nowISO(), tz: this.clock.tz() };
    const prompt = this.llm.describe(input);
    const started = performance.now();

    try {
      const result = await this.llm.extract(input);
      const elapsed = Math.round(performance.now() - started);
      const source = prompt.system.startsWith('[Copilot') ? 'copilot' : 'heuristic';

      // 1) Show the SDK-produced values in the chat first.
      this.store.appendExtract({
        source,
        elapsedMs: elapsed,
        intent: result.intent,
        tasks: result.tasks,
      });

      // 2) Then reflect them into the ontology / quest board.
      switch (result.intent) {
        case 'add_schedule':
          this.store.ingestDrafts(result.tasks);
          break;
        case 'complete_quest': {
          const q = this.store.completeActive();
          if (q) this.store.appendSystem(`⚔️ "${q.title}" 클리어!`);
          break;
        }
        case 'skip_quest':
          this.store.skipActive();
          break;
        case 'cancel':
          this.store.cancelLast();
          break;
        case 'next_quest':
          this.store.refreshActive();
          break;
        case 'query':
        default:
          break;
      }

      // 3) Finally the NPC narration.
      this.store.appendNpc(result.npcReply);
      this.admin.push({
        id: newId('log'),
        ts: new Date().toISOString(),
        utterance: text,
        intent: result.intent,
        systemPrompt: prompt.system,
        userPrompt: prompt.user,
        result,
        elapsedMs: elapsed,
        source,
      });
    } catch {
      this.store.appendNpc('잠시 문제가 생겼다네. 조금만 더 또렷이 말해주겠나?');
    } finally {
      this.busy.set(false);
    }
  }
}
