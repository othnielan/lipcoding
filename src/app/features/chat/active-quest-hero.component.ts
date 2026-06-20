import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ScheduleStore } from '../../state/schedule.store';
import { CATEGORY_EMOJI } from '../../domain/types';
import { QuestFeaturesComponent } from './quest-features.component';

@Component({
  selector: 'app-active-quest-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QuestFeaturesComponent],
  template: `
    @if (store.activeQuest(); as q) {
      <div class="hero" [attr.data-kind]="q.kind">
        <div class="tag">
          <span class="dot"></span>{{ label(q.kind) }} · 지금 할 일
        </div>
        <div class="title">🗡 {{ q.title }}</div>
        <div class="meta">
          @if (task(); as t) {
            <span>{{ emoji(t.category) }} {{ t.category }}</span>
            @if (t.location) { <span>📍 {{ t.location }}</span> }
            @if (clock(); as c) { <span>⏰ {{ c }}</span> }
          }
        </div>
      </div>
    } @else {
      <div class="hero empty">🎉 모든 임무 완료! 새 일정을 말해보게.</div>
    }
    <app-quest-features />
  `,
  styles: [
    `
      .hero {
        border-radius: 14px;
        padding: 10px 12px;
        background: linear-gradient(135deg, #fff7e6, #ffe9bf);
        border: 1px solid #f5c971;
        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18);
        color: #4a3a09;
      }
      .hero[data-kind='sub'] {
        background: linear-gradient(135deg, #eaf1ff, #cfe0ff);
        border-color: #93b4fb;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
        color: #14306e;
      }
      .hero[data-kind='side'] {
        background: linear-gradient(135deg, #e7fbf0, #c8f3dd);
        border-color: #7fd9ad;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.16);
        color: #0c5238;
      }
      .hero.empty {
        background: #f1f3f7;
        border-color: #d6dae3;
        color: #525a6b;
        text-align: center;
        box-shadow: none;
        font-size: 13px;
      }
      .tag {
        font-size: 11px;
        font-weight: 700;
        opacity: 0.8;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
        animation: pulse 1.4s infinite;
      }
      .title {
        font-size: 15px;
        font-weight: 800;
        margin: 3px 0;
      }
      .meta {
        display: flex;
        gap: 10px;
        font-size: 11.5px;
        opacity: 0.85;
        flex-wrap: wrap;
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.25;
        }
      }
    `,
  ],
})
export class ActiveQuestHeroComponent {
  readonly store = inject(ScheduleStore);
  readonly task = computed(() => {
    const q = this.store.activeQuest();
    if (!q) return null;
    return this.store.tasks().find((t) => t.id === q.taskIds[0]) ?? null;
  });
  readonly clock = computed(() => {
    const t = this.task();
    const v = t?.start ?? t?.end;
    if (!v) return null;
    const d = new Date(v);
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  });

  label(kind: string): string {
    return kind === 'main' ? '메인 퀘스트' : kind === 'sub' ? '서브 퀘스트' : '사이드 퀘스트';
  }
  emoji(cat: keyof typeof CATEGORY_EMOJI): string {
    return CATEGORY_EMOJI[cat];
  }
}
