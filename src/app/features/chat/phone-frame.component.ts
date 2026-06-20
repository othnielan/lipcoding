import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ChatPanelComponent } from './chat-panel.component';
import { SocialNotificationsComponent } from '../social/social-notifications.component';
import { SubscriptionStore } from '../../state/subscription.store';
import { NotesStore } from '../../state/notes.store';
import { IconComponent } from '../../shared/icon.component';
import { CLOCK } from '../../ports/clock.port';
import { PersonaStore } from '../../state/persona.store';
import { ScheduleStore } from '../../state/schedule.store';
import { UiStore } from '../../state/ui.store';
import { PhoneSplashComponent } from '../onboarding/phone-splash.component';
import { PersonaPickerComponent } from '../onboarding/persona-picker.component';

@Component({
  selector: 'app-phone-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ChatPanelComponent,
    SocialNotificationsComponent,
    IconComponent,
    PhoneSplashComponent,
    PersonaPickerComponent,
  ],
  template: `
    <div class="phone">
      <div class="statusbar">
        <span>{{ clockText() }}</span>
        <span class="island"></span>
        <span class="right">5G &nbsp;<span class="batt">▮▮▮</span></span>
      </div>
      <div class="appbar">
        @if (ui.splashDone() && persona.onboarded()) {
          <button class="back" (click)="goHome()" aria-label="홈으로">
            <app-icon name="back" [size]="20" />
          </button>
        } @else {
          <span class="back"></span>
        }
        <span class="name"><app-icon [name]="persona.selected().icon" [size]="16" /> {{ persona.selected().name }}</span>
        <div class="actions">
          <button
            class="bell"
            [class.ring]="sub.unreadCount() > 0"
            (click)="toggle()"
            aria-label="친구 일정 알림"
          >
            <app-icon name="bell" [size]="18" />
            @if (sub.unreadCount() > 0) {
              <span class="badge">{{ sub.unreadCount() }}</span>
            }
          </button>
          <button class="more" (click)="toggleMenu()" aria-label="더 보기">
            <app-icon name="more" [size]="18" />
          </button>
        </div>
      </div>
      <div class="screen">
        <app-chat-panel />
        @if (menuOpen()) {
          <button class="menu-scrim" (click)="closeMenu()" aria-label="메뉴 닫기"></button>
          <div class="menu" role="menu">
            <div class="menu-head">
              <span class="m-ic" [style.background]="persona.selected().gradient">
                <app-icon [name]="persona.selected().icon" [size]="18" />
              </span>
              <div class="m-id">
                <span class="m-name">{{ persona.selected().name }}</span>
                <span class="m-role">{{ persona.selected().role }}</span>
              </div>
            </div>
            <button class="menu-item" (click)="menuChangePersona()" role="menuitem">
              <app-icon name="sparkles" [size]="17" />
              <span>페르소나 변경</span>
            </button>
            <button class="menu-item" (click)="menuOpenNotifications()" role="menuitem">
              <app-icon name="bell" [size]="17" />
              <span>친구 일정 구독</span>
              @if (sub.unreadCount() > 0) {
                <span class="m-badge">{{ sub.unreadCount() }}</span>
              }
            </button>
            <button class="menu-item" (click)="menuShowInfo()" role="menuitem">
              <app-icon name="info" [size]="17" />
              <span>앱 정보</span>
            </button>
            <div class="menu-sep"></div>
            <button class="menu-item danger" (click)="menuReset()" role="menuitem">
              <app-icon name="trash" [size]="17" />
              <span>대화 초기화</span>
            </button>
          </div>
        }
        @if (!ui.splashDone()) {
          <app-phone-splash (done)="ui.markSplashDone()" />
        } @else if (!persona.onboarded()) {
          <app-persona-picker />
        }
        @if (toast(); as t) {
          <div class="toast">
            <span class="t-ic"><app-icon [name]="t.icon" [size]="16" /></span>
            <div class="t-body">
              <span class="t-ttl">{{ t.title }}</span>
              <span class="t-tx">{{ t.text }}</span>
            </div>
          </div>
        }
        @if (open()) {
          <div class="sheet">
            <div class="sheet-head">
              <span class="sheet-ttl">친구 일정 구독</span>
              <button class="close" (click)="toggle()" aria-label="닫기">
                <app-icon name="close" [size]="14" />
              </button>
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
        color: #1f2430;
        font-size: 18px;
        display: inline-flex;
        align-items: center;
      }
      button.back {
        border: none;
        background: transparent;
        padding: 2px;
        cursor: pointer;
        border-radius: 8px;
      }
      button.back:hover {
        background: #eceff5;
      }
      button.more {
        border: none;
        background: transparent;
        color: #1f2430;
        padding: 2px;
        cursor: pointer;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
      }
      button.more:hover {
        background: #eceff5;
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
      .menu-scrim {
        position: absolute;
        inset: 0;
        z-index: 8;
        border: none;
        background: rgba(15, 18, 26, 0.18);
        cursor: default;
      }
      .menu {
        position: absolute;
        top: 8px;
        right: 10px;
        z-index: 9;
        width: 224px;
        background: #fff;
        border-radius: 16px;
        box-shadow:
          0 18px 40px rgba(0, 0, 0, 0.22),
          0 0 0 1px rgba(0, 0, 0, 0.05);
        padding: 7px;
        animation: menuIn 0.16s ease-out;
        transform-origin: top right;
      }
      @keyframes menuIn {
        from {
          opacity: 0;
          transform: scale(0.92) translateY(-6px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      .menu-head {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 9px 10px;
      }
      .menu-head .m-ic {
        width: 34px;
        height: 34px;
        border-radius: 11px;
        display: grid;
        place-items: center;
        color: #fff;
        flex: none;
      }
      .menu-head .m-id {
        display: flex;
        flex-direction: column;
        line-height: 1.25;
        min-width: 0;
      }
      .menu-head .m-name {
        font-size: 13.5px;
        font-weight: 800;
        color: #1f2430;
      }
      .menu-head .m-role {
        font-size: 11px;
        color: #71778a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .menu-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 10px 9px;
        border: none;
        background: transparent;
        border-radius: 10px;
        cursor: pointer;
        font-size: 13.5px;
        font-weight: 600;
        color: #2a2f3a;
        text-align: left;
      }
      .menu-item:hover {
        background: #f0f2f7;
      }
      .menu-item .m-badge {
        margin-left: auto;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        border-radius: 9px;
        background: #ff4d4f;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        display: grid;
        place-items: center;
      }
      .menu-item.danger {
        color: #d6373b;
      }
      .menu-item.danger:hover {
        background: #fdecec;
      }
      .menu-sep {
        height: 1px;
        background: #eceef3;
        margin: 5px 8px;
      }
      .toast {
        position: absolute;
        top: 12px;
        left: 12px;
        right: 12px;
        z-index: 7;
        display: flex;
        align-items: center;
        gap: 9px;
        background: #1f2430;
        color: #fff;
        border-radius: 12px;
        padding: 9px 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
        animation: toastIn 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      .toast .t-ic {
        flex: 0 0 auto;
        display: inline-flex;
        color: #fbbf24;
      }
      .toast .t-body {
        display: flex;
        flex-direction: column;
        min-width: 0;
        gap: 1px;
      }
      .toast .t-ttl {
        font-size: 11px;
        font-weight: 800;
        color: #fcd9a3;
      }
      .toast .t-tx {
        font-size: 12.5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      @keyframes toastIn {
        from {
          opacity: 0;
          transform: translateY(-12px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
    `,
  ],
})
export class PhoneFrameComponent {
  private readonly clock = inject(CLOCK);
  readonly sub = inject(SubscriptionStore);
  readonly notes = inject(NotesStore);
  readonly persona = inject(PersonaStore);
  readonly schedule = inject(ScheduleStore);
  readonly ui = inject(UiStore);
  readonly clockText = signal(this.fmt());
  readonly open = signal(false);
  readonly menuOpen = signal(false);
  readonly toast = signal<{ icon: string; title: string; text: string } | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      setInterval(() => this.clockText.set(this.fmt()), 10000);
    }
    // Surface a transient toast whenever a note is added.
    effect(() => {
      const n = this.notes.lastAdded();
      if (!n) return;
      if (typeof window === 'undefined') return;
      this.showToast('note', '노트에 저장됨', n.text);
    });
  }

  toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) this.sub.markAllRead();
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  menuChangePersona(): void {
    this.closeMenu();
    this.persona.resetOnboarding();
  }

  menuOpenNotifications(): void {
    this.closeMenu();
    if (!this.open()) this.toggle();
  }

  menuShowInfo(): void {
    this.closeMenu();
    this.showToast('info', 'AI 스케줄러 · v1.0', `현재 파트너: ${this.persona.selected().name}`);
  }

  menuReset(): void {
    this.closeMenu();
    this.schedule.reset();
    this.showToast('trash', '대화 초기화됨', '일정과 경험치를 처음 상태로 되돌렸어요.');
  }

  /** Header back: return to the persona picker (home). Splash stays played. */
  goHome(): void {
    this.persona.resetOnboarding();
  }

  private showToast(icon: string, title: string, text: string): void {
    if (typeof window === 'undefined') return;
    this.toast.set({ icon, title, text });
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3000);
  }

  private fmt(): string {
    const d = this.clock.now();
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }
}
