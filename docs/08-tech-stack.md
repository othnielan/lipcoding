# 기술 스택 & 폴더 구조

> **상세 코딩 원칙**: [11-angular-solid-guide.md](11-angular-solid-guide.md) 참조 (SOLID + Signals 패턴).

## 1. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | **Angular 최신 (≥ 20)** Standalone + Zoneless | 대회 요구사항. 시그널과의 결합도 ↑ |
| 언어 | TypeScript (strict, `noImplicitOverride`, `noUncheckedIndexedAccess`) | 타입 안전 |
| 상태관리 | **Angular Signals 전용** (`signal`/`computed`/`effect`/`linkedSignal`/`resource`) | 대회 요구사항. RxJS 상태 보관 금지 |
| 라우팅 | `@angular/router` (Standalone API + `withComponentInputBinding`) | 표준 |
| 스타일 | Tailwind CSS v4 + CSS Variables | 빠른 RPG 톤 카드 UI |
| 검증 | zod + zod-to-json-schema | 단일 스키마 → LLM/서버/클라이언트 공유 |
| LLM | **Copilot SDK** (서버에서만 호출) | 대회 규정 |
| 음성 | Web Speech API (`webkitSpeechRecognition`) — `SpeechRecognizerPort` 어댑터로 격리 | 외부 의존성 X |
| 서버 | Angular SSR (`@angular/ssr`) + Express on `server.ts` 에 `/api/*` 라우트 | 단일 배포 단위 |
| ID 생성 | `nanoid` (포트로 추상화) | 충돌 안전 |
| 테스트 | vitest (도메인/순수 TS), Angular `TestBed` (서비스 격리) | SOLID로 격리 테스트 용이 |
| 아이콘 | lucide(angular wrapper) 또는 SVG inline | 가벼움 |

> 데이터베이스는 **사용하지 않는다**. graph는 localStorage(어댑터 경유)에만 영속화.

### 핵심 결정 한 줄 요약
- **컴포넌트는 표시만, 상태는 Signal Store, 외부는 모두 Port→Adapter 로 격리.**

## 2. 폴더 구조

```
schedule-gamification/
├─ src/
│  ├─ main.ts
│  ├─ index.html
│  ├─ styles.css
│  ├─ environments/
│  │  ├─ environment.ts
│  │  └─ environment.development.ts
│  └─ app/
│     ├─ app.ts                            # 루트 standalone 컴포넌트
│     ├─ app.config.ts                     # DI 등록 (포트 → 구현)
│     ├─ app.config.server.ts              # SSR DI
│     ├─ app.routes.ts                     # 라우트 정의
│     │
│     ├─ domain/                           # 순수 TS (프레임워크 의존 0)
│     │  ├─ types.ts
│     │  ├─ ontology.ts                    # OntologyGraph
│     │  ├─ quest-engine.ts                # QuestEngine (정적 메서드)
│     │  ├─ quest-strategies/              # OCP 전략들
│     │  │  ├─ main-quest.strategy.ts
│     │  │  ├─ sub-quest.strategy.ts
│     │  │  └─ side-quest.strategy.ts
│     │  ├─ xp.ts                          # XpCalculator
│     │  └─ __tests__/
│     │
│     ├─ ports/                            # InjectionToken + 인터페이스만
│     │  ├─ llm-extractor.port.ts
│     │  ├─ llm-narrator.port.ts
│     │  ├─ clock.port.ts
│     │  ├─ speech.port.ts
│     │  └─ persistence.port.ts
│     │
│     ├─ adapters/                         # 포트 구현 (외부 시스템 격리)
│     │  ├─ copilot-extractor.adapter.ts   # HttpClient → /api/extract
│     │  ├─ mock-extractor.adapter.ts      # MOCK_LLM 폴백
│     │  ├─ system-clock.adapter.ts
│     │  ├─ web-speech.adapter.ts
│     │  └─ local-storage.adapter.ts
│     │
│     ├─ state/                            # Signal 컨테이너 (@Injectable)
│     │  ├─ schedule.store.ts
│     │  └─ admin-log.store.ts
│     │
│     ├─ services/                         # Use case 오케스트레이션
│     │  ├─ extract.service.ts
│     │  └─ quest.service.ts
│     │
│     └─ features/
│        ├─ chat/                          # 사용자 화면 (/)
│        │  ├─ chat.page.ts
│        │  ├─ chat-panel.component.ts
│        │  ├─ chat-bubble.component.ts
│        │  ├─ voice-input.component.ts
│        │  ├─ active-quest-hero.component.ts
│        │  ├─ character-card.component.ts
│        │  ├─ quest-board.component.ts
│        │  └─ quest-card.component.ts
│        └─ admin/                         # 관리자 화면 (/admin)
│           ├─ admin.page.ts
│           ├─ admin-guard.ts              # ADMIN_ENABLED 가드
│           ├─ admin-toolbar.component.ts
│           ├─ utterance-timeline.component.ts
│           ├─ intent-analyzer.component.ts
│           ├─ ontology-graph-view.component.ts
│           ├─ triple-store-table.component.ts
│           ├─ quest-build-trace.component.ts
│           └─ validation-panel.component.ts
│
├─ server.ts                               # SSR 엔진 + Express /api/*
├─ server/                                 # 서버 전용 코드(시크릿 사용 OK)
│  ├─ api/
│  │  ├─ extract.handler.ts
│  │  └─ health.handler.ts
│  └─ copilot/
│     ├─ copilot.client.ts                 # SDK 싱글톤
│     ├─ extract.prompt.ts
│     └─ extract.schema.ts                 # zod + zod-to-json-schema
│
├─ public/
│  ├─ npc-avatar.svg
│  └─ sfx/
│     ├─ ding.mp3
│     └─ levelup.mp3
│
├─ docs/                                   # 본 문서
├─ .env.example
├─ angular.json
├─ tsconfig.json
├─ tsconfig.app.json
├─ tsconfig.server.json
└─ package.json
```

## 3. 환경 변수 (`.env.example`)

```
# Copilot SDK (서버에서만 사용)
COPILOT_API_KEY=
COPILOT_MODEL=gpt-4o-mini

# 데모/개발 옵션
MOCK_LLM=false

# 관리자 페이지 노출 여부 (false 또는 미설정 시 /admin 은 404)
ADMIN_ENABLED=true
```

> Angular 클라이언트 빌드 번들에 시크릿이 들어가지 않도록, 위 변수는 **`server.ts`/`server/` 영역에서만** `process.env` 로 접근한다. `environment.ts` 에는 `mockLlm`, `adminEnabled` 같은 안전한 플래그만 노출.

## 4. 패키지 의존성 (예상)

```jsonc
{
  "dependencies": {
    "@angular/animations": "^20.0.0",
    "@angular/common": "^20.0.0",
    "@angular/compiler": "^20.0.0",
    "@angular/core": "^20.0.0",
    "@angular/forms": "^20.0.0",
    "@angular/platform-browser": "^20.0.0",
    "@angular/platform-server": "^20.0.0",
    "@angular/router": "^20.0.0",
    "@angular/ssr": "^20.0.0",
    "@github/copilot-sdk": "^x.y",       // 실제 패키지명/버전은 SDK 문서 기준
    "express": "^4",
    "zod": "^3",
    "zod-to-json-schema": "^3",
    "nanoid": "^5",
    "rxjs": "^7",                         // 경계에서만 사용
    "tslib": "^2",
    "zone.js": "^0.15"                    // zoneless 활성화 시 dev 안전망 용도
  },
  "devDependencies": {
    "@angular/build": "^20.0.0",
    "@angular/cli": "^20.0.0",
    "@angular/compiler-cli": "^20.0.0",
    "@types/express": "^4",
    "@types/node": "^20",
    "typescript": "~5.5",
    "vitest": "^1",
    "tailwindcss": "^4",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

## 5. 스크립트

```jsonc
{
  "scripts": {
    "ng":       "ng",
    "start":    "ng serve",
    "build":    "ng build",
    "watch":    "ng build --watch --configuration development",
    "serve:ssr":"node dist/schedule-gamification/server/server.mjs",
    "lint":     "ng lint",
    "test":     "vitest run"
  }
}
```

## 6. 서버 측 API (Angular SSR + Express)

`server.ts` 한 파일에서 SSR 렌더링과 `/api/*` JSON 핸들러를 함께 등록한다.

```ts
// server.ts (요약)
import express from 'express';
import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse }
  from '@angular/ssr/node';
import { extractHandler } from './server/api/extract.handler';

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json({ limit: '32kb' }));

// JSON API (시크릿 사용 가능 — 서버 전용)
app.post('/api/extract', extractHandler);

// 그 외는 Angular SSR
app.use('/**', (req, res, next) => {
  angularApp.handle(req).then(r => r ? writeResponseToNodeResponse(r, res) : next()).catch(next);
});

if (isMainModule(import.meta.url)) {
  const port = Number(process.env['PORT'] ?? 4000);
  app.listen(port, () => console.log(`listening on :${port}`));
}
export const reqHandler = createNodeRequestHandler(app);
```

## 7. 코드 컨벤션 (요약, 상세는 [11-angular-solid-guide.md](11-angular-solid-guide.md))

- **모듈 경계**: `features/` 는 `adapters/`/`server/` 를 직접 import 하지 않는다. `ports/` 와 `state/`, `services/` 만 의존.
- **상태**: `signal()` 은 항상 `private readonly _x`, 외부에는 `.asReadonly()` 또는 `computed()`로만 노출.
- **부수효과**: `effect()` 1개에 1책임. 가능한 한 사용 자제.
- **HTTP**: 컴포넌트가 직접 `HttpClient` 호출 금지 → 어댑터/서비스로.
- **순수 함수 우선**: `domain/` 의 모든 함수는 입력→출력 순수 함수. 시간은 인자로 받는다(`now: Date`).
- **id 생성**: `domain/id.ts` 의 `newId(prefix)` 만 사용. 직접 `nanoid()` 호출 금지.
- **시간**: 항상 ISO8601 문자열로 저장/전송, 표시 시점에만 `Intl.DateTimeFormat` 으로 포맷.
- **에러 응답**: `{ error: string; message: string }` 형태로 통일.
- **금지**: `NgModule`, `*ngIf`/`*ngFor`, `BehaviorSubject` 기반 상태, `EventEmitter`, NgRx 등 외부 스토어.

## 8. 입코딩 친화 팁

- 파일/심볼 이름을 **발음하기 쉬운 단어**로 (예: `OntologyGraph`, `QuestEngine`, `ScheduleStore`).
- 한국어 식별자 사용 금지(STT/IDE 호환 문제).
- 함수 길이 ≤ 30줄 유지 → 말로 수정 지시할 때 모호성 감소.
- Standalone + `inject()` 만 쓰므로 "constructor에 뭐 넣어" 같은 발화가 필요 없다 → 더 빠름.
