import { Injectable, computed, inject, signal } from '@angular/core';
import { ExtractService } from './extract.service';
import { ScheduleStore } from '../state/schedule.store';
import { PersonaStore } from '../state/persona.store';
import { UiStore } from '../state/ui.store';
import { WbsStore } from '../state/wbs.store';
import { KanbanStore } from '../state/kanban.store';

interface DemoStep {
  /** Short caption shown in the progress indicator. */
  label: string;
  /** Action to perform for this step. May be async. */
  run: () => Promise<void> | void;
  /** Pause after the step so the viewer can read the result (ms). */
  hold?: number;
}

/**
 * Guided "데모 플레이": walks the whole app sequentially so a reviewer can
 * verify every feature step by step — schedule extraction, the in-phone
 * feature sheets (todo / weekly / monthly / stats / notes / WBS / kanban),
 * quest completion, queries and small-talk note capture.
 *
 * Each step either drives the {@link ExtractService} (a full utterance →
 * intent → ontology → quest pipeline) or opens a feature sheet via the
 * shared {@link UiStore}. The runner is cancellable mid-flight.
 */
@Injectable({ providedIn: 'root' })
export class DemoPlayer {
  private readonly extract = inject(ExtractService);
  private readonly schedule = inject(ScheduleStore);
  private readonly persona = inject(PersonaStore);
  private readonly ui = inject(UiStore);
  private readonly wbs = inject(WbsStore);
  private readonly kanban = inject(KanbanStore);

  private readonly _running = signal(false);
  private readonly _stepIndex = signal(0);
  private readonly _currentLabel = signal('');
  /** Bumped on every start/stop so an in-flight run can detect cancellation. */
  private token = 0;

  readonly running = this._running.asReadonly();
  readonly stepIndex = this._stepIndex.asReadonly();
  readonly currentLabel = this._currentLabel.asReadonly();

  private readonly steps: DemoStep[] = [
    {
      label: '일정 등록 · 복합 발화 분석',
      run: () =>
        this.extract.submit(
          '내일 아침 9시에 헬스 가고, 11시에 팀 미팅, 미팅 전에 보고서 마무리해야 해. 점심 먹고 도서관에서 책 반납해줘.',
        ),
    },
    {
      label: '일정 추가 · 저녁 일정',
      run: () => this.extract.submit('저녁 7시에 영어 스터디 모임 있고, 끝나고 마트에서 장도 봐야 해.'),
    },
    { label: '투두 리스트 열기', run: () => this.ui.openFeature('todo') },
    { label: '체크리스트 보기', run: () => this.ui.openFeature('check') },
    { label: '주간 캘린더 보기', run: () => this.ui.openFeature('week') },
    { label: '월간 캘린더 보기', run: () => this.ui.openFeature('month') },
    { label: '카테고리 통계 보기', run: () => this.ui.openFeature('stats') },
    {
      label: '퀘스트 완료 처리',
      run: async () => {
        this.ui.closeFeature();
        await this.extract.submit('보고서 끝냈어!');
      },
    },
    { label: '다음 퀘스트 안내', run: () => this.extract.submit('다음 퀘스트 뭐야?') },
    { label: '남은 일정 조회', run: () => this.extract.submit('오늘 뭐 남았어?') },
    { label: '잡담 → 노트 자동 저장', run: () => this.extract.submit('아 오늘따라 의욕이 막 샘솟네!') },
    { label: '노트 보기', run: () => this.ui.openFeature('note') },
    {
      label: 'WBS 예시 프로젝트',
      run: () => {
        this.wbs.seedDemo();
        this.ui.openFeature('wbs');
      },
    },
    {
      label: '칸반 보드 예시',
      run: () => {
        this.kanban.seedDemo();
        this.ui.openFeature('kanban');
      },
    },
    {
      label: '데모 완료 · 전체 둘러보기 끝',
      run: () => this.ui.closeFeature(),
    },
  ];

  readonly total = computed(() => this.steps.length);

  /** Runs the full guided sequence from the top. No-op if already running. */
  async start(): Promise<void> {
    if (this._running()) return;
    const myToken = ++this.token;
    this._running.set(true);
    this._stepIndex.set(0);
    this._currentLabel.set('화면 준비 중…');

    // Make sure the phone is past the splash/onboarding so the feature
    // sheets are visible, then start from a clean board.
    this.ui.markSplashDone();
    this.persona.select(this.persona.selectedId());
    this.ui.closeFeature();
    this.schedule.reset();
    await this.pause(600);

    for (let i = 0; i < this.steps.length; i++) {
      if (this.token !== myToken) break; // cancelled
      const step = this.steps[i];
      this._stepIndex.set(i + 1);
      this._currentLabel.set(step.label);
      try {
        await step.run();
      } catch {
        /* keep the tour going even if one step fails */
      }
      if (this.token !== myToken) break;
      await this.pause(step.hold ?? 1300);
    }

    if (this.token === myToken) {
      this._running.set(false);
      this._currentLabel.set('데모 완료');
    }
  }

  /** Cancels an in-flight run. */
  stop(): void {
    this.token++;
    this._running.set(false);
    this._currentLabel.set('');
    this._stepIndex.set(0);
    this.ui.closeFeature();
  }

  private pause(ms: number): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
