# 개발 로드맵 (대회 MVP 우선순위)

> 입코딩 대회 = 시간 제약. 데모를 성공시키는 **최소 경로**를 먼저 깐다.
> 단계별로 "여기서 멈춰도 데모는 된다"가 되도록 설계.

## 단계 0. 프로젝트 부트스트랩
- [ ] `create-next-app` (TS, App Router, Tailwind).
- [ ] shadcn/ui init, lucide-react 설치.
- [ ] zod, zustand, nanoid, zod-to-json-schema 설치.
- [ ] Copilot SDK 패키지 설치 + `.env.local`에 키 주입.
- [ ] 폴더 스캐폴딩 ([08-tech-stack.md](08-tech-stack.md) 구조대로 빈 파일 생성).

**완료 기준**: `npm run dev` 가 빈 화면을 띄운다.

---

## 단계 1. 도메인 코어 (UI 없이 동작)
> 가장 먼저 짜고, 가장 마지막까지 안 깨지게 보호한다.

- [ ] `lib/domain/types.ts` 타입 정의.
- [ ] `lib/domain/ontology.ts` `OntologyGraph` 클래스 (upsert/get/inferImplicitOrder/toJSON).
- [ ] `lib/domain/quest-engine.ts` `buildQuests`, `getActiveQuest`.
- [ ] `lib/domain/xp.ts` `gainXp`, `levelFor`.
- [ ] vitest로 핵심 시나리오 1~2개 테스트.

**완료 기준**: 하드코딩 task 배열로 `buildQuests` → main/sub/side 정확히 분류되는 단위 테스트 통과.

---

## 단계 2. Copilot SDK 추출 파이프라인
- [ ] `lib/copilot/extract-schema.ts` (zod + JSON schema).
- [ ] `lib/copilot/extract-prompt.ts` (system + user 템플릿).
- [ ] `lib/copilot/client.ts` (싱글톤 + timeout).
- [ ] `app/api/extract/route.ts` 구현 + zod 검증 + 1회 재시도.
- [ ] `lib/copilot/mock.ts` 1~2개의 고정 응답 (네트워크 실패 대비).

**완료 기준**: `curl -X POST /api/extract` 한 번으로 JSON 응답 OK.

---

## 단계 3. 최소 UI (텍스트 입력만)
> 음성은 다음 단계. 먼저 텍스트로 동작 확인.

- [ ] `app/page.tsx` 2단 레이아웃.
- [ ] `ChatPanel` + 입력창 + 전송 버튼.
- [ ] `useQuestStore` (Zustand) — graph snapshot, quests, xp, level, messages 보관.
- [ ] 전송 시 `/api/extract` → 결과를 graph에 머지 → `buildQuests` → 화면 갱신.
- [ ] `QuestBoard`, `ActiveQuestHero`, `CharacterCard` 기본 형태.

**완료 기준**: 텍스트로 "내일 9시 헬스, 11시 미팅" 입력 → 보드에 카드 2개, Active 하이라이트.

---

## 단계 4. 게이미피케이션 동작
- [ ] 퀘스트 카드의 "완료" 버튼 → `gainXp` 호출 → 카드 done 이동, XP 바 애니메이션.
- [ ] 레벨업 시 토스트 + NPC 시스템 메시지.
- [ ] `getActiveQuest` 가 시간 흐름에 따라 갱신되도록 1초 polling (혹은 mount 시 + 완료 시).

**완료 기준**: 데모 시 클릭 한 번 = XP 획득 + 시각적 피드백.

---

## 단계 5. 관리자 페이지 (`/admin`) — 데모 임팩트 핵심
> 상세 설계: [10-admin-page.md](10-admin-page.md)

- [ ] `lib/store/admin-log.ts` — `UtteranceLog` circular buffer(50) Zustand store.
- [ ] 사용자 파이프라인(extract → graph upsert → buildQuests)의 **각 단계에서** admin-log에 기록 추가.
- [ ] `app/admin/page.tsx` 와 6개 패널 컬포넌트 구현.
  - UtteranceTimeline / IntentAnalyzer / OntologyGraphView / TripleStoreTable / QuestBuildTrace / ValidationPanel.
- [ ] `ADMIN_ENABLED !== 'true'` 일 때 `notFound()` 처리.
- [ ] `Seed Demo`, `Reset Graph` 버튼.

**완료 기준**: 두 탭(`/`, `/admin`)을 나란히 열어둔 상태에서, 사용자 탭에 발화 한 번 = 관리자 탭의 6개 패널이 자동 갱신.

---

## 단계 6. 음성 입력
- [ ] `VoiceInput` 컴포넌트 (Web Speech API).
- [ ] Push-to-talk(스페이스바 hold) + 클릭 토글.
- [ ] 인식 텍스트는 ChatPanel 입력칸에 실시간 미리보기, 종료 시 자동 전송.
- [ ] 브라우저 비호환 시 텍스트 입력으로 graceful fallback.

**완료 기준**: 크롬에서 마이크 한 번 누르고 발화 → 자동 추출/표시.

---

## 단계 7. NPC 톤 다듬기 & 디자인 폴리시
- [ ] NPC 시스템 메시지에 픽셀 아바타.
- [ ] Active Quest 카드 글로우 / 카운트다운.
- [ ] 칭호 1~2개 (work 5회, 하루 3 클리어 정도로 데모 쉽게).
- [ ] (옵션) 사운드 효과.

---

## 단계 8. 데모 리허설
- [ ] 시나리오 1 (등록): "내일 9시 헬스, 11시 팀 미팅, 미팅 전에 보고서 마무리, 점심 먹고 도서관에서 책 반납"
  - 기대: 4개 task, 의존성 1개, main 1개, side 3개.
  - 관리자 페이지가 발화를 받아 6개 패널이 모두 갱신되는지 확인.
- [ ] 시나리오 2 (진행): "보고서 끝!" → +30 XP, 관리자 콘솔의 quest trace 갱신 확인.
- [ ] 시나리오 3 (조회): "오늘 뭐 남았어?" → 요약 응답.
- [ ] 백업: `MOCK_LLM=true` 로 동일 시연 가능한지 확인.
- [ ] 발표 시 화면 분할: 왼쪽 `/`, 오른쪽 `/admin`.

---

## 우선순위 매트릭스 (시간 부족 시 컷)

| 항목 | 영향 | 난이도 | 컷 가능? |
|---|---|---|---|
| 도메인 코어 + 추출 + 텍스트 UI | ★★★★★ | 중 | ❌ 필수 |
| 관리자 페이지 (`/admin`) | ★★★★★ | 중 | ❌ **데모 임팩트 핵심** |
| 음성 입력 | ★★★★ | 중 | ⚠ 텍스트로도 데모 가능 |
| 게이미피케이션 (XP/Level) | ★★★★ | 하 | ❌ 컨셉 핵심 |
| 칭호/사운드/애니메이션 | ★★ | 중 | ✅ 시간 남으면 |
| 다중 사용자/DB | ★ | 상 | ✅ 범위 외 |
| 캘린더 동기화 | ★ | 상 | ✅ 범위 외 |

## 리스크 & 대응

| 리스크 | 대응 |
|---|---|
| LLM 응답 JSON 깨짐 | structured output + zod 검증 + 1회 재시도 + Mock 폴백 |
| 시연장 네트워크 불안 | `MOCK_LLM=true` 로컬 데모 |
| 음성 인식 실패 | 텍스트 입력 항상 노출 |
| 시간 추론 오류(타임존) | 항상 `nowISO` + `tz` 를 LLM에 명시 전달 |
| 입코딩 중 오타 | strict TS + 짧은 함수 + 자주 `npm run build` |
