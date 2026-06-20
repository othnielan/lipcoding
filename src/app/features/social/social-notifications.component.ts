import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SubscriptionStore } from '../../state/subscription.store';
import { CATEGORY_EMOJI } from '../../domain/types';
import { NotificationKind, SocialNotification } from '../../domain/social';

interface NotifView extends SocialNotification {
  when: string;
  icon: string;
}

/**
 * Subscribe to other users and watch their schedules arrive as live alarms.
 * Peer activity is simulated client-side by the SubscriptionStore.
 */
@Component({
  selector: 'app-social-notifications',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel">
      <div class="head">
        <span class="ttl">
          🔔 친구 일정 알림
          @if (sub.unreadCount() > 0) {
            <span class="badge">{{ sub.unreadCount() }}</span>
          }
        </span>
        <div class="head-actions">
          <button class="mini" (click)="sub.markAllRead()" [disabled]="sub.unreadCount() === 0">
            모두 읽음
          </button>
          <button class="mini" (click)="sub.clearAll()" [disabled]="!items().length">지우기</button>
        </div>
      </div>

      <div class="peers">
        @for (p of sub.peers(); track p.id) {
          <button
            class="peer"
            [class.on]="sub.isSubscribed(p.id)"
            [style.--accent]="p.color"
            (click)="sub.toggle(p.id)"
          >
            <span class="ava" [style.background]="p.color + '33'">{{ p.avatar }}</span>
            <span class="who">
              <span class="nm">{{ p.name }}</span>
              <span class="bio">{{ p.bio }}</span>
            </span>
            <span class="sub-state">{{ sub.isSubscribed(p.id) ? '구독중 ✓' : '+ 구독' }}</span>
          </button>
        }
      </div>

      <div class="feed">
        @for (n of items(); track n.id) {
          <div
            class="notif"
            [class.unread]="!n.read"
            [class.imminent]="n.kind === 'imminent'"
            [class.fresh]="n.kind === 'new'"
            [style.--accent]="n.color"
            (click)="sub.markRead(n.id)"
          >
            <span class="n-ava" [style.background]="n.color + '33'">{{ n.avatar }}</span>
            <div class="n-body">
              <div class="n-top">
                <span class="n-name">{{ n.peerName }}</span>
                <span class="n-kind" [attr.data-kind]="n.kind">{{ icon(n.kind) }} {{ kindLabel(n.kind) }}</span>
                <span class="n-ago">{{ ago(n.createdAt) }}</span>
              </div>
              <div class="n-title">
                @if (n.category) {
                  <span class="cat">{{ emoji(n) }}</span>
                }
                <span class="txt">{{ n.title }}</span>
              </div>
              @if (n.fireAt && n.kind !== 'subscribe') {
                <div class="n-meta">
                  <span class="when" [class.soon]="isSoon(n)">⏰ {{ n.when }}</span>
                  @if (n.location) {
                    <span class="loc">📍 {{ n.location }}</span>
                  }
                </div>
              }
            </div>
            @if (!n.read) {
              <span class="dot"></span>
            }
          </div>
        } @empty {
          <div class="empty">
            위에서 친구를 <b>구독</b>하면 그들의 일정이 실시간 알람으로 도착합니다.
          </div>
        }
      </div>
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
        margin-bottom: 10px;
      }
      .ttl {
        font-weight: 700;
        font-size: 13px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .badge {
        font-size: 10px;
        font-weight: 800;
        min-width: 17px;
        height: 17px;
        padding: 0 5px;
        border-radius: 999px;
        background: #ef4444;
        color: #fff;
        display: inline-grid;
        place-items: center;
        animation: pop 0.3s ease;
      }
      @keyframes pop {
        from {
          transform: scale(0);
        }
        to {
          transform: scale(1);
        }
      }
      .head-actions {
        display: flex;
        gap: 6px;
      }
      .mini {
        background: var(--panel-2);
        color: var(--ink);
        border: 1px solid var(--line);
        border-radius: 7px;
        padding: 4px 8px;
        font-size: 11px;
        cursor: pointer;
      }
      .mini:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .peers {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 11px;
      }
      .peer {
        display: flex;
        align-items: center;
        gap: 9px;
        background: var(--panel-2);
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 7px 9px;
        cursor: pointer;
        text-align: left;
        transition:
          border-color 0.2s,
          box-shadow 0.2s;
      }
      .peer.on {
        border-color: var(--accent);
        box-shadow: 0 0 0 1px var(--accent) inset;
      }
      .ava {
        flex: 0 0 auto;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 17px;
      }
      .who {
        display: flex;
        flex-direction: column;
        min-width: 0;
        flex: 1;
      }
      .nm {
        font-size: 12.5px;
        font-weight: 700;
        color: var(--ink);
      }
      .bio {
        font-size: 10.5px;
        color: var(--muted);
      }
      .sub-state {
        flex: 0 0 auto;
        font-size: 11px;
        font-weight: 700;
        color: var(--muted);
      }
      .peer.on .sub-state {
        color: var(--accent);
      }
      .feed {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 320px;
        overflow-y: auto;
      }
      .notif {
        position: relative;
        display: flex;
        align-items: flex-start;
        gap: 9px;
        background: var(--panel-2);
        border: 1px solid var(--line);
        border-left: 3px solid var(--accent);
        border-radius: 9px;
        padding: 8px 10px;
        cursor: pointer;
        animation: slideIn 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(12px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      .notif.unread {
        background: color-mix(in srgb, var(--accent) 9%, var(--panel-2));
      }
      .notif.imminent {
        border-color: #ef4444;
        border-left-color: #ef4444;
        animation:
          slideIn 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
          alarm 1.1s ease-in-out infinite;
      }
      @keyframes alarm {
        0%,
        100% {
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
        }
        50% {
          box-shadow: 0 0 12px 1px rgba(239, 68, 68, 0.45);
        }
      }
      .notif.fresh {
        box-shadow: 0 0 10px rgba(16, 185, 129, 0.25);
      }
      .n-ava {
        flex: 0 0 auto;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 15px;
      }
      .n-body {
        flex: 1;
        min-width: 0;
      }
      .n-top {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .n-name {
        font-size: 11.5px;
        font-weight: 700;
        color: var(--ink);
      }
      .n-kind {
        font-size: 9.5px;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 999px;
        background: #334155;
        color: #e2e8f0;
      }
      .n-kind[data-kind='imminent'] {
        background: #ef4444;
        color: #fff;
      }
      .n-kind[data-kind='new'] {
        background: #10b981;
        color: #04231a;
      }
      .n-kind[data-kind='subscribe'] {
        background: #475569;
      }
      .n-ago {
        margin-left: auto;
        font-size: 10px;
        color: var(--muted);
      }
      .n-title {
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 3px;
      }
      .n-title .txt {
        font-size: 12.5px;
        font-weight: 600;
        color: var(--ink);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .n-meta {
        display: flex;
        gap: 10px;
        margin-top: 3px;
        font-size: 10.5px;
        color: var(--muted);
      }
      .when.soon {
        color: #fca5a5;
        font-weight: 700;
      }
      .dot {
        position: absolute;
        top: 9px;
        right: 9px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--accent);
      }
      .empty {
        font-size: 12px;
        color: var(--muted);
        line-height: 1.5;
        padding: 6px 2px;
      }
    `,
  ],
})
export class SocialNotificationsComponent {
  readonly sub = inject(SubscriptionStore);

  readonly items = computed<NotifView[]>(() => {
    this.sub.tick(); // reactive dependency on the periodic clock tick
    return this.sub.notifications().map((n) => ({
      ...n,
      icon: this.icon(n.kind),
      when: this.whenLabel(n),
    }));
  });

  emoji(n: SocialNotification): string {
    return n.category ? (CATEGORY_EMOJI[n.category] ?? '🗒') : '🗒';
  }

  icon(kind: NotificationKind): string {
    switch (kind) {
      case 'imminent':
        return '🚨';
      case 'new':
        return '✨';
      case 'reminder':
        return '⏳';
      default:
        return '🔗';
    }
  }

  kindLabel(kind: NotificationKind): string {
    switch (kind) {
      case 'imminent':
        return '곧 시작';
      case 'new':
        return '새 일정';
      case 'reminder':
        return '예정';
      default:
        return '구독';
    }
  }

  isSoon(n: SocialNotification): boolean {
    const m = this.sub.minutesUntil(n.fireAt);
    return m !== null && m <= 10;
  }

  whenLabel(n: SocialNotification): string {
    const m = this.sub.minutesUntil(n.fireAt);
    if (m === null) return '';
    if (m <= 0) return '지금 시작!';
    if (m < 60) return `${m}분 후 시작`;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest ? `${h}시간 ${rest}분 후` : `${h}시간 후`;
  }

  ago(iso: string): string {
    this.sub.tick();
    const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (diff <= 0) return '방금';
    if (diff < 60) return `${diff}분 전`;
    const h = Math.floor(diff / 60);
    return `${h}시간 전`;
  }
}
