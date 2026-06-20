import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScheduleStore } from '../../state/schedule.store';

@Component({
  selector: 'app-triple-store-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="panel">
      <div class="head">
        <span class="ttl">🧾 트리플 스토어 <span class="count">{{ filtered().length }}</span></span>
        <input class="filter" [(ngModel)]="query" placeholder="predicate/값 검색…" />
      </div>
      @if (filtered().length === 0) {
        <div class="empty">트리플이 없습니다.</div>
      } @else {
        <div class="tbl">
          <table class="mono">
            <thead>
              <tr><th>subject</th><th>predicate</th><th>object</th></tr>
            </thead>
            <tbody>
              @for (t of filtered(); track $index) {
                <tr>
                  <td class="s">{{ t.subject }}</td>
                  <td class="p">{{ t.predicate }}</td>
                  <td class="o">{{ t.object }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
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
        gap: 10px;
        margin-bottom: 8px;
      }
      .ttl {
        font-weight: 700;
        font-size: 13px;
        white-space: nowrap;
      }
      .count {
        color: var(--muted);
        font-weight: 600;
        font-size: 11px;
      }
      .filter {
        background: var(--panel-2);
        border: 1px solid var(--line);
        border-radius: 7px;
        padding: 5px 9px;
        color: var(--ink);
        font-size: 12px;
        outline: none;
        width: 160px;
      }
      .tbl {
        max-height: 240px;
        overflow: auto;
        border-radius: 7px;
        border: 1px solid var(--line);
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
      }
      th {
        position: sticky;
        top: 0;
        background: #0c0e14;
        color: var(--muted);
        text-align: left;
        padding: 6px 8px;
        font-weight: 600;
      }
      td {
        padding: 5px 8px;
        border-top: 1px solid var(--line);
        vertical-align: top;
      }
      .s {
        color: #93c5fd;
      }
      .p {
        color: #c4b5fd;
      }
      .o {
        color: #86efac;
      }
      .empty {
        color: var(--muted);
        font-size: 12.5px;
        padding: 10px 0;
        text-align: center;
      }
    `,
  ],
})
export class TripleStoreTableComponent {
  private readonly store = inject(ScheduleStore);
  readonly query = signal('');
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.store.triples();
    if (!q) return all;
    return all.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.predicate.toLowerCase().includes(q) ||
        t.object.toLowerCase().includes(q),
    );
  });
}
