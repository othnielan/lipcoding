import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AdminLogStore } from '../../state/admin-log.store';
import { SdkExchange } from '../../domain/types';
import { IconComponent } from '../../shared/icon.component';
import { ExtractService } from '../../services/extract.service';

type Tab = 'request' | 'response';

/**
 * SDK console: shows the actual request sent to the LLM endpoint and the raw
 * response it returned for the most recent utterance. Lets the demo prove the
 * Copilot SDK call is real (not a mock).
 */
@Component({
  selector: 'app-sdk-console',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="panel" [class.live]="sdk()?.source === 'copilot'">
      <div class="head">
        <span class="ttl"><app-icon name="link" [size]="14" /> SDK 요청 / 응답</span>
        @if (sdk(); as s) {
          <span class="tag" [class.copilot]="s.source === 'copilot'">
            {{ s.source === 'copilot' ? 'LIVE' : 'FALLBACK' }}
          </span>
        }
      </div>

      @if (extract.busy()) {
        <div class="progress">
          <app-icon name="loader" [size]="13" class="p-spin" />
          <span class="p-tx">SDK 요청 처리 중…</span>
          <span class="bar"><i></i></span>
        </div>
      }

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
            <span class="chip ms"><app-icon name="clock" [size]="11" /> {{ s.elapsedMs }}ms</span>
            @if (s.usage?.total) {
              <span class="chip tok"><app-icon name="coin" [size]="11" /> {{ s.usage!.total }} tok</span>
            }
          </div>
        </div>

        @if (s.error) {
          <div class="err"><app-icon name="alert" [size]="12" /> {{ s.error }}</div>
        }

        <div class="tabs">
          <button class="tab" [class.on]="tab() === 'request'" (click)="tab.set('request')">
            ▸ Request
          </button>
          <button class="tab" [class.on]="tab() === 'response'" (click)="tab.set('response')">
            ◂ Response
          </button>
          <button class="copy" (click)="copy()"><app-icon name="copy" [size]="12" /> {{ copied() ? '복사됨!' : '복사' }}</button>
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
        border: 1.5px solid #6366f1;
        background: var(--panel);
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
      .progress {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 9px;
        font-size: 11.5px;
        font-weight: 700;
        color: #a5b4fc;
      }
      .progress .p-spin {
        animation: sdkSpin 0.8s linear infinite;
        flex: none;
      }
      .progress .p-tx {
        white-space: nowrap;
      }
      .progress .bar {
        position: relative;
        flex: 1;
        height: 4px;
        border-radius: 3px;
        background: rgba(139, 92, 246, 0.18);
        overflow: hidden;
      }
      .progress .bar i {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 40%;
        border-radius: 3px;
        background: #6366f1;
        animation: sdkScan 1.1s ease-in-out infinite;
      }
      @keyframes sdkSpin {
        to {
          transform: rotate(360deg);
        }
      }
      @keyframes sdkScan {
        0% {
          left: -42%;
        }
        100% {
          left: 102%;
        }
      }
      .ttl {
        font-weight: 700;
        font-size: 13px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
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
        background: #6366f1;
        color: #fff;
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
        display: inline-flex;
        align-items: center;
        gap: 3px;
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
        display: flex;
        align-items: center;
        gap: 5px;
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
        background: #4f46e5;
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
        display: inline-flex;
        align-items: center;
        gap: 4px;
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
  readonly extract = inject(ExtractService);
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
