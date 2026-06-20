import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PhoneFrameComponent } from '../chat/phone-frame.component';
import { OntologyLiveViewComponent } from '../ontology/ontology-live-view.component';
import { ScheduleStore } from '../../state/schedule.store';
import { ExtractService } from '../../services/extract.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-live-console',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PhoneFrameComponent, OntologyLiveViewComponent, IconComponent],
  template: `
    <header class="topbar">
      <div class="brand">
        <span class="logo"><app-icon name="tools" [size]="24" /></span>
        <div>
          <div class="title">스케줄게이미피케이션</div>
          <div class="sub">발화 → 의도분류 → 온톨로지 → 퀘스트</div>
        </div>
      </div>

      <div class="char">
        <div class="lv">Lv.{{ store.level() }}</div>
        <div class="xpbar">
          <div class="fill" [style.width.%]="store.xpProgress().ratio * 100"></div>
        </div>
        <div class="xptext">
          {{ store.xpProgress().current }}/{{ store.xpProgress().needed }} XP ·
          <app-icon name="sword" [size]="12" /> {{ store.doneCount() }}/{{ store.totalCount() }}
        </div>
      </div>

      <div class="actions">
        <button (click)="seed()" [disabled]="extract.busy()"><app-icon name="play" [size]="13" /> 데모 실행</button>
        <button class="ghost" (click)="store.reset()"><app-icon name="reset" [size]="13" /> 초기화</button>
      </div>
    </header>

    <main class="split">
      <section class="left">
        <app-phone-frame />
      </section>
      <section class="right">
        <app-ontology-live-view />
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow: hidden;
      }
      .topbar {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 20px;
        border-bottom: 1px solid var(--line);
        background: rgba(15, 17, 23, 0.85);
        backdrop-filter: blur(8px);
        flex: 0 0 auto;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 0;
        flex: 0 1 auto;
        overflow: hidden;
      }
      .logo {
        font-size: 26px;
        flex: 0 0 auto;
        display: inline-flex;
      }
      .title {
        font-weight: 800;
        font-size: 16px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub {
        font-size: 11px;
        color: var(--muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .char {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
      }
      .lv {
        font-weight: 800;
        color: #fcd34d;
        font-size: 15px;
      }
      .xpbar {
        width: 200px;
        height: 10px;
        background: #2a2f3d;
        border-radius: 999px;
        overflow: hidden;
      }
      .fill {
        height: 100%;
        background: linear-gradient(90deg, #f59e0b, #fcd34d);
        transition: width 0.6s ease;
      }
      .xptext {
        font-size: 11px;
        color: var(--muted);
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .actions {
        display: flex;
        gap: 8px;
        flex: 0 0 auto;
      }
      .actions button {
        border: 1px solid var(--line);
        background: #f59e0b;
        color: #2a1c02;
        font-weight: 700;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12.5px;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .actions .ghost {
        background: transparent;
        color: var(--ink);
      }
      .actions button:disabled {
        opacity: 0.5;
      }
      .split {
        flex: 1;
        display: grid;
        grid-template-columns: 420px 1fr;
        gap: 18px;
        padding: 18px 20px;
        overflow: hidden;
      }
      .left {
        display: grid;
        place-items: center;
        overflow: auto;
      }
      .right {
        overflow-y: auto;
        padding-right: 4px;
      }
      @media (max-width: 1100px) {
        :host {
          height: auto;
          overflow: visible;
        }
        .split {
          grid-template-columns: 1fr;
          overflow: visible;
        }
      }
    `,
  ],
})
export class LiveConsolePage {
  readonly store = inject(ScheduleStore);
  readonly extract = inject(ExtractService);

  seed(): void {
    void this.extract.submit(
      '내일 아침 9시에 헬스 가고, 11시에 팀 미팅, 미팅 전에 보고서 마무리해야 해. 점심 먹고 도서관에서 책 반납해줘.',
    );
  }
}
