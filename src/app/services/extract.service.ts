import { Injectable, inject, signal } from '@angular/core';
import { LLM_EXTRACTOR } from '../ports/llm-extractor.port';
import { CLOCK } from '../ports/clock.port';
import { ScheduleStore } from '../state/schedule.store';
import { NotesStore } from '../state/notes.store';
import { AdminLogStore } from '../state/admin-log.store';
import { PersonaStore } from '../state/persona.store';
import { personaSpeak } from '../domain/persona';
import { newId } from '../domain/id';

/** Orchestrates: utterance -> extractor -> store + admin log. */
@Injectable({ providedIn: 'root' })
export class ExtractService {
  private readonly llm = inject(LLM_EXTRACTOR);
  private readonly clock = inject(CLOCK);
  private readonly store = inject(ScheduleStore);
  private readonly notes = inject(NotesStore);
  private readonly admin = inject(AdminLogStore);
  private readonly persona = inject(PersonaStore);

  readonly busy = signal(false);
  /** Last submitted utterance, exposed so the UI can offer a one-click retry. */
  readonly lastUtterance = signal('');
  private controller: AbortController | null = null;

  async submit(utterance: string): Promise<void> {
    const text = utterance.trim();
    if (!text || this.busy()) return;

    this.lastUtterance.set(text);
    this.controller = new AbortController();
    this.busy.set(true);
    this.store.appendUser(text);

    const input = { utterance: text, nowISO: this.clock.nowISO(), tz: this.clock.tz() };
    const prompt = this.llm.describe(input);
    const started = performance.now();

    try {
      const result = await this.llm.extract(input, { signal: this.controller.signal });
      const elapsed = Math.round(performance.now() - started);
      const source = this.llm.lastSource?.() ?? (prompt.system.startsWith('[Copilot') ? 'copilot' : 'heuristic');
      const sdk = this.llm.lastSdk?.() ?? null;

      // 1) Show the SDK-produced values in the chat first.
      this.store.appendExtract({
        source,
        elapsedMs: elapsed,
        intent: result.intent,
        tasks: result.tasks,
      });

      // 2) Then reflect them into the ontology / quest board, narrating each
      //    outcome in the selected persona's voice.
      const persona = this.persona.selected();
      let narration = result.npcReply;

      switch (result.intent) {
        case 'add_schedule':
          this.store.ingestDrafts(result.tasks);
          narration = personaSpeak(
            persona,
            result.tasks.length ? { kind: 'add', count: result.tasks.length } : { kind: 'addEmpty' },
          );
          break;
        case 'complete_quest': {
          const q = this.store.completeActive();
          narration = q
            ? personaSpeak(persona, { kind: 'complete', title: q.title })
            : personaSpeak(persona, { kind: 'next' });
          break;
        }
        case 'skip_quest':
          this.store.skipActive();
          narration = personaSpeak(persona, { kind: 'skip' });
          break;
        case 'cancel':
          this.store.cancelLast();
          narration = personaSpeak(persona, { kind: 'cancel' });
          break;
        case 'next_quest':
          this.store.refreshActive();
          narration = personaSpeak(persona, { kind: 'next' });
          break;
        case 'query':
          narration = personaSpeak(persona, { kind: 'query' });
          break;
        case 'chat':
          // Non-schedule small talk is kept as a note so nothing said is lost.
          this.notes.add(text, 'auto');
          this.store.appendSystem(personaSpeak(persona, { kind: 'noteSaved' }));
          narration = personaSpeak(persona, { kind: 'chat' });
          break;
        default:
          break;
      }

      // 3) Finally the NPC narration, in the persona's voice.
      this.store.appendNpc(narration);
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
        sdk,
      });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        this.store.appendSystem('요청을 취소했어요.');
      } else {
        this.store.appendNpc(personaSpeak(this.persona.selected(), { kind: 'error' }));
      }
    } finally {
      // Keep the progress indicator on screen long enough to be felt, even when
      // the local heuristic parser returns almost instantly.
      const shown = performance.now() - started;
      const MIN_BUSY_MS = 750;
      if (shown < MIN_BUSY_MS) {
        await new Promise((r) => setTimeout(r, MIN_BUSY_MS - shown));
      }
      this.controller = null;
      this.busy.set(false);
    }
  }

  /** Aborts the in-flight extraction (user-initiated cancel). */
  cancel(): void {
    this.controller?.abort();
  }

  /** Re-runs the most recent utterance, if any and not already busy. */
  retryLast(): void {
    const last = this.lastUtterance();
    if (last && !this.busy()) void this.submit(last);
  }
}
