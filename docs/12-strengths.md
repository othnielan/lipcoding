# 강점 소개 — 스케줄게이미피케이션 (Schedule Gamification)

> **한 줄 요약**: 말 한마디를 던지면 **AI가 의도를 분석 → 지식 그래프(온톨로지)로 구조화 → RPG 퀘스트로 변환**하는 전 과정을, 한 화면에서 **실시간·투명하게** 보여 주는 개인 생산성 웹앱.

이 문서는 심사 루브릭 7개 항목 기준으로 제품의 강점을 구체적 근거와 함께 정리한다.

---

## 0. 30초 엘리베이터 피치

기존 일정 앱은 폼·날짜피커·카테고리 선택으로 **입력 비용**이 높고, 끝내도 **동기 부여**가 없으며, AI가 무엇을 해석했는지 **블랙박스**다. 우리는 이 세 가지를 한 번에 깬다.

- **무자각 입력**: 자연어 한 문장 → 여러 일정 + 의존성까지 자동 등록.
- **지속 동기**: XP·레벨·퀘스트(메인/서브/사이드)로 완료를 보상.
- **추론 투명성**: 의도 → 프롬프트 → 원본 JSON → 온톨로지 그래프 → 트리플을 **오른쪽 콘솔에 실시간 노출**.

좌(폰 챗봇) / 우(라이브 온톨로지 뷰) **양분할 콘솔**로, 보이지 않던 AI 추론 파이프라인이 그대로 드러난다.

---

## 1. Copilot/LLM SDK의 효과적 활용

| 강점 | 근거 |
|---|---|
| **Structured Output** | `chat.completions` + `json_schema`로 일정/의존성/우선순위를 타입 안전하게 강제 추출(`server/extract.ts`). |
| **에이전트형 도구 호출(allow-list)** | `ENABLE_TOOLS=true` 시 최대 2라운드 `tool_calls` 루프 후 **강제 json_schema** 최종 응답. `TOOL_ALLOWLIST`에 등록된 도구만 실행 — 모델이 임의 함수를 호출해도 차단. |
| **실제 외부 API 연결** | `get_weather` 도구가 키리스 외부 API **Open-Meteo**(4s 타임아웃)로 기온/강수/날씨코드 조회. |
| **컨텍스트 관리** | `nowISO`/`tz`/페르소나 시스템 프롬프트를 매 호출에 주입해 시점·말투 일관성 유지. |
| **취소/재시도 제어** | 클라이언트 `AbortController`로 처리 중 **취소(cancel)**·**마지막 발화 재시도(retryLast)** 지원(`extract.service.ts`). |
| **투명한 호출 로깅** | SDK 콘솔에 실제 요청/응답 JSON, 모델·HTTP 상태·토큰·지연·provider·LIVE/FALLBACK 태그를 노출. |

핵심: 단순 단발 호출이 아니라 **구조화 출력 + 도구 루프 + 폴백**을 하나의 파이프라인으로 엮었다.

---

## 2. 생산성 임팩트 & 문제 적합성

- **입력 비용 제거**: "내일 9시 헬스, 11시 팀 미팅, 미팅 전에 보고서" → Task 3개 + `BEFORE` 의존성 + 우선순위까지 한 번에. 폼 클릭 0회.
- **의도 7종 분류**: `add_schedule`·`complete_quest`·`skip_quest`·`next_quest`·`query`·`cancel`·`chat`. 등록·진행·조회·취소까지 대화로 완결.
- **손실 없는 캡처**: 비일정 잡담(`chat`)은 **노트로 자동 저장** — 흘려보내지 않는다.
- **정량 지표 노출**: 통계 뷰에서 레벨/XP/완료율(`doneCount`/`totalCount`)과 카테고리·우선순위 분포를 KPI로 제시.

---

## 3. Azure AI & 클라우드 통합

| 강점 | 근거 |
|---|---|
| **Azure OpenAI(AI Foundry) 우선 연동** | `resolveTarget()`이 `AZURE_OPENAI_ENDPOINT`+`AZURE_OPENAI_API_KEY`를 최우선으로 선택, `api-key` 헤더 + `api-version`으로 배포(deployment) 호출. |
| **AI Foundry 프로젝트** | `AZURE_AI_PROJECT_ENDPOINT`로 Foundry 프로젝트(`othnielan-0056`) 참조. |
| **Azure App Service 배포** | Linux / Node 22 LTS 단일 노드 SSR. 시작 명령 `node dist/schedule-gamification/server/server.mjs`, `PORT`는 App Service 주입. |
| **다단 폴백 우선순위** | Azure OpenAI → OpenAI 호환(GitHub Models 포함) → 휴리스틱. 환경에 따라 무중단 전환. |
| **비밀 분리** | 키는 `.env`(gitignore)·App Service 앱 설정에만. 클라이언트 번들 미노출. |

---

## 4. 기능 완성도 & 기술 실행력

- **Angular 21 최신 스택**: Standalone · **Zoneless** · Signals 전용(`signal`/`computed`/`effect`/`inject`) · 신규 제어 흐름(`@if`/`@for`/`@switch`).
- **SOLID 경계**: Port/Adapter + `InjectionToken` DI. `LLM_EXTRACTOR`(Copilot ↔ Heuristic), `SPEECH`, `CLOCK` 모두 교체 가능.
- **8종 기능 런처**: 투두·체크리스트·주간·월간·통계·노트·WBS·칸반.
- **SSR + Express 단일 노드**: 서버는 stateless(`/api/extract`만), 그래프 병합·XP 계산은 클라이언트 signal store에서.
- **자동 데모 플레이어**: `DemoPlayer`가 15스텝 시나리오(등록→진행→조회→노트→WBS→칸반)를 순차 재생하며 진행 바·중지 제어 제공 — 심사자가 버튼 하나로 전 기능을 본다.

---

## 5. UX & 워크플로 설계

- **양분할 라이브 콘솔**: 좌측 폰 시뮬레이터(라이트) + 우측 온톨로지 뷰(다크)가 같은 signal을 구독해 동시 갱신.
- **페르소나 톤**: 사만다(다정)·아르카나(판타지)·무명검선(무협)·제이(비서) — 같은 일정도 말투가 다르게.
- **진행 인디케이터**: 타이핑 버블 + 전송 스피너 + SDK 스캔 바, 최소 750ms 표시로 즉답에도 가시화. 모두 `prefers-reduced-motion` 존중.
- **접근성**: `lang="ko"`, `aria-label`/`aria-expanded`/`aria-pressed`/`aria-busy`, 키보드 경로.
- **회복형 상호작용**: 처리 중 **취소** 버튼, 실패·완료 후 **마지막 발화 재시도** 버튼.

---

## 6. 책임 있는 AI · 보안 · 신뢰

| 강점 | 근거 |
|---|---|
| **프롬프트 인젝션 방어** | 시스템 프롬프트가 `<user_utterance>…</user_utterance>` 내부를 **신뢰 불가 데이터**로 명시. `detectInjection()`이 알려진 패턴을 탐지·로깅. |
| **도구 allow-list** | `TOOL_ALLOWLIST`에 없는 함수 호출은 무시 — 모델 주도 임의 실행 차단. |
| **입력 검증** | `/api/extract` 발화 누락·과길이 차단, body 16kb 제한. |
| **비밀 분리** | LLM 키는 서버 전용, `.env` 미배포. |
| **투명성** | LIVE/FALLBACK·provider·토큰·지연을 사용자에게 그대로 공개해 신뢰 형성. |

---

## 7. 혁신성 & 독창성

- **온톨로지 + 게임화 + 음성**의 조합: 일정을 단순 리스트가 아닌 **지식 그래프(트리플 스토어)**로 모델링하고, 그 위에 RPG 퀘스트 레이어를 얹었다.
- **추론 과정의 라이브 시각화**: 대부분의 AI 앱이 결과만 보여 줄 때, 우리는 의도·프롬프트·원본 JSON·그래프·트리플을 **동시에** 드러낸다.
- **무중단 데모 설계**: 키/네트워크 상태와 무관하게 항상 응답하는 휴리스틱 폴백 + 자동 데모 플레이어로, 심사 현장에서 실패가 없다.

---

## 부록 A — 핵심 파일 맵

| 관심사 | 파일 |
|---|---|
| 추출 오케스트레이션 + 폴백 + 도구 루프 | `src/server/extract.ts` |
| 클라이언트 추출 서비스(취소/재시도) | `src/app/services/extract.service.ts` |
| LLM 포트/어댑터 | `src/app/ports/llm-extractor.port.ts`, `src/app/adapters/{copilot,heuristic}-extractor.adapter.ts` |
| 자동 데모 | `src/app/services/demo-player.ts` |
| UI 상태(스플래시/기능 시트) | `src/app/state/ui.store.ts` |
| 라이브 콘솔 | `src/app/features/live-console/live-console.page.ts` |
| 온톨로지 뷰 | `src/app/features/ontology/*` |

## 부록 B — 환경변수

| 변수 | 용도 |
|---|---|
| `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_API_KEY` | Azure OpenAI 우선 타깃 |
| `AZURE_OPENAI_DEPLOYMENT` / `AZURE_OPENAI_API_VERSION` | 배포명 / API 버전 |
| `AZURE_AI_PROJECT_ENDPOINT` | AI Foundry 프로젝트 참조 |
| `ENABLE_TOOLS` | 에이전트 도구 호출 활성(기본 off, 데모 안정성 우선) |
| `COPILOT_BASE_URL` / `COPILOT_API_KEY` / `GITHUB_TOKEN` | OpenAI 호환 폴백 |
| `MOCK_LLM` | true 시 항상 휴리스틱 |
