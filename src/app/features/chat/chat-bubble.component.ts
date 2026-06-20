import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CATEGORY_EMOJI, ChatMessage, TaskDraft } from '../../domain/types';

const INTENT_LABEL: Record<string, string> = {
  add_schedule: '일정 추가',
  complete_quest: '완료 처리',
  skip_quest: '건너뛰기',
  next_quest: '다음 퀘스트',
  query: '조회',
  cancel: '취소',
};

@Component({
  selector: 'app-chat-bubble',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (msg().role === 'extract' && card()) {
      <div class="row extract-row">
        <div class="avatar ai" [class.glow]="card()!.source === 'copilot'">🤖</div>
        <div class="card" [class.copilot-card]="card()!.source === 'copilot'">
          <span class="scan"></span>
          <div class="card-head">
            <span class="badge" [class.copilot]="card()!.source === 'copilot'">
              <span class="spark">✦</span>
              {{ card()!.source === 'copilot' ? 'Copilot SDK' : 'Heuristic NLU' }}
            </span>
            <span class="intent">{{ intentLabel() }}</span>
            <span class="ms"><span class="pulse"></span>{{ card()!.elapsedMs }}ms</span>
          </div>
          @if (card()!.tasks.length) {
            <div class="count">⚡ {{ card()!.tasks.length }}개의 일정을 추출했어요</div>
            <ul class="tasks">
              @for (t of card()!.tasks; track $index) {
                <li [style.animation-delay.ms]="$index * 90">
                  <span class="emoji">{{ emoji(t) }}</span>
                  <div class="t-body">
                    <div class="t-line">
                      <span class="t-title">{{ t.title }}</span>
                      <span class="dot" [class.main]="t.priority === 'main'">{{ t.priority }}</span>
                    </div>
                    <div class="t-meta">
                      <span class="cat">{{ t.category }}</span>
                      <span class="meta">{{ meta(t) }}</span>
                      @if (deps(t)) {
                        <span class="dep">↳ {{ deps(t) }}</span>
                      }
                    </div>
                  </div>
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

      /* --- AI Extraction card --- */
      .avatar.ai.glow {
        background: radial-gradient(circle at 30% 30%, #818cf8, #6366f1 60%, #4338ca);
        box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.35), 0 0 14px rgba(139, 92, 246, 0.6);
        animation: avatarFloat 3s ease-in-out infinite;
      }
      @keyframes avatarFloat {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-3px);
        }
      }
      .card {
        position: relative;
        max-width: 84%;
        background: #0f172a;
        color: #e2e8f0;
        border: 1px solid #334155;
        border-radius: 14px;
        padding: 10px 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
      }
      /* Animated gradient border + breathing glow for real SDK output */
      .card.copilot-card {
        border: 1.5px solid transparent;
        border-radius: 16px;
        background:
          linear-gradient(#0b1220, #0b1220) padding-box,
          linear-gradient(120deg, #6366f1, #8b5cf6, #ec4899, #22d3ee, #6366f1) border-box;
        background-size:
          100% 100%,
          300% 300%;
        animation:
          cardIn 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both,
          borderFlow 6s linear infinite,
          glowPulse 2.8s ease-in-out infinite;
      }
      @keyframes cardIn {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      @keyframes borderFlow {
        0% {
          background-position:
            0 0,
            0% 50%;
        }
        100% {
          background-position:
            0 0,
            100% 50%;
        }
      }
      @keyframes glowPulse {
        0%,
        100% {
          box-shadow:
            0 4px 20px rgba(99, 102, 241, 0.2),
            0 0 0 1px rgba(139, 92, 246, 0.1);
        }
        50% {
          box-shadow:
            0 8px 32px rgba(236, 72, 153, 0.32),
            0 0 0 1px rgba(34, 211, 238, 0.28);
        }
      }
      /* Light sweep across the top edge */
      .scan {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, #22d3ee, #a78bfa, transparent);
        animation: scan 2.4s ease-in-out infinite;
        pointer-events: none;
      }
      .copilot-card .scan {
        display: block;
      }
      .card:not(.copilot-card) .scan {
        display: none;
      }
      @keyframes scan {
        0% {
          transform: translateX(-55%);
          opacity: 0;
        }
        45% {
          opacity: 0.95;
        }
        100% {
          transform: translateX(55%);
          opacity: 0;
        }
      }
      .card-head {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-bottom: 8px;
      }
      .badge {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.02em;
        padding: 3px 9px;
        border-radius: 999px;
        background: #475569;
        color: #f1f5f9;
        overflow: hidden;
      }
      .badge.copilot {
        background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);
        color: #fff;
        box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
      }
      .badge.copilot::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          110deg,
          transparent 30%,
          rgba(255, 255, 255, 0.6) 50%,
          transparent 70%
        );
        transform: translateX(-120%);
        animation: shimmer 2.6s ease-in-out infinite;
      }
      @keyframes shimmer {
        0% {
          transform: translateX(-120%);
        }
        60%,
        100% {
          transform: translateX(160%);
        }
      }
      .spark {
        display: inline-block;
        font-size: 9px;
        animation: spark 2s linear infinite;
      }
      @keyframes spark {
        0% {
          transform: rotate(0) scale(1);
        }
        50% {
          transform: rotate(180deg) scale(1.3);
        }
        100% {
          transform: rotate(360deg) scale(1);
        }
      }
      .intent {
        font-size: 10.5px;
        font-weight: 700;
        font-family: ui-monospace, monospace;
        color: #c4b5fd;
        background: rgba(139, 92, 246, 0.15);
        border: 1px solid rgba(139, 92, 246, 0.3);
        padding: 1px 7px;
        border-radius: 999px;
      }
      .ms {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        font-size: 10px;
        color: #94a3b8;
      }
      .ms .pulse {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #22d3ee;
        margin-right: 5px;
        box-shadow: 0 0 6px #22d3ee;
        animation: blink 1.2s ease-in-out infinite;
      }
      @keyframes blink {
        0%,
        100% {
          opacity: 0.3;
        }
        50% {
          opacity: 1;
        }
      }
      .count {
        font-size: 11px;
        font-weight: 700;
        color: #a5b4fc;
        margin-bottom: 7px;
      }
      .tasks {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .tasks li {
        display: flex;
        align-items: center;
        gap: 9px;
        background: linear-gradient(135deg, #1e293b, #182032);
        border: 1px solid #2b3a52;
        border-radius: 10px;
        padding: 7px 10px;
        font-size: 12px;
        opacity: 0;
        animation: taskIn 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      }
      @keyframes taskIn {
        from {
          opacity: 0;
          transform: translateY(9px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      .emoji {
        flex: 0 0 auto;
        font-size: 17px;
        filter: drop-shadow(0 0 4px rgba(167, 139, 250, 0.4));
      }
      .t-body {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        flex: 1;
      }
      .t-line {
        display: flex;
        align-items: center;
        gap: 6px;
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
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        padding: 1px 7px;
        border-radius: 999px;
        background: #10b981;
        color: #04231a;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
      }
      .dot.main {
        background: #f59e0b;
        color: #2a1c02;
        box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
      }
      .t-meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        font-size: 10px;
        color: #94a3b8;
      }
      .cat {
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.03em;
        color: #7dd3fc;
      }
      .dep {
        color: #fca5a5;
        background: rgba(248, 113, 113, 0.12);
        border-radius: 6px;
        padding: 0 5px;
      }
      .empty {
        font-size: 11.5px;
        color: #94a3b8;
      }
      .card .time {
        color: #64748b;
        opacity: 1;
      }
      @media (prefers-reduced-motion: reduce) {
        .card.copilot-card,
        .avatar.ai.glow,
        .scan,
        .badge.copilot::after,
        .spark,
        .ms .pulse,
        .tasks li {
          animation: none;
        }
        .tasks li {
          opacity: 1;
        }
      }
    `,
  ],
})
export class ChatBubbleComponent {
  readonly msg = input.required<ChatMessage>();
  readonly card = computed(() => this.msg().extract ?? null);
  readonly intentLabel = computed(() => {
    const c = this.card();
    return c ? (INTENT_LABEL[c.intent] ?? c.intent) : '';
  });
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

  deps(t: TaskDraft): string {
    const d = (t.dependsOnTitles ?? []).filter((s) => !!s && s.trim());
    return d.length ? `선행 ${d.join(', ')}` : '';
  }
}
