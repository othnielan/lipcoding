# PRD — 스케줄게이미피케이션 (Schedule Gamification)

> **한 줄 정의**
> 사용자가 **말(발화)** 로 일정을 던지면, AI가 **의도를 분석 → 온톨로지(지식 그래프)로 구조화 → RPG 퀘스트로 변환**하고, 이 모든 과정을 **한 화면에서 실시간으로** 보여 주는 개인 생산성 웹앱.

- **프로젝트명**: `schedule-gamification`
- **대회 주제**: 천하제일 입코딩 대회 — 개인 생산성 웹앱
- **차별 포인트**: "음성 → 의도분류 → 온톨로지 → 게임화"의 전 과정을 좌(폰 챗봇) / 우(라이브 온톨로지 뷰) **양분할 콘솔**로 동시에 시각화한다. 보이지 않던 AI 추론 파이프라인이 그대로 드러난다.
- **AI 백엔드**: **Azure OpenAI (Azure AI Foundry)** chat.completions(Structured Output) + 에이전트형 **도구 호출(allow-list)** + 외부 API(Open-Meteo). 키/장애 시 휴리스틱 파서로 무중단 폴백.
- **현재 상태**: 동작하는 구현 완료(SSR + Express 단일 노드). Azure App Service에 배포.

---

## 1. 문제 정의 & 목표

### 1.1 문제
- 기존 일정 앱은 **입력 비용**이 높다(폼, 날짜 피커, 카테고리 선택…).
- 일정은 "해야 할 일"의 나열일 뿐, **동기 부여**가 없다.
- AI가 무엇을 어떻게 해석했는지 **블랙박스**라 신뢰가 떨어진다.

### 1.2 목표
| # | 목표 | 측정 가능한 성공 기준 |
|---|---|---|
| G1 | 무자각 입력 | 자연어 한 문장으로 여러 일정 + 의존성까지 등록 |
| G2 | 추론 투명성 | 의도/프롬프트/원본 JSON/그래프/트리플을 실시간 노출 |
| G3 | 지속 동기 | XP·레벨·퀘스트(메인/서브/사이드)로 완료를 보상 |
| G4 | 몰입형 톤 | 페르소나(사만다/판타지/무협/비서)별 말투로 응대 |
| G5 | 무중단 데모 | LLM 실패 시 휴리스틱 파서로 자동 폴백, 항상 응답 |

### 1.3 비목표 (Out of Scope)
- 멀티유저 인증/서버 DB(영속 저장은 브라우저 LocalStorage).
- 캘린더 외부 연동(Google/Outlook).
- 모바일 네이티브 앱(웹 반응형으로 폰을 **시뮬레이션**).

> 참고: 초기엔 비목표였던 **Azure OpenAI(AI Foundry) 직접 연동**과 **외부 API 도구 호출**은 이번 라운드에서 범위에 포함되어 구현되었다(§7, §9).

---

## 2. 핵심 사용자 시나리오

> 사용자가 말한다 → 챗봇이 답한다 → **동시에 오른쪽 온톨로지 뷰가 자동 갱신된다.**

### 시나리오 1 — 등록
🎤 *"내일 9시에 헬스 가고, 11시에 팀 미팅. 미팅 전에 보고서 마무리해야 해."*
- Task 3개(헬스 / 보고서 / 팀 미팅) 자동 추출
- 의존성: 보고서 → 팀 미팅 (`BEFORE`)
- 우선순위: 팀 미팅=메인, 보고서=서브, 헬스=사이드
- 우측 그래프에 노드/엣지가 페이드인, 트리플 스토어가 즉시 갱신

### 시나리오 2 — 진행
🎤 *"보고서 끝!"* → 활성 퀘스트 `done`, +XP, 페르소나 말투로 클리어 멘트, 해당 노드 회색 처리.

### 시나리오 3 — 조회
🎤 *"오늘 뭐 남았어?"* → 남은 퀘스트 요약 응답.

---

## 3. 화면 설계 — 양분할 라이브 콘솔

```
┌───────────────────────────────────────────────────────────────┐
│  🛠 스케줄게이미피케이션   Lv.7 ███░ 740/1000 XP   [Live] [데모] │
├───────────────────────────────┬───────────────────────────────┤
│   📱 PhoneFrame (라이트)       │   온톨로지 라이브 뷰 (다크)    │
│   ┌─────────────────────┐     │   ① Ontology Graph (최상단)    │
│   │ 상태바 / 페르소나     │     │   ② Intent / Prompt 카드       │
│   │ 챗 거품 (NPC/You)    │     │   ③ SDK 요청·응답 콘솔         │
│   │ Active Quest 카드    │     │   ④ Triple Store 테이블        │
│   │ 기능 칩 + 입력 + 🎤  │     │                               │
│   └─────────────────────┘     │                               │
└───────────────────────────────┴───────────────────────────────┘
```

### 3.1 좌측 — 폰 시뮬레이터 (`phone-frame.component.ts`)
- iPhone 비율(372×760) + 다이내믹 아일랜드/상태바/홈바 CSS 흉내.
- **앱바**: 뒤로가기 버튼(← 홈/페르소나 선택으로), 현재 페르소나 로고+이름, 알림 벨, 더보기(⋯) 메뉴.
- **더보기 메뉴**: 페르소나 변경 · 친구 일정 구독 · 앱 정보 · 대화 초기화.
- **챗 영역**(`chat-panel`): NPC/User/System/Extract 4종 말풍선. 일정 추출 시 **Extract 카드**(소스/지연/의도/태스크)를 먼저 보여 준 뒤 NPC가 페르소나 말투로 내레이션.
- **Active Quest 카드**(`active-quest-hero`): 지금 해야 할 퀘스트 1개를 강조 + 완료 버튼.
- **입력부**(`voice-input`): 텍스트 입력 + Push-to-Talk 마이크(Web Speech API). 처리 중에는 전송 버튼이 스피너로 전환.

### 3.2 우측 — 온톨로지 라이브 뷰 (`ontology-live-view.component.ts`)
모두 같은 `ScheduleStore` signal을 구독해 자동 갱신. (위→아래 순서)
| 영역 | 컴포넌트 | 표시 |
|---|---|---|
| ① 그래프(최상단) | `ontology-graph-canvas` | Task/Location/Category 노드 + `BEFORE`/`AT_LOCATION` 엣지, 신규 노드 페이드인 |
| ② 의도/프롬프트 | `intent-prompt-view` | 최근 발화 intent, LLM 전송 프롬프트(접고 펴기) |
| ③ SDK 콘솔 | `sdk-console` | **실제** 요청/응답 JSON, 모델·HTTP 상태·토큰·지연, LIVE/FALLBACK 태그 |
| ④ 트리플 스토어 | `triple-store-table` | `(subject, predicate, object)` 표 |

### 3.3 진행 인디케이터 (서버 통신 UX)
모든 발화/SDK 호출 동안 `ExtractService.busy()` 기준으로:
- 챗에 **타이핑 버블**(페르소나 아바타 바운스 + 점 3개 깜빡임)
- 전송 버튼 **스피너**
- SDK 콘솔 **스캔 진행 바**
- 최소 표시 시간(750ms)으로 즉답 시에도 인디케이터가 보이도록 보정.
- 모든 애니메이션은 `prefers-reduced-motion` 존중.

---

## 4. 페르소나 & 온보딩

### 4.1 페르소나 (`domain/persona.ts`)
선택한 캐릭터의 **말투·시스템 프롬프트·인사말**이 챗봇 응답 톤을 결정한다.
| ID | 이름 | 콘셉트 | 말투 예 |
|---|---|---|---|
| `samantha` | 사만다 | 영화 〈Her〉의 다정한 AI 동반자 | "응, 방금 1개 일정 내가 다 정리해뒀어." (반말·따뜻) |
| `fantasy` | 아르카나 | 판타지 길드 마스터 | "용사여, 일정은 곧 그대의 퀘스트라네." |
| `martial` | 무명검선 | 무협 사부 | "제자여, 하루의 수련을 게을리 말라." |
| `secretary` | 제이 | 전담 비서 | "일정을 추가하겠습니다." (존댓말·간결) |

### 4.2 온보딩 흐름 (폰 시뮬레이터 내부)
- **스플래시 → 페르소나 선택 → 채팅** 순서가 **폰 화면 안에서만** 진행(전체 화면 전환 아님, 라우팅 없음).
- 스플래시는 2.4초 후 자동 진행, **새로고침 때마다 항상 스플래시부터** 시작(세션 한정 `splashDone` 신호, 영속 저장 안 함).
- 한 번 페르소나를 고르면 재진입 시 스플래시를 건너뛰고 선택 화면으로.
- 선택값은 LocalStorage에 영속.

---

## 5. 기능 런처 (바텀시트)

Active Quest 아래 칩(3열 그리드)을 누르면 폰 안에서 **바텀시트**가 올라온다. 헤더는 **현재 기능만** 아이콘+제목으로 간결하게 표시(탭 나열 제거).

| 기능 | 컴포넌트 | 설명 |
|---|---|---|
| 투두 | (inline) | 미완료 일정 목록, 체크로 완료 토글 |
| 체크리스트 | (inline) | 전체 일정 + 진행률 바 |
| 주간 | (inline) | 요일별 일정 보드 + 시간 미지정 칩 |
| 월간 | (inline) | 달력 그리드 + 날짜 선택 상세 |
| 통계 | (inline) | 레벨/XP/완료율 KPI, 카테고리·우선순위 분포 |
| 노트 | `notes-view` | 비일정 발화 자동 저장 + 수동 메모 |
| WBS | `wbs-view` | 작업 분해 구조(계층 트리) |
| 칸반 | `kanban-view` | 할 일/진행 중/완료 3열 + 좌우 이동 |

---

## 6. 게이미피케이션 규칙

- **퀘스트 종류 → XP**: 사이드 10 / 서브 30 / 메인 100 (`XP_BY_KIND`).
- **우선순위 매핑**: 회의·미팅·시험·마감·약속·면접 등은 `main`, 그 외 `side`(휴리스틱). 메인 퀘스트가 곧 "지금 할 일".
- **레벨**: 누적 XP 기반(레벨 = 구간 함수). 레벨업 시 토스트 + 시스템 메시지.
- **완료/스킵/취소**: 발화(`끝!`, `건너뛰기`, `취소`) 또는 버튼으로 트리거. 다음 활성 퀘스트로 자동 승계.

---

## 7. AI 추출 파이프라인

### 7.1 흐름
```
발화(텍스트/음성)
  → ExtractService.submit()           (services/extract.service.ts)
      └ AbortController로 취소/재시도(cancel/retryLast) 지원
  → POST /api/extract                 (server.ts, 서버에서만 키 사용)
  → resolveTarget(): Azure OpenAI(AI Foundry) 우선 → OpenAI 호환 → (없으면 휴리스틱)
  → chat.completions (Structured Output, json_schema)
      └ ENABLE_TOOLS=true 시: 에이전트형 도구 루프(allow-list) → get_weather(Open-Meteo)
       └ 실패/키 없음/취소 외 오류 → 휴리스틱 파서(parseUtterance)로 폴백
  → ExtractResult { intent, tasks, npcReply }
  → ScheduleStore: 그래프/트리플/퀘스트 갱신 + 페르소나 내레이션
  → AdminLogStore: SDK 요청/응답 기록(콘솔 패널)
```

### 7.2 의도(Intent) 7종 (`domain/types.ts`)
`add_schedule` · `complete_quest` · `skip_quest` · `next_quest` · `query` · `cancel` · `chat`
- `chat`(비일정 잡담)은 손실 없이 **노트로 자동 저장**.

### 7.3 폴백 전략 (무중단 보장)
- 서버에 키가 없거나 호출 실패 → 동일 인터페이스의 **휴리스틱 한국어 파서**가 응답.
- SDK 콘솔에 `LIVE`/`FALLBACK` 태그로 어느 경로였는지 투명하게 표기.
- 키는 **서버에서만** 읽으며 클라이언트 번들에 절대 노출하지 않는다.
- `resolveTarget()` 우선순위: ① Azure OpenAI(`AZURE_OPENAI_ENDPOINT`+`AZURE_OPENAI_API_KEY`, `api-key` 헤더) → ② OpenAI 호환(`COPILOT_API_KEY`/`OPENAI_API_KEY`/`GITHUB_TOKEN`, Bearer) → ③ 없으면 휴리스틱. `provider` 라벨이 SDK 콘솔에 표기된다.

### 7.4 에이전트형 도구 호출 (allow-list)
- `ENABLE_TOOLS=true`일 때만 활성. 최대 2라운드 `tool_calls` 루프 후 **강제 json_schema** 최종 응답.
- **허용 목록(TOOL_ALLOWLIST)** 에 등재된 도구만 실행 — 모델이 임의 함수명을 호출해도 차단.
- `get_weather` → 키 불필요 외부 API **Open-Meteo**(4s 타임아웃)로 기온/강수/날씨코드 조회.

### 7.5 프롬프트 인젝션 방어
- 시스템 프롬프트가 `<user_utterance>…</user_utterance>` 안의 내용을 **신뢰 불가 데이터**로 취급하도록 명시.
- `detectInjection(text)`이 알려진 인젝션 패턴("무시해", "system prompt" 등)을 탐지·로깅.
- 사용자 발화는 항상 태그로 감싸 전송하여 지시/데이터 경계를 분리.

---

## 8. API 명세

### `POST /api/extract`
**Request**
```json
{ "utterance": "내일 9시 헬스", "nowISO": "2026-06-20T14:32:11+09:00", "tz": "Asia/Seoul" }
```
**Response 200**
```json
{
  "intent": "add_schedule",
  "tasks": [
    { "title": "헬스", "start": "2026-06-21T09:00:00+09:00", "end": null,
      "location": null, "priority": "side", "category": "health", "dependsOnTitles": [] }
  ],
  "npcReply": "용사여, 내일의 임무를 새겼다네.",
  "_sdk": { "source": "copilot", "model": "...", "status": 200, "elapsedMs": 1234, "request": {}, "response": {} }
}
```
**오류**: `400`(발화 누락/과길이) · `500`(추출 실패). 응답 헤더 `X-Extract-Source: copilot|heuristic`.

> 그래프 병합·퀘스트 산정·XP 계산은 **클라이언트 signal store**에서 수행(서버 stateless 유지).

---

## 9. 아키텍처 & 기술 스택

### 9.1 스택
| 영역 | 선택 |
|---|---|
| 프레임워크 | **Angular 21** Standalone · **Zoneless** · 신규 제어 흐름(`@if`/`@for`/`@switch`) |
| 상태관리 | **Angular Signals 전용**(`signal`/`computed`/`effect`/`inject`) |
| 설계 원칙 | **SOLID** — Port/Adapter + `InjectionToken` DI |
| 서버 | Angular SSR(`@angular/ssr`) + **Express**(`server.ts`)의 `/api/*` |
| LLM | **Azure OpenAI(AI Foundry)** chat.completions(Structured Output) + 에이전트 도구 호출 + 휴리스틱 폴백 |
| 외부 API | **Open-Meteo**(키리스 날씨) — allow-list 도구로 호출 |
| 음성 | Web Speech API → `SpeechRecognizerPort` 어댑터 |
| 저장 | LocalStorage 어댑터(서버 DB 없음) |
| 배포 | Azure App Service(Linux, Node 22) 단일 노드 |

### 9.2 포트 & 어댑터 (교체 가능 경계)
| 포트 | 어댑터 |
|---|---|
| `LLM_EXTRACTOR` | `CopilotExtractor`(/api/extract) ↔ `HeuristicExtractor`(오프라인) |
| `SPEECH` | `WebSpeechRecognizer` |
| `CLOCK` | `SystemClock` |

### 9.3 상태 스토어 (모두 `providedIn: root`, Signals + LocalStorage 영속)
`ScheduleStore`(일정/그래프/XP/메시지) · `NotesStore` · `WbsStore` · `KanbanStore` · `SubscriptionStore`(친구 구독/알림) · `PersonaStore`(선택 페르소나/온보딩) · `AdminLogStore`(SDK 로그).
- SSR 가드: `typeof localStorage !== 'undefined'`, `typeof window !== 'undefined'`.

### 9.4 폴더 구조 (요약)
```
src/app/
  domain/      # 순수 TS: types, nlu, xp, ontology, persona, wbs, kanban ...
  ports/       # InjectionToken 경계 (clock/speech/llm-extractor)
  adapters/    # 포트 구현 (copilot/heuristic/web-speech/system-clock)
  services/    # extract.service.ts (오케스트레이션)
  state/       # signal store + LocalStorage 영속
  features/    # chat / ontology / notes / wbs / social / onboarding / live-console
  shared/      # icon.component.ts (플랫 단색 SVG)
server.ts      # Express + SSR, POST /api/extract
server/extract.ts # 추출 오케스트레이션 + 휴리스틱 폴백
```

---

## 10. 소셜 (친구 일정 구독)
- 친구의 공개 일정을 **구독**하면 알림 피드로 수신, 앱바 벨에 미읽음 배지.
- `SubscriptionStore`가 알림 상태/미읽음 수를 관리.

---

## 11. 비기능 요구사항
- **성능**: 초기 번들 ≈ 116 kB(gzip), SSR 프리렌더, OnPush + Zoneless로 최소 변경 감지.
- **접근성**: `lang="ko"`, 의미 있는 `aria-label`/`aria-expanded`/`aria-pressed`/`aria-busy`, 키보드 입력 경로, `prefers-reduced-motion`.
- **보안**: LLM 키 서버 전용, `/api/extract` 입력 검증(과길이·16kb body 제한), 프롬프트 인젝션 방어(`detectInjection`+태깅), 도구 allow-list, 비밀값(.env) 미배포.
- **복원력**: LLM 장애/취소 시 휴리스틱 폴백으로 항상 응답. 사용자가 처리 중 **취소/재시도** 가능.
- **반응형**: ≥1100px 양분할, 미만 시 상하 스택.
- **데모 자동화**: `DemoPlayer`가 15스텝 시나리오를 순차 재생(진행 바·중지 지원)하여 전 기능을 무중단 시연.

---

## 12. 빌드 · 실행 · 배포

### 12.1 로컬
```bash
npm install
npm start            # ng serve (SSR), http://localhost:4200
npm run build        # 프로덕션 번들 → dist/schedule-gamification
npm run serve:ssr:schedule-gamification   # 프로덕션 SSR 서버 실행
```
환경변수: `COPILOT_API_KEY`(서버 전용, 없으면 휴리스틱 폴백). `.env`는 git 미포함.

### 12.2 Azure App Service 배포
- 런타임: **Linux / Node 22 LTS**, 서버 빌드(Oryx)로 `npm install` + `npm run build` 수행.
- **시작 명령(중요)**: 개발용 `npm start`가 아닌 SSR 서버를 직접 실행한다.
  ```
  node dist/schedule-gamification/server/server.mjs
  ```
- 서버는 `process.env.PORT`를 사용(App Service가 주입).
- (선택) 앱 설정에 `COPILOT_API_KEY` 추가 시 LIVE 경로 활성화.

---

## 13. 평가 관점 매핑 (체크리스트)

| 평가 항목 | 충족 근거 |
|---|---|
| 동작하는 결과물 | SSR 단일 노드로 즉시 구동, Azure App Service 배포 |
| 아이디어/차별성 | 음성→온톨로지→게임화 전 과정의 **라이브 시각화** |
| AI 활용 | **Azure OpenAI** Structured Output + 의도분류 7종 + **에이전트 도구 호출(allow-list)**, 실패 시 폴백 |
| Azure/클라우드 | Azure App Service 배포 + **Azure OpenAI(AI Foundry)** 추론 연동 |
| 기술 완성도 | Angular 21 Zoneless/Signals, SOLID Port/Adapter, signal store |
| UX/완성도 | 페르소나 톤, 진행 인디케이터+취소/재시도, 온보딩, 8종 기능 런처, 소셜, 자동 데모 플레이 |
| 투명성/신뢰 | SDK 콘솔에 실제 요청/응답·토큰·지연·provider·LIVE/FALLBACK 노출 |
| 책임 있는 AI/보안 | 프롬프트 인젝션 방어, 도구 allow-list, 서버 전용 키, 입력 검증 |
| 안정성 | 무키/장애/취소 시 휴리스틱 폴백으로 무중단 데모 |
