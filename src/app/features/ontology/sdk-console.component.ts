import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AdminLogStore } from '../../state/admin-log.store';
import { SdkExchange } from '../../domain/types';

type Tab = 'request' | 'response';

/**
 * SDK console: shows the actual request sent to the LLM endpoint and the raw
 * response it returned for the most recent utterance. Lets the demo prove the
 * Copilot SDK call is real (not a mock).
 */
@Component({
  selector: 'app-sdk-console',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" [class.live]="sdk()?.source === 'copilot'">
      <div class="head">
        <span class="ttl">🛰 SDK 요청 / 응답</span>
        @if (sdk(); as s) {
          <span class="tag" [class.copilot]="s.source === 'copilot'">
            {{ s.source === 'copilot' ? 'LIVE' : 'FALLBACK' }}
          </span>
        }
      </div>

      @if (sdk(); as s) {
        <div class="meta">
          <span class="kv"><b>POST</b> {{ s.endpoint }}</span>
          <div class="chips">
            <span class="chip model">{{ s.model }}</span>
            <span
              class="chip status"
              [class.ok]="s.status >= 200 && s.status < 300"
              [class.bad]="s.status === 0 || s.status >= 400"
            >
              {{ s.status ? 'HTTP ' + s.status : 'no call' }}
            </span>
            <span class="chip ms">⏱ {{ s.elapsedMs }}ms</span>
            @if (s.usage?.total) {
              <span class="chip tok">🪙 {{ s.usage!.total }} tok</span>
            }
          </div>
        </div>

        @if (s.error) {
          <div class="err">⚠ {{ s.error }}</div>
        }

        <div class="tabs">
          <button class="tab" [class.on]="tab() === 'request'" (click)="tab.set('request')">
            ▸ Request
          </button>
          <button class="tab" [class.on]="tab() === 'response'" (click)="tab.set('response')">
            ◂ Response
          </button>
          <button class="copy" (click)="copy()">📋 {{ copied() ? '복사됨!' : '복사' }}</button>
        </div>

        <pre class="code" [class.req]="tab() === 'request'">{{ body() }}</pre>
      } @else {
        <div class="empty">아직 SDK 호출이 없습니다. 일정을 말하면 실제 요청/응답이 여기에 표시됩니다.</div>
      }
    </div>
  `,
  styles: [
    `
      .panel {
        position: relative;
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 12px 13px;
        overflow: hidden;
      }
      .panel.live {
        border: 1.5px solid transparent;
        background:
          linear-gradient(var(--panel), var(--panel)) padding-box,
          linear-gradient(120deg, #6366f1, #8b5cf6, #22d3ee, #6366f1) border-box;
        background-size:
          100% 100%,
          300% 300%;
        animation: flow 6s linear infinite;
      }
      @keyframes flow {
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
      .head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 9px;
      }
      .ttl {
        font-weight: 700;
        font-size: 13px;
      }
      .tag {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.05em;
        padding: 2px 8px;
        border-radius: 999px;
        background: #475569;
        color: #e2e8f0;
      }
      .tag.copilot {
        background: linear-gradient(90deg, #6366f1, #8b5cf6);
        color: #fff;
        box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
      }
      .meta {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 8px;
      }
      .kv {
        font-size: 11px;
        font-family: ui-monospace, monospace;
        color: var(--muted);
        word-break: break-all;
      }
      .kv b {
        color: #34d399;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      .chip {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--panel-2);
        border: 1px solid var(--line);
        color: var(--ink);
      }
      .chip.model {
        color: #c4b5fd;
      }
      .chip.status.ok {
        color: #6ee7b7;
        border-color: #047857;
      }
      .chip.status.bad {
        color: #fca5a5;
        border-color: #b91c1c;
      }
      .err {
        font-size: 11px;
        color: #fca5a5;
        background: rgba(248, 113, 113, 0.1);
        border: 1px solid rgba(248, 113, 113, 0.3);
        border-radius: 7px;
        padding: 6px 8px;
        margin-bottom: 8px;
      }
      .tabs {
        display: flex;
        gap: 6px;
        margin-bottom: 6px;
      }
      .tab {
        flex: 0 0 auto;
        background: var(--panel-2);
        color: var(--muted);
        border: 1px solid var(--line);
        border-radius: 7px;
        padding: 5px 11px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
      }
      .tab.on {
        color: #fff;
        background: linear-gradient(90deg, #4f46e5, #7c3aed);
        border-color: transparent;
      }
      .copy {
        margin-left: auto;
        background: var(--panel-2);
        color: var(--ink);
        border: 1px solid var(--line);
        border-radius: 7px;
        padding: 5px 10px;
        font-size: 11px;
        cursor: pointer;
      }
      .code {
        margin: 0;
        background: #0b0e16;
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 11px;
        font-size: 11px;
        line-height: 1.5;
        font-family: ui-monospace, 'SF Mono', monospace;
        color: #93c5fd;
        max-height: 280px;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .code.req {
        color: #fcd9a3;
      }
      .empty {
        font-size: 12px;
        color: var(--muted);
      }
    `,
  ],
})
export class SdkConsoleComponent {
  private readonly admin = inject(AdminLogStore);
  readonly tab = signal<Tab>('response');
  readonly copied = signal(false);

  readonly sdk = computed<SdkExchange | null>(() => this.admin.latest()?.sdk ?? null);

  readonly body = computed(() => {
    const s = this.sdk();
    if (!s) return '';
    const value = this.tab() === 'request' ? s.request : s.response;
    return this.pretty(value);
  });

  private pretty(value: unknown): string {
    if (value == null) return '(없음)';
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.body());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }
}
