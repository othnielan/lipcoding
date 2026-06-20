import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AdminLogStore } from '../../state/admin-log.store';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-intent-prompt-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="panel">
      <div class="head">
        <span class="ttl"><app-icon name="wizard" [size]="14" /> 의도 분류 (Intent)</span>
        @if (admin.latest(); as l) {
          <span class="src" [class.copilot]="l.source === 'copilot'">
            {{ l.source === 'copilot' ? 'Copilot SDK' : 'Local NLU' }} · {{ l.elapsedMs }}ms
          </span>
        }
      </div>

      @if (admin.latest(); as l) {
        <div class="intent-row">
          <span class="intent-badge" [attr.data-intent]="l.intent">{{ l.intent }}</span>
          <span class="utt">“{{ l.utterance }}”</span>
        </div>
        <div class="npc"><app-icon name="wizard" [size]="13" /> {{ l.result.npcReply }}</div>

        <div class="accordions">
          <button class="acc" (click)="toggle('json')">
            {{ open() === 'json' ? '▾' : '▸' }} raw JSON ({{ l.result.tasks.length }} tasks)
          </button>
          @if (open() === 'json') {
            <pre class="mono code">{{ json() }}</pre>
          }
          <button class="acc" (click)="toggle('prompt')">
            {{ open() === 'prompt' ? '▾' : '▸' }} prompt
          </button>
          @if (open() === 'prompt') {
            <pre class="mono code">{{ l.systemPrompt }}

{{ l.userPrompt }}</pre>
          }
        </div>
      } @else {
        <div class="empty">아직 발화가 없습니다. 왼쪽 챗봇에 일정을 말해보세요.</div>
      }
    </div>
  `,
  styles: [
    `
      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 12px 13px;
      }
      .head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .ttl {
        font-weight: 700;
        font-size: 13px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .src {
        font-size: 10.5px;
        color: var(--muted);
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 2px 8px;
      }
      .src.copilot {
        color: #c4b5fd;
        border-color: #6d28d9;
      }
      .intent-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .intent-badge {
        font-size: 11px;
        font-weight: 800;
        padding: 3px 9px;
        border-radius: 6px;
        background: #334155;
        color: #fff;
      }
      .intent-badge[data-intent='add_schedule'] {
        background: #2563eb;
      }
      .intent-badge[data-intent='complete_quest'] {
        background: #16a34a;
      }
      .intent-badge[data-intent='query'] {
        background: #9333ea;
      }
      .utt {
        font-size: 12px;
        color: var(--muted);
      }
      .npc {
        margin-top: 8px;
        font-size: 12.5px;
        color: #fcd9a3;
        display: flex;
        align-items: flex-start;
        gap: 5px;
      }
      .accordions {
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .acc {
        background: var(--panel-2);
        color: var(--ink);
        border: 1px solid var(--line);
        border-radius: 7px;
        padding: 6px 9px;
        text-align: left;
        font-size: 12px;
      }
      .code {
        margin: 0;
        background: #0c0e14;
        border: 1px solid var(--line);
        border-radius: 7px;
        padding: 10px;
        font-size: 11px;
        color: #b8e6c4;
        max-height: 200px;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .empty {
        color: var(--muted);
        font-size: 12.5px;
        padding: 6px 0;
      }
    `,
  ],
})
export class IntentPromptViewComponent {
  readonly admin = inject(AdminLogStore);
  readonly open = signal<'json' | 'prompt' | null>('json');
  readonly json = computed(() => JSON.stringify(this.admin.latest()?.result ?? {}, null, 2));

  toggle(which: 'json' | 'prompt'): void {
    this.open.update((cur) => (cur === which ? null : which));
  }
}
