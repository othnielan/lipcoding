import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ScheduleStore } from '../../state/schedule.store';
import { Task } from '../../domain/types';
import { IconComponent } from '../../shared/icon.component';

interface Node {
  task: Task;
  x: number;
  y: number;
}
interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const NODE_W = 230;
const NODE_H = 58;
const GAP_Y = 30;
const TOP = 20;
const LEFT = 30;

@Component({
  selector: 'app-ontology-graph-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="panel">
      <div class="head">
        <span class="ttl"><app-icon name="stats" [size]="14" /> 온토로지 그래프</span>
        <div class="legend">
          <span class="lg main">main</span>
          <span class="lg sub">sub</span>
          <span class="lg side">side</span>
        </div>
      </div>

      @if (nodes().length === 0) {
        <div class="empty">발화하면 Task 노드가 자동으로 생성됩니다.</div>
      } @else {
        <div class="canvas">
          <svg [attr.viewBox]="'0 0 ' + width() + ' ' + height()" [style.height.px]="height()">
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3"
                orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,3 L0,6 Z" fill="#6b7280" />
              </marker>
            </defs>
            @for (e of edges(); track $index) {
              <path
                [attr.d]="edgePath(e)"
                fill="none"
                stroke="#6b7280"
                stroke-width="1.6"
                marker-end="url(#arrow)"
              />
            }
            @for (n of nodes(); track n.task.id) {
              <g class="node" [attr.transform]="'translate(' + n.x + ',' + n.y + ')'">
                <rect
                  [attr.width]="nodeW"
                  [attr.height]="nodeH"
                  rx="11"
                  [attr.fill]="fill(n.task)"
                  [attr.stroke]="stroke(n.task)"
                  stroke-width="1.6"
                />
                <text x="12" y="22" class="t-title">{{ trim(n.task.title) }}</text>
                <text x="12" y="42" class="t-meta">{{ meta(n.task) }}</text>
              </g>
            }
          </svg>
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
        margin-bottom: 8px;
      }
      .ttl {
        font-weight: 700;
        font-size: 13px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .legend {
        display: flex;
        gap: 6px;
      }
      .lg {
        font-size: 10px;
        padding: 2px 7px;
        border-radius: 5px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .lg.main {
        background: #f59e0b;
      }
      .lg.sub {
        background: #3b82f6;
        color: #fff;
      }
      .lg.side {
        background: #10b981;
        color: #fff;
      }
      .canvas {
        max-height: 320px;
        overflow: auto;
        border-radius: 8px;
      }
      svg {
        width: 100%;
        display: block;
      }
      .node {
        animation: fade 0.4s ease;
      }
      .t-title {
        font-size: 12.5px;
        font-weight: 700;
        fill: #fff;
      }
      .t-meta {
        font-size: 10.5px;
        fill: rgba(255, 255, 255, 0.85);
      }
      .empty {
        color: var(--muted);
        font-size: 12.5px;
        padding: 14px 0;
        text-align: center;
      }
      @keyframes fade {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
      }
    `,
  ],
})
export class OntologyGraphCanvasComponent {
  private readonly store = inject(ScheduleStore);
  readonly nodeW = NODE_W;
  readonly nodeH = NODE_H;

  readonly nodes = computed<Node[]>(() => {
    const tasks = [...this.store.tasks()].sort((a, b) => order(a) - order(b));
    return tasks.map((task, i) => ({
      task,
      x: LEFT + (i % 2) * (NODE_W + 60),
      y: TOP + i * (NODE_H + GAP_Y),
    }));
  });

  readonly edges = computed<Edge[]>(() => {
    const pos = new Map<string, Node>();
    for (const n of this.nodes()) pos.set(n.task.id, n);
    const out: Edge[] = [];
    for (const n of this.nodes()) {
      for (const dep of n.task.dependsOn) {
        const from = pos.get(dep);
        if (!from) continue;
        out.push({
          x1: from.x + NODE_W / 2,
          y1: from.y + NODE_H,
          x2: n.x + NODE_W / 2,
          y2: n.y,
        });
      }
    }
    return out;
  });

  readonly width = computed(() => LEFT * 2 + NODE_W + 60 + NODE_W);
  readonly height = computed(() =>
    Math.max(120, TOP * 2 + this.store.tasks().length * (NODE_H + GAP_Y)),
  );

  edgePath(e: Edge): string {
    const my = (e.y1 + e.y2) / 2;
    return `M${e.x1},${e.y1} C${e.x1},${my} ${e.x2},${my} ${e.x2},${e.y2}`;
  }

  fill(t: Task): string {
    if (t.status === 'done' || t.status === 'skipped') return '#3a3f4d';
    return t.priority === 'main' ? '#b8780a' : '#1f6f50';
  }
  stroke(t: Task): string {
    if (t.status === 'done' || t.status === 'skipped') return '#5a6172';
    return t.priority === 'main' ? '#f59e0b' : '#10b981';
  }
  trim(s: string): string {
    return s.length > 16 ? s.slice(0, 15) + '…' : s;
  }
  meta(t: Task): string {
    const time = t.start || t.end ? clock(t.start ?? t.end!) : '시간 미정';
    const loc = t.location ? ` · ${t.location}` : '';
    const st = t.status === 'done' ? ' · 완료' : '';
    return `${t.priority}${st} · ${time}${loc}`;
  }
}

function order(t: Task): number {
  const v = t.start ?? t.end;
  return v ? new Date(v).getTime() : Number.MAX_SAFE_INTEGER;
}
function clock(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}
