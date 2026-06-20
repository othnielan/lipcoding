# Angular + SOLID + Signals 가이드

> 본 프로젝트의 **단일 진실 공급원**.
> - 프레임워크: **Angular 최신 (≥ 20)** , Standalone Components, Zoneless 권장.
> - 상태관리: **Signal 전용** (`signal`, `computed`, `effect`, `linkedSignal`, `resource`, `httpResource`, `toSignal`).
> - 설계 원칙: **SOLID** 를 컴포넌트/서비스/도메인 전 계층에서 강제.
> - **금지**: `BehaviorSubject`/`Subject` 기반의 상태 보관, NgRx/Akita/Elf 등 외부 스토어, `*ngIf`/`*ngFor` 구식 디렉티브, NgModule.

## 0. 기본 규칙 (한눈에)
- 모든 컴포넌트: `standalone: true`, `changeDetection: OnPush`, 신규 제어 흐름(`@if`, `@for`, `@switch`).
- DI: `inject()` 함수만 사용(생성자 매개변수 DI 금지).
- 입력/출력: `input()`, `input.required()`, `output()`, `model()` (signal 기반 API만).
- 비동기: `RxJS Observable`은 **경계에서만**(HttpClient 응답). 즉시 `toSignal()` 또는 `await firstValueFrom()` 으로 변환해 도메인/컴포넌트에는 절대 흘려보내지 않는다.
- 상태 컨테이너: 서비스 클래스 안에서 `private readonly _x = signal(...)` + `readonly x = this._x.asReadonly()` 패턴.
- 모든 도메인 클래스/함수: 프레임워크 의존성 0(순수 TypeScript).

## 1. SOLID 적용 매핑

### S — 단일 책임 (Single Responsibility)
| 계층 | 책임 | 예 |
|---|---|---|
| Domain (`lib/domain/`) | 비즈니스 규칙(온톨로지, 퀘스트, XP). 순수 TS. | `OntologyGraph`, `QuestEngine`, `XpCalculator` |
| Application Service (`@Injectable`) | Use case 오케스트레이션 + signal 상태 보관 | `ScheduleStore`, `AdminLogStore` |
| Adapter (`@Injectable`) | 외부 시스템 어댑터 (LLM, 음성, 시간) | `CopilotExtractor`, `WebSpeechRecognizer`, `SystemClock` |
| Component | 렌더링과 사용자 입력 위임만 | `ChatPanelComponent`, `QuestBoardComponent` |

> 컴포넌트에는 **HttpClient 직접 호출, 비즈니스 if문 금지**. 서비스에 위임만.

### O — 개방/폐쇄 (Open/Closed)
- 새 종류의 퀘스트(예: `DailyQuest`)를 추가할 때 `QuestEngine`을 수정하지 않고 **전략 객체**를 등록하는 구조.
  ```ts
  export interface QuestStrategy {
    readonly kind: QuestKind;
    apply(graph: OntologyGraph, ctx: BuildCtx): Quest[];
  }
  ```
- `QuestEngine`은 등록된 `QuestStrategy[]` 만 순회.

### L — 리스코프 치환 (Liskov Substitution)
- 도메인이 의존하는 모든 외부는 **포트 인터페이스**로 추상화 → 어떤 구현으로 바꿔도 동작해야 함.
- 예: `Clock` 포트 → 운영용 `SystemClock`, 테스트용 `FakeClock` 모두 같은 계약.

### I — 인터페이스 분리 (Interface Segregation)
- 거대한 `IService` 금지. **역할별로 작은 포트**로 쪼갠다.
  - `LlmExtractorPort` (extract만)
  - `LlmNarratorPort` (npc 멘트 보강만, 옵션)
- 각 포트는 별도 `InjectionToken`.

### D — 의존성 역전 (Dependency Inversion)
- 도메인/애플리케이션 서비스는 **InjectionToken(추상)** 에만 의존. Concrete 클래스를 import 하지 않는다.
- 구현 등록은 `app.config.ts`의 `providers` 에서만.
  ```ts
  providers: [
    { provide: LLM_EXTRACTOR, useClass: CopilotExtractor },
    { provide: CLOCK,         useClass: SystemClock },
    { provide: SPEECH,        useClass: WebSpeechRecognizer },
  ]
  ```

## 2. 포트(Port) 카탈로그

```ts
// lib/ports/llm-extractor.port.ts
import { InjectionToken } from '@angular/core';
import type { ExtractResult } from '../domain/types';

export interface LlmExtractorPort {
  extract(input: { utterance: string; nowISO: string; tz: string }): Promise<ExtractResult>;
}
export const LLM_EXTRACTOR = new InjectionToken<LlmExtractorPort>('LLM_EXTRACTOR');
```

```ts
// lib/ports/clock.port.ts
export interface Clock { now(): Date; nowISO(): string; tz(): string; }
export const CLOCK = new InjectionToken<Clock>('CLOCK');
```

```ts
// lib/ports/speech.port.ts
export interface SpeechRecognizerPort {
  readonly supported: boolean;
  start(): void;
  stop(): void;
  /** signal: 가장 최근 인식 텍스트 (interim 포함) */
  readonly transcript: import('@angular/core').Signal<string>;
  readonly state: import('@angular/core').Signal<'idle'|'listening'|'processing'>;
}
export const SPEECH = new InjectionToken<SpeechRecognizerPort>('SPEECH');
```

```ts
// lib/ports/persistence.port.ts
export interface SnapshotStorePort<T> {
  load(): T | null;
  save(value: T): void;
  clear(): void;
}
```

## 3. Signal 기반 상태 컨테이너 패턴

```ts
// lib/state/schedule.store.ts
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CLOCK } from '../ports/clock.port';
import { OntologyGraph } from '../domain/ontology';
import { QuestEngine } from '../domain/quest-engine';
import { XpCalculator } from '../domain/xp';
import type { ChatMessage, Quest, Task } from '../domain/types';

@Injectable({ providedIn: 'root' })
export class ScheduleStore {
  private readonly clock = inject(CLOCK);

  // --- private writable signals ---
  private readonly _graph    = signal<OntologyGraph>(OntologyGraph.empty());
  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _xp       = signal(0);

  // --- public readonly views ---
  readonly graph    = this._graph.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly xp       = this._xp.asReadonly();

  // --- computed derivations (pure) ---
  readonly quests       = computed(() => QuestEngine.build(this._graph()));
  readonly activeQuest  = computed<Quest | null>(() =>
    QuestEngine.pickActive(this.quests(), this.clock.now())
  );
  readonly level        = computed(() => XpCalculator.levelFor(this._xp()));
  readonly xpToNext     = computed(() => XpCalculator.toNext(this._xp()));

  constructor() {
    // 예: 영속화. effect()는 클린업 가능한 단일 책임 부수효과 자리.
    effect(() => {
      const snapshot = this._graph().toJSON();
      localStorage.setItem('schedule:graph', JSON.stringify(snapshot));
    });
  }

  // --- commands (의도가 드러나는 동사) ---
  ingestTasks(drafts: Task[]): void {
    this._graph.update(g => g.upsertMany(drafts));
  }
  appendMessage(msg: ChatMessage): void {
    this._messages.update(list => [...list, msg]);
  }
  completeQuest(questId: string): void {
    const q = this.quests().find(x => x.id === questId);
    if (!q) return;
    this._graph.update(g => g.markTasksDone(q.taskIds));
    this._xp.update(v => v + XpCalculator.reward(q.kind));
  }
}
```

### 핵심 규칙
- `signal()`은 **`private readonly _xxx`**, 외부 노출은 **`.asReadonly()`** 또는 `computed()`.
- 파생 상태는 무조건 `computed()` — 컴포넌트에서 직접 계산 금지.
- 부수효과는 `effect()` 한 곳에 모으고, 가능하면 `onCleanup` 등록.
- **상태 변경은 `update`/`set` 만**. `mutate` 패턴(deprecated) 사용 금지.
- 컴포넌트는 `store.activeQuest()` 형태로 호출(Signal getter).

## 4. HTTP & 비동기: `httpResource` / `resource` 우선

```ts
// lib/services/extract.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LLM_EXTRACTOR, type LlmExtractorPort } from '../ports/llm-extractor.port';
import { CLOCK } from '../ports/clock.port';

@Injectable({ providedIn: 'root' })
export class ExtractService {
  // 도메인 서비스는 포트에 의존(DIP).
  private readonly llm = inject(LLM_EXTRACTOR);
  private readonly clock = inject(CLOCK);

  readonly inFlight = signal(false);

  async run(utterance: string) {
    this.inFlight.set(true);
    try {
      return await this.llm.extract({
        utterance,
        nowISO: this.clock.nowISO(),
        tz: this.clock.tz(),
      });
    } finally {
      this.inFlight.set(false);
    }
  }
}
```

`Observable`을 굳이 다뤄야 한다면 컴포넌트 표면에서:
```ts
readonly someSignal = toSignal(this.http.get<X>('/api/x'), { initialValue: null });
```

선언적 fetch가 필요하면 **`httpResource()` (Angular 19+)** 또는 **`resource()`** 를 사용한다.

## 5. 컴포넌트 작성 표준

```ts
// components/quest-card.component.ts
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { Quest } from '../lib/domain/types';

@Component({
  selector: 'app-quest-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="rpg-card" [class.active]="isActive()">
      <header>{{ quest().title }}</header>
      <p>{{ quest().narrative }}</p>
      @if (canComplete()) {
        <button type="button" (click)="complete.emit(quest().id)">완료</button>
      }
    </article>
  `,
})
export class QuestCardComponent {
  readonly quest    = input.required<Quest>();
  readonly isActive = input<boolean>(false);
  readonly complete = output<string>();
  readonly canComplete = computed(() => this.quest().status !== 'done');
}
```

규칙:
- 템플릿 안에 비즈니스 로직 금지. 표시 변환은 `computed()` 시그널로.
- 이벤트는 `output<T>()` 만. EventEmitter import 금지.
- 입력 값 변환은 `input(initial, { transform: ... })` 사용.

## 6. 디렉터리 (SOLID 친화)

```
src/app/
  domain/                        # 순수 TS, 프레임워크 의존 X
    types.ts
    ontology.ts
    quest-engine.ts
    quest-strategies/            # OCP: 전략 등록
      main-quest.strategy.ts
      sub-quest.strategy.ts
      side-quest.strategy.ts
    xp.ts
  ports/                         # InjectionToken + 인터페이스
    llm-extractor.port.ts
    llm-narrator.port.ts
    clock.port.ts
    speech.port.ts
    persistence.port.ts
  adapters/                      # 포트 구현 (DIP)
    copilot-extractor.adapter.ts
    mock-extractor.adapter.ts
    system-clock.adapter.ts
    web-speech.adapter.ts
    local-storage.adapter.ts
  state/                         # Signal 컨테이너
    schedule.store.ts
    admin-log.store.ts
  services/                      # Use case 오케스트레이션
    extract.service.ts
    quest.service.ts
  features/
    chat/                        # 사용자 화면(/)
      chat.page.ts
      chat-panel.component.ts
      voice-input.component.ts
      active-quest-hero.component.ts
      character-card.component.ts
      quest-board.component.ts
      quest-card.component.ts
    admin/                       # 관리자 화면(/admin)
      admin.page.ts
      utterance-timeline.component.ts
      intent-analyzer.component.ts
      ontology-graph-view.component.ts
      triple-store-table.component.ts
      quest-build-trace.component.ts
      validation-panel.component.ts
  app.config.ts                  # DI 등록(추상 → 구현)
  app.routes.ts                  # 라우트
  app.ts                         # 루트 컴포넌트
server.ts                        # SSR + /api/* (Express)
```

## 7. DI 등록 예 (`app.config.ts`)

```ts
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { routes } from './app.routes';

import { LLM_EXTRACTOR } from './ports/llm-extractor.port';
import { CLOCK } from './ports/clock.port';
import { SPEECH } from './ports/speech.port';
import { CopilotExtractor } from './adapters/copilot-extractor.adapter';
import { SystemClock }     from './adapters/system-clock.adapter';
import { WebSpeechRecognizer } from './adapters/web-speech.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    provideClientHydration(withEventReplay()),

    { provide: LLM_EXTRACTOR, useClass: CopilotExtractor },
    { provide: CLOCK,         useClass: SystemClock },
    { provide: SPEECH,        useClass: WebSpeechRecognizer },
  ],
};
```

데모 폴백:
```ts
{ provide: LLM_EXTRACTOR, useFactory: () =>
    environment.mockLlm ? new MockExtractor() : new CopilotExtractor() }
```

## 8. 테스트 (SOLID 효과)

- 도메인은 **프레임워크 없이** vitest로 직접 단위 테스트.
- 서비스는 `TestBed` + 포트 mock 주입으로 격리 테스트.
  ```ts
  TestBed.configureTestingModule({
    providers: [
      ScheduleStore,
      { provide: CLOCK, useValue: new FakeClock('2026-06-21T08:59:00+09:00') },
      { provide: LLM_EXTRACTOR, useClass: MockExtractor },
    ],
  });
  ```

## 9. 안티패턴(절대 금지)

| ❌ 금지 | ✅ 대체 |
|---|---|
| `new BehaviorSubject<X>(...)` 로 상태 보관 | `signal<X>(...)` |
| 컴포넌트가 `HttpClient` 직접 호출 | 서비스(`@Injectable`)에 위임 |
| 컴포넌트가 도메인 구현 클래스 import | 서비스를 통해 행위만 호출 |
| `*ngIf`, `*ngFor`, `*ngSwitch` | `@if`, `@for`, `@switch` |
| `NgModule` 도입 | Standalone + `app.config.ts` |
| `EventEmitter` 직접 사용 | `output<T>()` |
| 거대한 `God Service` | 포트 단위로 쪼갠 어댑터 + 작은 use case 서비스 |
| Signal에 `.mutate()` | `.update()` / `.set()` |
| `effect()` 안에서 signal 쓰기(루프 위험) | `update()` 사용 + `allowSignalWrites` 명시 / 가급적 회피 |
