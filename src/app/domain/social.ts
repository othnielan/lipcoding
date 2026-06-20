// Pure domain model for the "subscribe to other users' schedules" feature.
// No Angular dependency — consumed by the SubscriptionStore.

import { CategoryName, Priority } from './types';

/** A scheduled item published by another user. */
export interface PeerEvent {
  id: string;
  title: string;
  category: CategoryName;
  /** Minutes from "now" at seed time; the store converts this to an absolute fireAt. */
  inMin: number;
  priority: Priority;
  location?: string | null;
}

/** Another user whose schedule can be subscribed to. */
export interface PeerUser {
  id: string;
  name: string;
  avatar: string;
  /** Flat icon name (see IconComponent) used as the user's avatar glyph. */
  icon: string;
  color: string;
  bio: string;
  events: PeerEvent[];
}

export type NotificationKind = 'subscribe' | 'reminder' | 'imminent' | 'new';

/** A single alarm/notification surfaced to the current user. */
export interface SocialNotification {
  id: string;
  peerId: string;
  peerName: string;
  avatar: string;
  icon: string;
  color: string;
  kind: NotificationKind;
  title: string;
  category?: CategoryName;
  location?: string | null;
  /** ISO time the underlying event starts (for reminder/imminent). */
  fireAt?: string | null;
  /** ISO time the notification itself was created. */
  createdAt: string;
  read: boolean;
}

/** Seed roster of other users and their upcoming schedules. */
export const MOCK_PEERS: PeerUser[] = [
  {
    id: 'u_kim',
    name: '김용사',
    avatar: '⚔️',
    icon: 'sword',
    color: '#f59e0b',
    bio: '메인 퀘스트 사냥꾼',
    events: [
      { id: 'e_kim_1', title: '스프린트 회의', category: 'work', inMin: 3, priority: 'main' },
      { id: 'e_kim_2', title: '점심 약속', category: 'personal', inMin: 70, priority: 'side', location: '강남' },
      { id: 'e_kim_3', title: '코드 리뷰', category: 'work', inMin: 180, priority: 'main' },
    ],
  },
  {
    id: 'u_lee',
    name: '이마법사',
    avatar: '🧙‍♀️',
    icon: 'wizard',
    color: '#8b5cf6',
    bio: '지식의 탑 연구원',
    events: [
      { id: 'e_lee_1', title: '알고리즘 스터디', category: 'study', inMin: 12, priority: 'main', location: '도서관' },
      { id: 'e_lee_2', title: '논문 읽기', category: 'study', inMin: 95, priority: 'side' },
    ],
  },
  {
    id: 'u_park',
    name: '박궁수',
    avatar: '🏹',
    icon: 'archer',
    color: '#10b981',
    bio: '체력 만렙 도전 중',
    events: [
      { id: 'e_park_1', title: '아침 러닝', category: 'health', inMin: 1, priority: 'side', location: '한강' },
      { id: 'e_park_2', title: 'PT 세션', category: 'health', inMin: 140, priority: 'main' },
    ],
  },
  {
    id: 'u_choi',
    name: '최성기사',
    avatar: '🛡️',
    icon: 'shield',
    color: '#3b82f6',
    bio: '심부름 퀘스트 클리어러',
    events: [
      { id: 'e_choi_1', title: '택배 픽업', category: 'errand', inMin: 25, priority: 'side', location: '편의점' },
      { id: 'e_choi_2', title: '장보기', category: 'errand', inMin: 110, priority: 'side', location: '마트' },
    ],
  },
];

const NEW_EVENT_POOL: { title: string; category: CategoryName; priority: Priority; location?: string }[] = [
  { title: '긴급 회의 소집', category: 'work', priority: 'main' },
  { title: '커피 한 잔 ☕', category: 'personal', priority: 'side', location: '카페' },
  { title: '저녁 헬스', category: 'health', priority: 'side', location: '헬스장' },
  { title: '영어 단어 암기', category: 'study', priority: 'side' },
  { title: '약국 들르기', category: 'errand', priority: 'side', location: '약국' },
  { title: '온라인 강의 수강', category: 'study', priority: 'main' },
  { title: '친구와 통화', category: 'personal', priority: 'side' },
  { title: '문서 마감', category: 'work', priority: 'main' },
];

/** Picks a random simulated "just-posted" event for a live notification. */
export function randomNewEvent(): { title: string; category: CategoryName; priority: Priority; location?: string | null; inMin: number } {
  const pick = NEW_EVENT_POOL[Math.floor(Math.random() * NEW_EVENT_POOL.length)];
  const inMin = 5 + Math.floor(Math.random() * 90);
  return { ...pick, location: pick.location ?? null, inMin };
}
