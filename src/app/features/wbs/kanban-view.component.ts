import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KanbanStore } from '../../state/kanban.store';
import { KanbanColumn } from '../../domain/kanban';
import { IconComponent } from '../../shared/icon.component';

/**
 * Kanban board view for project schedule management. Renders three fixed columns
 * (할 일 / 진행 중 / 완료) with inline card add and left/right move controls.
 */
@Component({
  selector: 'app-kanban-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="khead">
      <span class="kl">완료율</span>
      <b class="kv">{{ store.donePct() }}%</b>
    </div>
    <div class="kbar"><span [style.width.%]="store.donePct()"></span></div>

    @if (store.total()) {
      <div class="board">
        @for (col of columns; track col.key) {
          <section class="col" [attr.data-col]="col.key">
            <header class="col-h">
              <span class="dot"></span>
              <span class="ct">{{ col.label }}</span>
              <span class="cc">{{ store.column(col.key).length }}</span>
            </header>
            <div class="cards">
              @for (c of store.column(col.key); track c.id) {
                <article class="card">
                  <p class="cx">{{ c.title }}</p>
                  <div class="cops">
                    <button
                      class="mv"
                      [disabled]="col.key === 'todo'"
                      (click)="store.moveLeft(c.id)"
                      aria-label="왼쪽 칸으로 이동"
                    >
                      <app-icon name="chevron-left" [size]="13" />
                    </button>
                    <button class="mv del" (click)="store.remove(c.id)" aria-label="삭제">
                      <app-icon name="trash" [size]="13" />
                    </button>
                    <button
                      class="mv"
                      [disabled]="col.key === 'done'"
                      (click)="store.moveRight(c.id)"
                      aria-label="오른쪽 칸으로 이동"
                    >
                      <app-icon name="chevron-right" [size]="13" />
                    </button>
                  </div>
                </article>
              }
              @if (addingTo() === col.key) {
                <div class="addrow">
                  <input
                    [(ngModel)]="cardDraft"
                    (keydown.enter)="confirmAdd(col.key)"
                    (keydown.escape)="cancelAdd()"
                    placeholder="카드 이름…"
                  />
                  <button class="add sm" (click)="confirmAdd(col.key)" aria-label="추가"><app-icon name="plus" [size]="13" /></button>
                  <button class="add sm ghost" (click)="cancelAdd()" aria-label="취소"><app-icon name="close" [size]="12" /></button>
                </div>
              } @else {
                <button class="addcard" (click)="startAdd(col.key)">
                  <app-icon name="plus" [size]="13" /> 카드 추가
                </button>
              }
            </div>
          </section>
        }
      </div>
    } @else {
      <div class="empty">
        <app-icon name="kanban" [size]="16" /> 카드를 추가해 작업을 칸반으로 관리하세요.
        <button class="demo" (click)="store.seedDemo()">예시 보드 넣기</button>
      </div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .khead { display: flex; align-items: baseline; justify-content: space-between; }
      .kl { font-size: 12px; color: #525a6b; font-weight: 700; }
      .kv { font-size: 15px; color: #1f2430; }
      .kbar { height: 8px; background: #e6e9ef; border-radius: 999px; overflow: hidden; margin: 6px 0 11px; }
      .kbar span { display: block; height: 100%; background: #2f6df6; transition: width 0.3s ease; }
      .board { display: flex; flex-direction: column; gap: 10px; }
      .col {
        background: #eef1f6;
        border: 1px solid #e6e9ef;
        border-radius: 11px;
        padding: 9px;
      }
      .col-h { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
      .dot { width: 9px; height: 9px; border-radius: 50%; flex: 0 0 auto; }
      .col[data-col='todo'] .dot { background: #94a3b8; }
      .col[data-col='doing'] .dot { background: #f59e0b; }
      .col[data-col='done'] .dot { background: #10b981; }
      .ct { font-size: 12.5px; font-weight: 800; color: #2a3140; flex: 1; }
      .cc {
        font-size: 10.5px;
        font-weight: 800;
        color: #525a6b;
        background: #fff;
        border-radius: 999px;
        padding: 1px 8px;
      }
      .cards { display: flex; flex-direction: column; gap: 6px; }
      .card {
        background: #fff;
        border: 1px solid #e6e9ef;
        border-radius: 9px;
        padding: 8px 10px;
      }
      .col[data-col='todo'] .card { border-left: 3px solid #94a3b8; }
      .col[data-col='doing'] .card { border-left: 3px solid #f59e0b; }
      .col[data-col='done'] .card { border-left: 3px solid #10b981; }
      .col[data-col='done'] .cx { text-decoration: line-through; color: #9aa3b2; }
      .cx { margin: 0 0 6px; font-size: 13px; color: #2a3140; word-break: break-word; }
      .cops { display: flex; gap: 4px; justify-content: flex-end; }
      .mv {
        width: 26px;
        height: 26px;
        border: none;
        background: #f4f6fa;
        color: #97a0b0;
        border-radius: 7px;
        display: grid;
        place-items: center;
        cursor: pointer;
      }
      .mv:disabled { opacity: 0.3; cursor: default; }
      .mv.del:hover { color: #ef4444; }
      .addcard {
        border: 1px dashed #c2c9d6;
        background: transparent;
        color: #6b7280;
        border-radius: 9px;
        padding: 7px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
      }
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
      .add {
        border: none;
        background: #2f6df6;
        color: #fff;
        border-radius: 8px;
        display: grid;
        place-items: center;
        cursor: pointer;
        flex: 0 0 auto;
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
export class KanbanViewComponent {
  readonly store = inject(KanbanStore);

  readonly columns: { key: KanbanColumn; label: string }[] = [
    { key: 'todo', label: '할 일' },
    { key: 'doing', label: '진행 중' },
    { key: 'done', label: '완료' },
  ];

  readonly cardDraft = signal('');
  readonly addingTo = signal<KanbanColumn | null>(null);

  startAdd(col: KanbanColumn): void {
    this.cardDraft.set('');
    this.addingTo.set(col);
  }

  confirmAdd(col: KanbanColumn): void {
    const t = this.cardDraft().trim();
    if (!t) return;
    this.store.add(col, t);
    this.cardDraft.set('');
  }

  cancelAdd(): void {
    this.addingTo.set(null);
    this.cardDraft.set('');
  }
}
