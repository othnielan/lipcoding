import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CATEGORY_EMOJI, ChatMessage, TaskDraft } from '../../domain/types';

@Component({
  selector: 'app-chat-bubble',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (msg().role === 'extract' && card()) {
      <div class="row">
        <div class="avatar">🤖</div>
        <div class="card">
          <div class="card-head">
            <span class="badge" [class.copilot]="card()!.source === 'copilot'">
              {{ card()!.source === 'copilot' ? 'Copilot SDK' : 'Heuristic NLU' }}
            </span>
            <span class="intent">{{ card()!.intent }}</span>
            <span class="ms">{{ card()!.elapsedMs }}ms</span>
          </div>
          @if (card()!.tasks.length) {
            <ul class="tasks">
              @for (t of card()!.tasks; track $index) {
                <li>
                  <span class="emoji">{{ emoji(t) }}</span>
                  <span class="t-title">{{ t.title }}</span>
                  <span class="dot" [class.main]="t.priority === 'main'">{{ t.priority }}</span>
                  <span class="meta">{{ meta(t) }}</span>
                </li>
              }
            </ul>
          } @else {
            <div class="empty">추출된 일정 없음 · 의도만 분류됨</div>
          }
          <span class="time">{{ time() }}</span>
        </div>
      </div>
    } @else {
      <div class="row" [class.user]="msg().role === 'user'" [class.system]="msg().role === 'system'">
        @if (msg().role === 'npc') {
          <div class="avatar">🧙</div>
        }
        <div class="bubble">
          <p>{{ msg().text }}</p>
          <span class="time">{{ time() }}</span>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .row {
        display: flex;
        gap: 8px;
        margin: 8px 0;
        align-items: flex-end;
      }
      .row.user {
        flex-direction: row-reverse;
      }
      .avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #efe6cf;
        display: grid;
        place-items: center;
        font-size: 16px;
        flex: 0 0 auto;
      }
      .bubble {
        max-width: 78%;
        background: #fff;
        color: #1f2430;
        border-radius: 14px;
        padding: 8px 11px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
      }
      .row.user .bubble {
        background: #2f6df6;
        color: #fff;
      }
      .row.system .bubble {
        background: linear-gradient(90deg, #fde68a, #fbbf24);
        color: #4a3a09;
        font-weight: 700;
        text-align: center;
        margin: 0 auto;
      }
      p {
        margin: 0;
        font-size: 13.5px;
        line-height: 1.4;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .time {
        display: block;
        margin-top: 3px;
        font-size: 10px;
        opacity: 0.55;
        text-align: right;
      }
      .row.system .time {
        display: none;
      }

      /* --- Extraction card --- */
      .card {
        max-width: 82%;
        background: #0f172a;
        color: #e2e8f0;
        border: 1px solid #334155;
        border-radius: 14px;
        padding: 9px 11px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
      }
      .card-head {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-bottom: 7px;
      }
      .badge {
        font-size: 10px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 999px;
        background: #475569;
        color: #f1f5f9;
      }
      .badge.copilot {
        background: linear-gradient(90deg, #6366f1, #8b5cf6);
        color: #fff;
      }
      .intent {
        font-size: 11px;
        font-family: ui-monospace, monospace;
        color: #93c5fd;
      }
      .ms {
        margin-left: auto;
        font-size: 10px;
        color: #94a3b8;
      }
      .tasks {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .tasks li {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #1e293b;
        border-radius: 8px;
        padding: 5px 8px;
        font-size: 12px;
      }
      .emoji {
        flex: 0 0 auto;
      }
      .t-title {
        font-weight: 700;
        color: #f8fafc;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dot {
        flex: 0 0 auto;
        font-size: 9.5px;
        font-weight: 800;
        text-transform: uppercase;
        padding: 1px 6px;
        border-radius: 999px;
        background: #10b981;
        color: #04231a;
      }
      .dot.main {
        background: #f59e0b;
        color: #2a1c02;
      }
      .meta {
        margin-left: auto;
        font-size: 10.5px;
        color: #94a3b8;
        white-space: nowrap;
      }
      .empty {
        font-size: 11.5px;
        color: #94a3b8;
      }
      .card .time {
        color: #64748b;
        opacity: 1;
      }
    `,
  ],
})
export class ChatBubbleComponent {
  readonly msg = input.required<ChatMessage>();
  readonly card = computed(() => this.msg().extract ?? null);
  readonly time = computed(() => {
    const d = new Date(this.msg().ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  });

  emoji(t: TaskDraft): string {
    return CATEGORY_EMOJI[t.category] ?? '🗒';
  }

  meta(t: TaskDraft): string {
    const parts: string[] = [];
    const when = t.start ?? t.end;
    if (when) {
      const d = new Date(when);
      parts.push(
        `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
      );
    } else {
      parts.push('시간 미정');
    }
    if (t.location) parts.push(`📍${t.location}`);
    return parts.join(' · ');
  }
}
