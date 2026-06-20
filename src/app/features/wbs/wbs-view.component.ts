import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WbsStore, WbsRow } from '../../state/wbs.store';
import { WbsItem } from '../../domain/wbs';
import { IconComponent } from '../../shared/icon.component';

/**
 * WBS (Work Breakdown Structure) view for project schedule management. Renders
 * the project tree with hierarchical numbering, per-node progress rollup, and
 * inline add / complete / delete actions.
 */
@Component({
  selector: 'app-wbs-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="whead">
      <span class="wl">전체 진행률</span>
      <b class="wv">{{ store.overall() }}%</b>
    </div>
    <div class="wbar"><span [style.width.%]="store.overall()"></span></div>

    <div class="addp">
      <input
        [(ngModel)]="projDraft"
        (keydown.enter)="addProject()"
        placeholder="새 프로젝트 이름…"
      />
      <button class="add" (click)="addProject()" [disabled]="!projDraft().trim()" aria-label="프로젝트 추가">
        <app-icon name="plus" [size]="15" />
      </button>
    </div>

    @if (rows().length) {
      <ul class="tree">
        @for (r of rows(); track r.id) {
          <li class="node" [style.paddingLeft.px]="r.depth * 16" [attr.data-pr]="band(r.progress)">
            <span class="twist" (click)="r.hasChildren ? toggleCollapse(r.id) : null">
              @if (r.hasChildren) {
                <app-icon [name]="isCollapsed(r.id) ? 'chevron-right' : 'chevron-down'" [size]="13" />
              }
            </span>
            @if (r.hasChildren) {
              <span class="ic"><app-icon name="folder" [size]="14" /></span>
            } @else {
              <button class="box" [class.checked]="r.done" (click)="store.toggleDone(r.id)" aria-label="완료 토글">
                <app-icon [name]="r.done ? 'check' : 'circle'" [size]="13" />
              </button>
            }
            <span class="code">{{ r.code }}</span>
            <span class="tt" [class.done]="!r.hasChildren && r.done">{{ r.title }}</span>
            @if (r.hasChildren) {
              <span class="pc">{{ r.progress }}%</span>
            }
            <span class="ops">
              <button class="op" (click)="startAdd(r.id)" aria-label="하위 작업 추가"><app-icon name="plus" [size]="13" /></button>
              <button class="op del" (click)="store.remove(r.id)" aria-label="삭제"><app-icon name="trash" [size]="13" /></button>
            </span>
          </li>
          @if (addingTo() === r.id) {
            <li class="addrow" [style.paddingLeft.px]="(r.depth + 1) * 16">
              <input
                [(ngModel)]="childDraft"
                (keydown.enter)="confirmAdd(r.id)"
                (keydown.escape)="cancelAdd()"
                placeholder="하위 작업 이름…"
              />
              <button class="add sm" (click)="confirmAdd(r.id)" aria-label="추가"><app-icon name="plus" [size]="13" /></button>
              <button class="add sm ghost" (click)="cancelAdd()" aria-label="취소"><app-icon name="close" [size]="12" /></button>
            </li>
          }
        }
      </ul>
    } @else {
      <div class="empty">
        <app-icon name="wbs" [size]="16" /> 프로젝트를 추가해 작업을 분해해보세요.
        <button class="demo" (click)="store.seedDemo()">예시 프로젝트 넣기</button>
      </div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .whead { display: flex; align-items: baseline; justify-content: space-between; }
      .wl { font-size: 12px; color: #525a6b; font-weight: 700; }
      .wv { font-size: 15px; color: #1f2430; }
      .wbar { height: 8px; background: #e6e9ef; border-radius: 999px; overflow: hidden; margin: 6px 0 11px; }
      .wbar span { display: block; height: 100%; background: linear-gradient(90deg, #2f6df6, #60a5fa); transition: width 0.3s ease; }
      .addp { display: flex; gap: 6px; margin-bottom: 10px; }
      .addp input {
        flex: 1;
        border: 1px solid #d7dbe3;
        border-radius: 9px;
        padding: 8px 11px;
        font-size: 13px;
        outline: none;
        background: #fff;
        color: #1f2430;
      }
      .addp input:focus { border-color: #2f6df6; }
      .add {
        border: none;
        background: #2f6df6;
        color: #fff;
        border-radius: 9px;
        width: 36px;
        display: grid;
        place-items: center;
        cursor: pointer;
        flex: 0 0 auto;
      }
      .add:disabled { opacity: 0.4; }
      .tree { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
      .node {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #fff;
        border: 1px solid #e6e9ef;
        border-left: 3px solid #cbd2dd;
        border-radius: 8px;
        padding: 7px 8px;
        font-size: 13px;
        color: #2a3140;
      }
      .node[data-pr='full'] { border-left-color: #10b981; }
      .node[data-pr='mid'] { border-left-color: #f59e0b; }
      .node[data-pr='low'] { border-left-color: #cbd2dd; }
      .twist {
        flex: 0 0 auto;
        width: 15px;
        height: 15px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #8a92a3;
        cursor: pointer;
      }
      .ic { flex: 0 0 auto; display: inline-flex; color: #c08a17; }
      .box {
        flex: 0 0 auto;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 1.5px solid #c2c9d6;
        background: #fff;
        cursor: pointer;
        color: #2f6df6;
        display: grid;
        place-items: center;
      }
      .box.checked { background: #10b981; border-color: #10b981; color: #fff; }
      .code {
        flex: 0 0 auto;
        font-size: 10.5px;
        font-weight: 800;
        color: #8a92a3;
        font-variant-numeric: tabular-nums;
        min-width: 26px;
      }
      .tt { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .tt.done { text-decoration: line-through; color: #9aa3b2; }
      .pc {
        flex: 0 0 auto;
        font-size: 10.5px;
        font-weight: 800;
        color: #2f6df6;
        background: #eaf1ff;
        border-radius: 999px;
        padding: 1px 7px;
      }
      .ops { flex: 0 0 auto; display: inline-flex; gap: 2px; }
      .op {
        width: 25px;
        height: 25px;
        border: none;
        background: #f4f6fa;
        color: #97a0b0;
        border-radius: 7px;
        display: grid;
        place-items: center;
        cursor: pointer;
      }
      .op.del:hover { color: #ef4444; }
      .addrow { display: flex; gap: 5px; align-items: center; }
      .addrow input {
        flex: 1;
        border: 1px solid #b9c6e6;
        border-radius: 8px;
        padding: 7px 10px;
        font-size: 12.5px;
        outline: none;
        background: #fff;
        color: #1f2430;
      }
      .add.sm { width: 30px; height: 30px; }
      .add.sm.ghost { background: #eef1f6; color: #6b7280; }
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        text-align: center;
        color: #7a8294;
        font-size: 13px;
        padding: 26px 10px;
      }
      .demo {
        border: 1px solid #2f6df6;
        background: #eaf1ff;
        color: #2f6df6;
        font-weight: 700;
        font-size: 12.5px;
        border-radius: 9px;
        padding: 7px 14px;
        cursor: pointer;
      }
    `,
  ],
})
export class WbsViewComponent {
  readonly store = inject(WbsStore);

  readonly projDraft = signal('');
  readonly childDraft = signal('');
  readonly addingTo = signal<string | null>(null);
  readonly collapsed = signal<Set<string>>(new Set());

  readonly rows = computed<WbsRow[]>(() => {
    const items = this.store.items();
    const byParent = new Map<string | null, WbsItem[]>();
    for (const it of items) {
      const k = it.parentId;
      const arr = byParent.get(k) ?? byParent.set(k, []).get(k)!;
      arr.push(it);
    }
    for (const arr of byParent.values()) {
      arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    const collapsed = this.collapsed();
    const out: WbsRow[] = [];
    const walk = (parentId: string | null, depth: number, prefix: string): void => {
      const kids = byParent.get(parentId) ?? [];
      kids.forEach((it, idx) => {
        const code = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
        const hasChildren = (byParent.get(it.id) ?? []).length > 0;
        const stats = hasChildren ? this.leafStats(it.id, byParent) : { done: 0, total: 0 };
        const progress = hasChildren
          ? stats.total
            ? Math.round((stats.done / stats.total) * 100)
            : 0
          : it.done
            ? 100
            : 0;
        out.push({ ...it, depth, code, hasChildren, progress, leafCount: stats.total });
        if (hasChildren && !collapsed.has(it.id)) walk(it.id, depth + 1, code);
      });
    };
    walk(null, 0, '');
    return out;
  });

  addProject(): void {
    const t = this.projDraft().trim();
    if (!t) return;
    this.projDraft.set('');
    this.store.add(null, t);
  }

  startAdd(parentId: string): void {
    this.childDraft.set('');
    this.addingTo.set(parentId);
    // ensure the parent is expanded so the new child is visible
    if (this.collapsed().has(parentId)) this.toggleCollapse(parentId);
  }
  confirmAdd(parentId: string): void {
    const t = this.childDraft().trim();
    if (!t) return;
    this.store.add(parentId, t);
    this.childDraft.set('');
    // keep the row open for quick consecutive entry
  }
  cancelAdd(): void {
    this.addingTo.set(null);
    this.childDraft.set('');
  }

  toggleCollapse(id: string): void {
    this.collapsed.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  isCollapsed(id: string): boolean {
    return this.collapsed().has(id);
  }

  band(progress: number): 'full' | 'mid' | 'low' {
    if (progress >= 100) return 'full';
    if (progress > 0) return 'mid';
    return 'low';
  }

  private leafStats(id: string, byParent: Map<string | null, WbsItem[]>): { done: number; total: number } {
    const kids = byParent.get(id) ?? [];
    let done = 0;
    let total = 0;
    for (const k of kids) {
      const grandkids = byParent.get(k.id) ?? [];
      if (grandkids.length) {
        const s = this.leafStats(k.id, byParent);
        done += s.done;
        total += s.total;
      } else {
        total += 1;
        if (k.done) done += 1;
      }
    }
    return { done, total };
  }
}
