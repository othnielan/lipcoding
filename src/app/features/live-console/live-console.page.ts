import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PhoneFrameComponent } from '../chat/phone-frame.component';
import { OntologyLiveViewComponent } from '../ontology/ontology-live-view.component';
import { ScheduleStore } from '../../state/schedule.store';
import { ExtractService } from '../../services/extract.service';
import { DemoPlayer } from '../../services/demo-player';
import { PersonaStore } from '../../state/persona.store';
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
        <button
          class="persona"
          [style.--accent]="persona.selected().accent"
          (click)="changePersona()"
          title="페르소나 변경"
        >
          <span class="p-ic" [style.background]="persona.selected().gradient">
            <app-icon [name]="persona.selected().icon" [size]="14" />
          </span>
          <span class="p-name">{{ persona.selected().name }}</span>
          <app-icon name="more" [size]="14" />
        </button>
        <button (click)="seed()" [disabled]="extract.busy() || demo.running()"><app-icon name="play" [size]="13" /> 데모 실행</button>
        @if (demo.running()) {
          <button class="stop" (click)="demo.stop()"><app-icon name="close" [size]="13" /> 중지</button>
        } @else {
          <button class="tour" (click)="demo.start()" [disabled]="extract.busy()"><app-icon name="sparkles" [size]="13" /> 데모 플레이</button>
        }
        <button class="ghost" (click)="store.reset()" [disabled]="demo.running()"><app-icon name="reset" [size]="13" /> 초기화</button>
      </div>
    </header>

    @if (demo.running()) {
      <div class="demobar">
        <span class="spin"></span>
        <span class="step">데모 진행 {{ demo.stepIndex() }}/{{ demo.total() }}</span>
        <span class="cap">{{ demo.currentLabel() }}</span>
        <div class="track"><div class="bar" [style.width.%]="demo.stepIndex() / demo.total() * 100"></div></div>
        <button class="demobar-stop" (click)="demo.stop()">중지</button>
      </div>
    }

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
        background: #f59e0b;
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
      .actions .persona {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        border: 1px solid var(--accent);
        background: rgba(255, 255, 255, 0.04);
        color: var(--ink);
        border-radius: 999px;
        padding: 5px 10px 5px 6px;
        font-size: 12.5px;
        font-weight: 700;
      }
      .actions .persona .p-ic {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        color: #fff;
        flex: 0 0 auto;
      }
      .actions .persona .p-name {
        white-space: nowrap;
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
      .actions .tour {
        background: #6366f1;
        color: #fff;
      }
      .actions .stop {
        background: #ef4444;
        color: #fff;
      }
      .actions button:disabled {
        opacity: 0.5;
      }
      .demobar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 20px;
        border-bottom: 1px solid var(--line);
        background: #11131b;
        flex: 0 0 auto;
        font-size: 12.5px;
      }
      .demobar .spin {
        width: 13px;
        height: 13px;
        border-radius: 50%;
        border: 2px solid #6366f1;
        border-top-color: transparent;
        animation: demospin 0.8s linear infinite;
        flex: 0 0 auto;
      }
      @keyframes demospin {
        to {
          transform: rotate(360deg);
        }
      }
      .demobar .step {
        font-weight: 800;
        color: #a5b4fc;
        white-space: nowrap;
      }
      .demobar .cap {
        color: var(--ink);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .demobar .track {
        flex: 1;
        height: 6px;
        background: #2a2f3d;
        border-radius: 999px;
        overflow: hidden;
        min-width: 80px;
      }
      .demobar .track .bar {
        height: 100%;
        background: #6366f1;
        border-radius: 999px;
        transition: width 0.4s ease;
      }
      .demobar .demobar-stop {
        border: 1px solid #ef4444;
        background: transparent;
        color: #fca5a5;
        border-radius: 8px;
        padding: 4px 12px;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
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
  readonly demo = inject(DemoPlayer);
  readonly persona = inject(PersonaStore);

  changePersona(): void {
    // Reopens the persona picker inside the phone simulator.
    this.persona.resetOnboarding();
  }

  seed(): void {
    void this.extract.submit(
      '내일 아침 9시에 헬스 가고, 11시에 팀 미팅, 미팅 전에 보고서 마무리해야 해. 점심 먹고 도서관에서 책 반납해줘.',
    );
  }
}
