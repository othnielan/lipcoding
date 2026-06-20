import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ScheduleStore } from '../../state/schedule.store';
import { NotesStore } from '../../state/notes.store';
import { CLOCK } from '../../ports/clock.port';
import { CategoryName, Task } from '../../domain/types';
import { IconComponent } from '../../shared/icon.component';
import { NotesViewComponent } from '../notes/notes-view.component';
import { WbsViewComponent } from '../wbs/wbs-view.component';
import { KanbanViewComponent } from '../wbs/kanban-view.component';

type FeatureKey = 'todo' | 'check' | 'week' | 'month' | 'stats' | 'note' | 'wbs' | 'kanban';

interface DayCell {
  day: number | null;
  key?: string;
  count: number;
  isToday: boolean;
}

interface WeekDay {
  key: string;
  label: string;
  dayNum: number;
  isToday: boolean;
  tasks: Task[];
}

const WK = ['월', '화', '수', '목', '금', '토', '일'];
const MONTH_LABEL = WK; // reuse weekday headers for the month grid

/**
 * Feature launcher attached to the active-quest area: a row of icons that open
 * todo / checklist / weekly / monthly / stats views as an in-phone sheet.
 */
@Component({
  selector: 'app-quest-features',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NotesViewComponent, WbsViewComponent, KanbanViewComponent],
  template: `
    <div class="bar">
      @for (f of features; track f.key) {
        <button class="chip" [class.on]="active() === f.key" (click)="toggle(f.key)">
          <span class="ic"><app-icon [name]="f.icon" [size]="14" /></span>
          <span class="lb">{{ f.label }}</span>
          @if (f.key === 'todo' && todoTasks().length) {
            <span class="cnt">{{ todoTasks().length }}</span>
          }
          @if (f.key === 'note' && notes.count()) {
            <span class="cnt">{{ notes.count() }}</span>
          }
        </button>
      }
    </div>

    @if (active(); as key) {
      <div class="sheet">
        <div class="s-head">
          @if (activeFeature(); as f) {
            <span class="s-ttl">
              <span class="s-ic"><app-icon [name]="f.icon" [size]="16" /></span>
              {{ f.label }}
            </span>
          }
          <button class="x" (click)="close()" aria-label="닫기"><app-icon name="close" [size]="14" /></button>
        </div>
        <div class="s-body">
          @switch (key) {
            @case ('todo') {
              @if (todoTasks().length) {
                <ul class="list">
                  @for (t of todoTasks(); track t.id) {
                    <li class="row" [attr.data-pri]="t.priority">
                      <button class="box" (click)="store.toggleTaskDone(t.id)" aria-label="완료"><app-icon name="circle" [size]="14" /></button>
                      <span class="cat"><app-icon [name]="t.category" [size]="15" /></span>
                      <span class="tx">{{ t.title }}</span>
                      @if (timeOf(t); as tm) { <span class="tm"><app-icon name="clock" [size]="12" /> {{ tm }}</span> }
                    </li>
                  }
                </ul>
              } @else {
                <div class="empty"><app-icon name="party" [size]="15" /> 남은 할 일이 없어요!</div>
              }
            }

            @case ('check') {
              <div class="prog">
                <div class="pbar"><span [style.width.%]="donePct()"></span></div>
                <span class="ptxt">{{ store.doneCount() }} / {{ store.totalCount() }} 완료 · {{ donePct() }}%</span>
              </div>
              @if (allTasks().length) {
                <ul class="list">
                  @for (t of allTasks(); track t.id) {
                    <li class="row" [class.done]="t.status === 'done'">
                      <button class="box" [class.checked]="t.status === 'done'" (click)="store.toggleTaskDone(t.id)" aria-label="토글">
                        <app-icon [name]="t.status === 'done' ? 'check' : 'circle'" [size]="14" />
                      </button>
                      <span class="cat"><app-icon [name]="t.category" [size]="15" /></span>
                      <span class="tx">{{ t.title }}</span>
                      @if (t.status === 'skipped') { <span class="skip">건너뜀</span> }
                    </li>
                  }
                </ul>
              } @else {
                <div class="empty">아직 등록된 일정이 없어요.</div>
              }
            }

            @case ('week') {
              <div class="week">
                @for (d of weekDays(); track d.key) {
                  <div class="wday" [class.today]="d.isToday">
                    <div class="wh"><b>{{ d.label }}</b> {{ d.dayNum }}</div>
                    @for (t of d.tasks; track t.id) {
                      <div class="wt" [attr.data-pri]="t.priority" [class.done]="t.status === 'done'">
                        <app-icon [name]="t.category" [size]="12" /> {{ t.title }}
                      </div>
                    } @empty { <div class="wn">—</div> }
                  </div>
                }
              </div>
              @if (untimed().length) {
                <div class="untimed">
                  <div class="ut-h"><app-icon name="hourglass" [size]="12" /> 시간 미지정</div>
                  @for (t of untimed(); track t.id) {
                    <span class="ut-chip"><app-icon [name]="t.category" [size]="12" /> {{ t.title }}</span>
                  }
                </div>
              }
            }

            @case ('month') {
              <div class="mtitle">{{ monthTitle() }}</div>
              <div class="grid">
                @for (h of monthHeaders; track h) { <div class="gh">{{ h }}</div> }
                @for (c of monthGrid(); track $index) {
                  <button
                    class="cell"
                    [class.blank]="c.day === null"
                    [class.today]="c.isToday"
                    [class.has]="c.count > 0"
                    [class.sel]="c.key && selectedDay() === c.key"
                    [disabled]="c.day === null"
                    (click)="c.key && selectDay(c.key)"
                  >
                    @if (c.day !== null) {
                      <span class="dn">{{ c.day }}</span>
                      @if (c.count > 0) { <span class="cdot">{{ c.count }}</span> }
                    }
                  </button>
                }
              </div>
              @if (selectedDay(); as sd) {
                <div class="daylist">
                  <div class="dl-h">{{ sd }}</div>
                  @for (t of dayTasks(); track t.id) {
                    <div class="dl-row" [attr.data-pri]="t.priority">
                      <app-icon [name]="t.category" [size]="13" /> {{ t.title }}
                      @if (timeOf(t); as tm) { <span class="tm">· {{ tm }}</span> }
                    </div>
                  } @empty { <div class="empty sm">이 날엔 일정이 없어요.</div> }
                </div>
              }
            }

            @case ('stats') {
              <div class="stats">
                <div class="kpis">
                  <div class="kpi"><b>Lv.{{ store.level() }}</b><span>레벨</span></div>
                  <div class="kpi"><b>{{ store.xp() }}</b><span>XP</span></div>
                  <div class="kpi"><b>{{ donePct() }}%</b><span>완료율</span></div>
                </div>
                <div class="sec-h">카테고리별</div>
                @for (c of byCategory(); track c.name) {
                  <div class="srow">
                    <span class="sl"><app-icon [name]="c.name" [size]="13" /> {{ c.name }}</span>
                    <div class="sbar"><span [style.width.%]="c.pct"></span></div>
                    <span class="sv">{{ c.count }}</span>
                  </div>
                }
                <div class="sec-h">우선순위</div>
                <div class="pri-row">
                  <span class="pri main"><app-icon name="sword" [size]="13" /> 메인 {{ mainCount() }}</span>
                  <span class="pri side"><app-icon name="sword" [size]="13" /> 사이드 {{ sideCount() }}</span>
                </div>
              </div>
            }

            @case ('note') {
              <app-notes-view />
            }

            @case ('wbs') {
              <app-wbs-view />
            }

            @case ('kanban') {
              <app-kanban-view />
            }
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .bar {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        margin-top: 9px;
      }
      .chip {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        background: #fff;
        border: 1px solid #dfe3ea;
        border-radius: 11px;
        padding: 9px 6px;
        font-size: 12px;
        font-weight: 700;
        color: #3a4252;
        cursor: pointer;
      }
      .chip.on {
        background: #2f6df6;
        border-color: #2f6df6;
        color: #fff;
      }
      .chip .ic {
        font-size: 13px;
        display: inline-flex;
      }
      .chip .cnt {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ef4444;
        color: #fff;
        font-size: 9px;
        font-weight: 800;
        border-radius: 999px;
        padding: 0 4px;
        min-width: 16px;
        height: 16px;
        display: grid;
        place-items: center;
        box-shadow: 0 0 0 2px #eef0f4;
      }
      .sheet {
        position: absolute;
        inset: 0;
        z-index: 6;
        background: #f4f6fa;
        display: flex;
        flex-direction: column;
        animation: up 0.26s cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      @keyframes up {
        from { transform: translateY(100%); }
        to { transform: none; }
      }
      .s-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 11px 13px;
        background: #fff;
        border-bottom: 1px solid #e6e9ef;
      }
      .s-ttl {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        font-weight: 800;
        color: #1f2430;
      }
      .s-ic {
        width: 28px;
        height: 28px;
        border-radius: 9px;
        background: #eef2fd;
        color: #2f6df6;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
      }
      .x {
        border: none;
        background: #eef1f6;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 12px;
        color: #3a4252;
        flex: 0 0 auto;
      }
      .s-body { flex: 1; overflow-y: auto; padding: 11px 12px; }
      .list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
      .row {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #fff;
        border: 1px solid #e6e9ef;
        border-left: 3px solid #94a3b8;
        border-radius: 9px;
        padding: 8px 10px;
        font-size: 13px;
        color: #2a3140;
      }
      .row[data-pri='main'] { border-left-color: #f59e0b; }
      .row[data-pri='side'] { border-left-color: #10b981; }
      .row.done { opacity: 0.55; }
      .row.done .tx { text-decoration: line-through; }
      .box {
        flex: 0 0 auto;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 1.5px solid #c2c9d6;
        background: #fff;
        cursor: pointer;
        font-size: 12px;
        color: #2f6df6;
        display: grid;
        place-items: center;
      }
      .box.checked { background: #10b981; border-color: #10b981; color: #fff; }
      .cat { font-size: 14px; }
      .tx { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .tm { font-size: 11px; color: #7a8294; }
      .skip { font-size: 10px; color: #b45309; background: #fef3c7; padding: 1px 6px; border-radius: 999px; }
      .empty { text-align: center; color: #7a8294; font-size: 13px; padding: 20px 0; }
      .empty.sm { padding: 8px 0; }
      .prog { margin-bottom: 11px; }
      .pbar { height: 8px; background: #e6e9ef; border-radius: 999px; overflow: hidden; }
      .pbar span { display: block; height: 100%; background: linear-gradient(90deg, #10b981, #34d399); transition: width 0.4s; }
      .ptxt { font-size: 11.5px; color: #525a6b; display: block; margin-top: 5px; }
      .week { display: flex; flex-direction: column; gap: 6px; }
      .wday { background: #fff; border: 1px solid #e6e9ef; border-radius: 9px; padding: 7px 9px; }
      .wday.today { border-color: #2f6df6; box-shadow: 0 0 0 1px #2f6df6 inset; }
      .wh { font-size: 11.5px; color: #525a6b; margin-bottom: 4px; }
      .wh b { color: #1f2430; }
      .wt { font-size: 12px; color: #2a3140; padding: 2px 0; border-left: 3px solid #94a3b8; padding-left: 7px; margin-top: 3px; }
      .wt[data-pri='main'] { border-left-color: #f59e0b; }
      .wt[data-pri='side'] { border-left-color: #10b981; }
      .wt.done { opacity: 0.5; text-decoration: line-through; }
      .wn { font-size: 11px; color: #aab2c0; }
      .untimed { margin-top: 10px; }
      .ut-h { font-size: 11.5px; color: #525a6b; margin-bottom: 5px; }
      .ut-chip { display: inline-block; font-size: 11.5px; background: #fff; border: 1px solid #e6e9ef; border-radius: 999px; padding: 3px 8px; margin: 0 5px 5px 0; }
      .mtitle { font-size: 13px; font-weight: 800; color: #1f2430; text-align: center; margin-bottom: 8px; }
      .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
      .gh { font-size: 10.5px; color: #7a8294; text-align: center; padding-bottom: 2px; font-weight: 700; }
      .cell {
        aspect-ratio: 1;
        border: 1px solid #e6e9ef;
        background: #fff;
        border-radius: 7px;
        position: relative;
        cursor: pointer;
        display: grid;
        place-items: center;
        padding: 0;
      }
      .cell.blank { border-color: transparent; background: transparent; cursor: default; }
      .cell.today { border-color: #2f6df6; box-shadow: 0 0 0 1px #2f6df6 inset; }
      .cell.has { background: #eaf1ff; }
      .cell.sel { background: #2f6df6; }
      .cell.sel .dn { color: #fff; }
      .dn { font-size: 11.5px; color: #2a3140; }
      .cdot {
        position: absolute;
        bottom: 3px;
        right: 4px;
        font-size: 8px;
        font-weight: 800;
        color: #2f6df6;
      }
      .cell.sel .cdot { color: #cfe0ff; }
      .daylist { margin-top: 10px; background: #fff; border: 1px solid #e6e9ef; border-radius: 9px; padding: 9px 10px; }
      .dl-h { font-size: 12px; font-weight: 700; color: #1f2430; margin-bottom: 6px; }
      .dl-row { font-size: 12.5px; color: #2a3140; padding: 3px 0 3px 7px; border-left: 3px solid #94a3b8; margin-bottom: 3px; }
      .dl-row[data-pri='main'] { border-left-color: #f59e0b; }
      .dl-row[data-pri='side'] { border-left-color: #10b981; }
      .stats { display: flex; flex-direction: column; gap: 10px; }
      .kpis { display: flex; gap: 8px; }
      .kpi { flex: 1; background: #fff; border: 1px solid #e6e9ef; border-radius: 10px; padding: 10px; text-align: center; }
      .kpi b { display: block; font-size: 18px; color: #1f2430; }
      .kpi span { font-size: 10.5px; color: #7a8294; }
      .sec-h { font-size: 12px; font-weight: 800; color: #525a6b; }
      .srow { display: flex; align-items: center; gap: 8px; }
      .sl { flex: 0 0 84px; font-size: 12px; color: #2a3140; }
      .sbar { flex: 1; height: 7px; background: #e6e9ef; border-radius: 999px; overflow: hidden; }
      .sbar span { display: block; height: 100%; background: linear-gradient(90deg, #2f6df6, #60a5fa); }
      .sv { font-size: 11.5px; color: #525a6b; width: 18px; text-align: right; }
      .pri-row { display: flex; gap: 8px; }
      .pri { flex: 1; text-align: center; font-size: 12px; font-weight: 700; border-radius: 9px; padding: 8px; }
      .pri.main { background: #fff7e6; color: #92600b; border: 1px solid #f5c971; }
      .pri.side { background: #e7fbf0; color: #0c5238; border: 1px solid #7fd9ad; }
      .tab, .tm, .ut-chip, .sl, .ut-h, .dl-h { display: inline-flex; align-items: center; gap: 4px; }
      .wt, .dl-row { display: flex; align-items: center; gap: 5px; }
      .empty { display: flex; align-items: center; justify-content: center; gap: 5px; }
      .pri { display: inline-flex; align-items: center; justify-content: center; gap: 5px; }
    `,
  ],
})
export class QuestFeaturesComponent {
  readonly store = inject(ScheduleStore);
  readonly notes = inject(NotesStore);
  private readonly clock = inject(CLOCK);

  readonly features: { key: FeatureKey; icon: string; label: string }[] = [
    { key: 'todo', icon: 'todo', label: '투두' },
    { key: 'check', icon: 'checklist', label: '체크리스트' },
    { key: 'week', icon: 'week', label: '주간' },
    { key: 'month', icon: 'month', label: '월간' },
    { key: 'stats', icon: 'stats', label: '통계' },
    { key: 'note', icon: 'note', label: '노트' },
    { key: 'wbs', icon: 'wbs', label: 'WBS' },
    { key: 'kanban', icon: 'kanban', label: '칸반' },
  ];
  readonly monthHeaders = MONTH_LABEL;

  readonly active = signal<FeatureKey | null>(null);
  readonly activeFeature = computed(() => this.features.find((f) => f.key === this.active()) ?? null);
  readonly selectedDay = signal<string | null>(null);

  readonly allTasks = computed(() =>
    [...this.store.tasks()].sort((a, b) => this.sortKey(a) - this.sortKey(b)),
  );
  readonly todoTasks = computed(() =>
    this.allTasks().filter((t) => t.status === 'pending' || t.status === 'active'),
  );
  readonly untimed = computed(() => this.store.tasks().filter((t) => !t.start && !t.end));

  readonly weekDays = computed<WeekDay[]>(() => {
    const monday = this.startOfWeek(this.clock.now());
    const byDate = this.groupByDate();
    const todayKey = this.dateKey(this.clock.now());
    return WK.map((label, i) => {
      const d = this.addDays(monday, i);
      const key = this.dateKey(d);
      return { key, label, dayNum: d.getDate(), isToday: key === todayKey, tasks: byDate.get(key) ?? [] };
    });
  });

  readonly monthGrid = computed<DayCell[]>(() => {
    const now = this.clock.now();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const counts = this.countByDate();
    const todayKey = this.dateKey(now);
    const cells: DayCell[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ day: null, count: 0, isToday: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${this.pad(month + 1)}-${this.pad(d)}`;
      cells.push({ day: d, key, count: counts.get(key) ?? 0, isToday: key === todayKey });
    }
    return cells;
  });

  readonly monthTitle = computed(() => {
    const d = this.clock.now();
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
  });

  readonly dayTasks = computed(() => {
    const sd = this.selectedDay();
    if (!sd) return [];
    return this.groupByDate().get(sd) ?? [];
  });

  readonly byCategory = computed(() => {
    const total = this.store.tasks().length || 1;
    const map = new Map<CategoryName, number>();
    for (const t of this.store.tasks()) map.set(t.category, (map.get(t.category) ?? 0) + 1);
    return [...map.entries()]
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  });
  readonly mainCount = computed(() => this.store.tasks().filter((t) => t.priority === 'main').length);
  readonly sideCount = computed(() => this.store.tasks().filter((t) => t.priority === 'side').length);

  donePct(): number {
    const total = this.store.totalCount();
    return total ? Math.round((this.store.doneCount() / total) * 100) : 0;
  }

  toggle(key: FeatureKey): void {
    this.active.update((v) => (v === key ? null : key));
    if (this.active() === 'month' && !this.selectedDay()) {
      this.selectedDay.set(this.dateKey(this.clock.now()));
    }
  }
  close(): void {
    this.active.set(null);
  }
  selectDay(key: string): void {
    this.selectedDay.set(key);
  }

  timeOf(t: Task): string | null {
    const v = t.start ?? t.end;
    if (!v) return null;
    const d = new Date(v);
    return `${this.pad(d.getHours())}:${this.pad(d.getMinutes())}`;
  }

  // --- date helpers ------------------------------------------------------
  private groupByDate(): Map<string, Task[]> {
    const map = new Map<string, Task[]>();
    for (const t of this.store.tasks()) {
      const v = t.start ?? t.end;
      if (!v) continue;
      const key = this.dateKey(new Date(v));
      (map.get(key) ?? map.set(key, []).get(key)!).push(t);
    }
    for (const list of map.values()) list.sort((a, b) => this.sortKey(a) - this.sortKey(b));
    return map;
  }
  private countByDate(): Map<string, number> {
    const map = new Map<string, number>();
    for (const [k, v] of this.groupByDate()) map.set(k, v.length);
    return map;
  }
  private sortKey(t: Task): number {
    const v = t.start ?? t.end;
    return v ? new Date(v).getTime() : Number.MAX_SAFE_INTEGER;
  }
  private dateKey(d: Date): string {
    return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
  }
  private startOfWeek(d: Date): Date {
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = (copy.getDay() + 6) % 7; // days since Monday
    copy.setDate(copy.getDate() - diff);
    return copy;
  }
  private addDays(d: Date, n: number): Date {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + n);
    return copy;
  }
  private pad(n: number): string {
    return n.toString().padStart(2, '0');
  }
}
