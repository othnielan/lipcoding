import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ChatPanelComponent } from './chat-panel.component';
import { SocialNotificationsComponent } from '../social/social-notifications.component';
import { SubscriptionStore } from '../../state/subscription.store';
import { CLOCK } from '../../ports/clock.port';

@Component({
  selector: 'app-phone-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChatPanelComponent, SocialNotificationsComponent],
  template: `
    <div class="phone">
      <div class="statusbar">
        <span>{{ clockText() }}</span>
        <span class="island"></span>
        <span class="right">5G &nbsp;<span class="batt">▮▮▮</span></span>
      </div>
      <div class="appbar">
        <span class="back">‹</span>
        <span class="name">🧙 QuestMaster</span>
        <div class="actions">
          <button
            class="bell"
            [class.ring]="sub.unreadCount() > 0"
            (click)="toggle()"
            aria-label="친구 일정 알림"
          >
            🔔
            @if (sub.unreadCount() > 0) {
              <span class="badge">{{ sub.unreadCount() }}</span>
            }
          </button>
          <span class="more">⋯</span>
        </div>
      </div>
      <div class="screen">
        <app-chat-panel />
        @if (open()) {
          <div class="sheet">
            <div class="sheet-head">
              <span class="sheet-ttl">👥 친구 일정 구독</span>
              <button class="close" (click)="toggle()" aria-label="닫기">✕</button>
            </div>
            <div class="sheet-body">
              <app-social-notifications />
            </div>
          </div>
        }
      </div>
      <div class="homebar"></div>
    </div>
  `,
  styles: [
    `
      :host {
        display: grid;
        place-items: center;
      }
      .phone {
        width: 372px;
        height: 760px;
        background: #000;
        border-radius: 46px;
        padding: 12px;
        box-shadow:
          0 30px 60px rgba(0, 0, 0, 0.5),
          inset 0 0 0 2px #2b2b2b;
        display: flex;
        flex-direction: column;
        position: relative;
      }
      .statusbar {
        height: 30px;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 18px;
        font-size: 12px;
        font-weight: 600;
        position: relative;
      }
      .island {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        top: 4px;
        width: 96px;
        height: 22px;
        background: #000;
        border-radius: 14px;
      }
      .batt {
        letter-spacing: -2px;
      }
      .appbar {
        background: #f7f8fb;
        border-radius: 18px 18px 0 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 14px;
        font-weight: 700;
        color: #1f2430;
        border-bottom: 1px solid #e6e9ef;
      }
      .appbar .back,
      .appbar .more {
        color: #2f6df6;
        font-size: 18px;
      }
      .name {
        font-size: 14px;
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .bell {
        position: relative;
        border: none;
        background: transparent;
        font-size: 17px;
        cursor: pointer;
        padding: 2px;
        line-height: 1;
      }
      .bell.ring {
        animation: ring 1.6s ease-in-out infinite;
        transform-origin: 50% 0;
      }
      @keyframes ring {
        0%,
        70%,
        100% {
          transform: rotate(0);
        }
        75% {
          transform: rotate(14deg);
        }
        85% {
          transform: rotate(-12deg);
        }
        95% {
          transform: rotate(6deg);
        }
      }
      .bell .badge {
        position: absolute;
        top: -4px;
        right: -5px;
        min-width: 15px;
        height: 15px;
        padding: 0 4px;
        border-radius: 999px;
        background: #ef4444;
        color: #fff;
        font-size: 9px;
        font-weight: 800;
        display: grid;
        place-items: center;
      }
      .screen {
        flex: 1;
        overflow: hidden;
        background: #eef0f4;
        position: relative;
      }
      .sheet {
        position: absolute;
        inset: 0;
        background: var(--bg, #10121a);
        display: flex;
        flex-direction: column;
        animation: sheetUp 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
        z-index: 5;
      }
      @keyframes sheetUp {
        from {
          transform: translateY(100%);
        }
        to {
          transform: none;
        }
      }
      .sheet-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 11px 13px;
        border-bottom: 1px solid var(--line);
        background: var(--panel);
      }
      .sheet-ttl {
        font-size: 13.5px;
        font-weight: 800;
        color: var(--ink);
      }
      .close {
        border: none;
        background: var(--panel-2);
        color: var(--ink);
        width: 26px;
        height: 26px;
        border-radius: 50%;
        font-size: 12px;
        cursor: pointer;
      }
      .sheet-body {
        flex: 1;
        overflow-y: auto;
        padding: 11px;
      }
      .homebar {
        height: 22px;
        border-radius: 0 0 18px 18px;
        background: #f7f8fb;
        position: relative;
      }
      .homebar::after {
        content: '';
        position: absolute;
        left: 50%;
        bottom: 7px;
        transform: translateX(-50%);
        width: 120px;
        height: 5px;
        border-radius: 3px;
        background: #20242c;
      }
    `,
  ],
})
export class PhoneFrameComponent {
  private readonly clock = inject(CLOCK);
  readonly sub = inject(SubscriptionStore);
  readonly clockText = signal(this.fmt());
  readonly open = signal(false);

  constructor() {
    if (typeof window !== 'undefined') {
      setInterval(() => this.clockText.set(this.fmt()), 10000);
    }
  }

  toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) this.sub.markAllRead();
  }

  private fmt(): string {
    const d = this.clock.now();
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }
}
