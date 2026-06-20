import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { CLOCK } from '../ports/clock.port';
import { newId } from '../domain/id';
import {
  MOCK_PEERS,
  PeerUser,
  SocialNotification,
  randomNewEvent,
} from '../domain/social';

const STORAGE_KEY = 'schedule-gamification:social:v1';
const MAX_NOTIFICATIONS = 40;
const TICK_MS = 5000; // relative-time refresh + imminent check
const SIMULATE_EVERY_TICKS = 3; // ~15s: a subscribed peer posts a new schedule
const IMMINENT_WINDOW_MIN = 2;

interface Persisted {
  subscribed: string[];
  notifications: SocialNotification[];
}

/**
 * Manages subscriptions to other users' schedules and turns them into a live
 * notification/alarm feed. Peer activity is simulated in-browser (no backend):
 * subscribing seeds reminders, upcoming events escalate to "imminent" alarms,
 * and subscribed peers periodically post fresh schedules.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionStore {
  private readonly clock = inject(CLOCK);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _peers = signal<PeerUser[]>(MOCK_PEERS);
  private readonly _subscribed = signal<Set<string>>(new Set());
  private readonly _notifications = signal<SocialNotification[]>([]);
  private readonly _tick = signal(0);
  private readonly firedImminent = new Set<string>();

  readonly peers = this._peers.asReadonly();
  readonly notifications = this._notifications.asReadonly();

  /** Drives relative-time recomputation in views. */
  readonly tick = this._tick.asReadonly();

  readonly subscribedIds = computed(() => this._subscribed());
  readonly subscribedPeers = computed(() =>
    this._peers().filter((p) => this._subscribed().has(p.id)),
  );
  readonly unreadCount = computed(() => this._notifications().filter((n) => !n.read).length);

  constructor() {
    this.restore();

    effect(() => {
      const snapshot: Persisted = {
        subscribed: [...this._subscribed()],
        notifications: this._notifications(),
      };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      }
    });

    if (typeof window !== 'undefined') {
      let counter = 0;
      const handle = window.setInterval(() => {
        this._tick.update((v) => v + 1);
        this.promoteImminent();
        counter += 1;
        if (counter % SIMULATE_EVERY_TICKS === 0) this.simulatePeerActivity();
      }, TICK_MS);
      this.destroyRef.onDestroy(() => window.clearInterval(handle));
    }
  }

  isSubscribed(peerId: string): boolean {
    return this._subscribed().has(peerId);
  }

  /** Subscribe/unsubscribe to a peer. Subscribing seeds reminder notifications. */
  toggle(peerId: string): void {
    const peer = this._peers().find((p) => p.id === peerId);
    if (!peer) return;

    const next = new Set(this._subscribed());
    if (next.has(peerId)) {
      next.delete(peerId);
      this._subscribed.set(next);
      this.push({
        peer,
        kind: 'subscribe',
        title: `${peer.name}님 구독을 해제했어요`,
      });
      return;
    }

    next.add(peerId);
    this._subscribed.set(next);
    this.push({ peer, kind: 'subscribe', title: `${peer.name}님의 일정을 구독했어요` });

    const now = this.clock.now().getTime();
    for (const ev of peer.events) {
      const fireAt = new Date(now + ev.inMin * 60_000).toISOString();
      this.push({
        peer,
        kind: 'reminder',
        title: ev.title,
        category: ev.category,
        location: ev.location ?? null,
        fireAt,
      });
    }
  }

  markRead(id: string): void {
    this._notifications.update((list) =>
      list.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  markAllRead(): void {
    this._notifications.update((list) => list.map((n) => ({ ...n, read: true })));
  }

  clearAll(): void {
    this._notifications.set([]);
    this.firedImminent.clear();
  }

  /** Minutes until an event fires (negative if already passed). */
  minutesUntil(fireAt?: string | null): number | null {
    if (!fireAt) return null;
    return Math.round((new Date(fireAt).getTime() - this.clock.now().getTime()) / 60_000);
  }

  // --- internals ---------------------------------------------------------

  /** Escalates reminders whose start time is within the imminent window. */
  private promoteImminent(): void {
    const now = this.clock.now().getTime();
    for (const n of this._notifications()) {
      if (n.kind !== 'reminder' || !n.fireAt || this.firedImminent.has(n.id)) continue;
      const diffMin = (new Date(n.fireAt).getTime() - now) / 60_000;
      if (diffMin <= IMMINENT_WINDOW_MIN && diffMin >= -1) {
        this.firedImminent.add(n.id);
        const peer = this._peers().find((p) => p.id === n.peerId);
        if (!peer) continue;
        this.push({
          peer,
          kind: 'imminent',
          title: n.title,
          category: n.category,
          location: n.location,
          fireAt: n.fireAt,
        });
      }
    }
  }

  /** A random subscribed peer "posts" a new schedule -> live notification. */
  private simulatePeerActivity(): void {
    const subs = this.subscribedPeers();
    if (subs.length === 0) return;
    const peer = subs[Math.floor(Math.random() * subs.length)];
    const ev = randomNewEvent();
    const fireAt = new Date(this.clock.now().getTime() + ev.inMin * 60_000).toISOString();
    this.push({
      peer,
      kind: 'new',
      title: ev.title,
      category: ev.category,
      location: ev.location,
      fireAt,
    });
  }

  private push(input: {
    peer: PeerUser;
    kind: SocialNotification['kind'];
    title: string;
    category?: SocialNotification['category'];
    location?: string | null;
    fireAt?: string | null;
  }): void {
    const notif: SocialNotification = {
      id: newId('ntf'),
      peerId: input.peer.id,
      peerName: input.peer.name,
      avatar: input.peer.avatar,
      icon: input.peer.icon,
      color: input.peer.color,
      kind: input.kind,
      title: input.title,
      category: input.category,
      location: input.location ?? null,
      fireAt: input.fireAt ?? null,
      createdAt: new Date().toISOString(),
      read: false,
    };
    this._notifications.update((list) => [notif, ...list].slice(0, MAX_NOTIFICATIONS));
  }

  private restore(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const snap = JSON.parse(raw) as Persisted;
      if (Array.isArray(snap.subscribed)) this._subscribed.set(new Set(snap.subscribed));
      if (Array.isArray(snap.notifications)) {
        this._notifications.set(snap.notifications.slice(0, MAX_NOTIFICATIONS));
      }
    } catch {
      /* ignore corrupt storage */
    }
  }
}
