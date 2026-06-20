# 스케줄게이미피케이션 (ScheduleGamification)

> "오늘 할 일을 말로 던지면, 게임 퀘스트처럼 순서대로 풀어주는 비서"
>
> **프로젝트명**: 스케줄게이미피케이션 · **코드명**: `schedule-gamification`

## 1. 한 줄 소개
사용자가 자연어/음성으로 입력한 일정·할 일을 **온톨로지(Ontology)** 로 구조화하여,
RPG 게임의 **메인 퀘스트 / 서브 퀘스트** 형태로 순차 안내하는 개인 생산성 웹앱.

앱은 두 화면으로 구성된다:
- **사용자 화면 `/`** — 챗봇 기본 형태. 발화로 일정을 등록하고 퀘스트를 수행한다.
- **관리자 화면 `/admin`** — 같은 발화가 **인텐트 분석 → 온톨로지 트리플 → 퀘스트**로 변환되는 과정을 자동으로 시각화하는 관제 콘솔. (대회 데모 임팩트의 핵심)

## 2. 컨셉 키워드
- **음성 우선(Voice-first)**: "천하제일 입코딩 대회" 컨셉과 동일하게, 사용자도 말로 일정을 등록한다.
- **온톨로지 기반 추론**: 단순 To-do 리스트가 아니라, 일·시간·장소·선후관계·자원의 의미적 관계를 표현.
- **게이미피케이션**: 퀘스트, 경험치(XP), 레벨, 보상, 메인/사이드 퀘스트 분기.
- **Copilot SDK 활용**: LLM이 자연어 발화 → 온톨로지 트리플로 추출하는 핵심 추론 엔진.

## 3. 타깃 사용자 시나리오
> "내일 9시에 헬스 가고, 11시에 팀 미팅. 미팅 전에 보고서 초안 마무리해야 해.
> 그리고 점심 먹고 도서관 가서 책 반납해줘."

위 한 마디 발화에서 QuestLog는 아래를 자동 추출/생성한다.

1. 일정 4개와 선후관계(보고서 마무리 → 팀 미팅).
2. 위치 자원("헬스장", "회의실", "도서관") 그룹화.
3. 퀘스트 라인:
   - **Main Quest**: 팀 미팅 성공시키기
     - Sub: 보고서 초안 마무리 (마감 10:55)
     - Sub: 회의실 입장 (11:00)
   - **Side Quest**: 헬스 (9:00), 책 반납 (점심 이후)

## 4. 차별점
| 기존 To-do 앱 | QuestLog |
|---|---|
| 텍스트 항목 나열 | 발화 한 번으로 구조화 |
| 시간만 인식 | 시간·장소·선후·자원·우선순위 추론 |
| 완료 체크 | 퀘스트 클리어 / XP / 레벨업 |
| 정적 알림 | 다음에 할 "단 하나의 액션"을 NPC 말투로 안내 |

## 5. 대회용 MVP 범위 (필수)
- [x] 음성/텍스트 입력 → LLM이 일정 JSON 추출
- [x] 추출 결과를 온톨로지(메모리 그래프)로 저장
- [x] 현재 시각 기준 "다음 퀘스트" 한 개를 강조해 보여주는 챗 UI
- [x] 퀘스트 완료 시 XP 획득 & 캐릭터 레벨 표시
- [x] **관리자 페이지 `/admin`**: 발화 → 인텐트 → 온톨로지 → 퀘스트 파이프라인을 실시간 자동 시각화

## 6. 문서 구성
| 파일 | 내용 |
|---|---|
| [01-requirements.md](01-requirements.md) | 기능/비기능 요구사항 |
| [02-architecture.md](02-architecture.md) | 시스템 아키텍처 |
| [03-ontology-design.md](03-ontology-design.md) | 온톨로지 스키마 (핵심) |
| [04-gamification-ux.md](04-gamification-ux.md) | 게이미피케이션 & 사용자 UI 설계 |
| [05-chatbot-flow.md](05-chatbot-flow.md) | 대화 흐름 & 프롬프트 |
| [06-api-spec.md](06-api-spec.md) | 내부 API 명세 |
| [07-copilot-sdk-integration.md](07-copilot-sdk-integration.md) | Copilot SDK 통합 가이드 |
| [08-tech-stack.md](08-tech-stack.md) | 기술 스택 & 폴더 구조 |
| [09-roadmap.md](09-roadmap.md) | 입코딩 대회용 시간 분할 로드맵 |
| [10-admin-page.md](10-admin-page.md) | 관리자 페이지(NLU 관제 콘솔) 설계 |
| [11-angular-solid-guide.md](11-angular-solid-guide.md) | **Angular(≥20) + SOLID + Signals 코딩 원칙 (필독)** |

## 7. 기술 제약 (요약)
- 프레임워크: **Angular 최신 (≥ 20)** , Standalone, Zoneless, `@if`/`@for`.
- 상태관리: **Signals 전용** (`signal`/`computed`/`effect`/`linkedSignal`/`resource`).
- 설계: **SOLID** 강제 (Port/Adapter, InjectionToken DI).
- LLM: Copilot SDK는 **서버(`server.ts` + `/api/*`)에서만** 호출. 시크릿은 브라우저 번들에 절대 노출하지 않는다.
- 금지: NgModule, `*ngIf`/`*ngFor`, `BehaviorSubject` 기반 상태, NgRx 등 외부 스토어.
