# 내부 API 명세

> 모든 엔드포인트는 Next.js Route Handler (`app/api/.../route.ts`) 로 구현한다.
> 인증은 MVP 범위 외 → Origin 검사로 동일 출처만 허용.

## 1. `POST /api/extract`
사용자 발화를 LLM으로 보내 구조화된 결과를 받는다.

### Request
```json
{
  "utterance": "내일 9시에 헬스 가고...",
  "nowISO": "2026-06-20T14:32:11+09:00",
  "tz": "Asia/Seoul"
}
```

### Response 200
```json
{
  "intent": "add_schedule",
  "tasks": [
    {
      "tempId": "draft-1",
      "title": "헬스",
      "start": "2026-06-21T09:00:00+09:00",
      "end": null,
      "location": null,
      "priority": "side",
      "category": "health",
      "dependsOnTitles": []
    }
  ],
  "npcReply": "용사여, 내일의 임무를 새겼다네."
}
```

### Response 4xx/5xx
```json
{ "error": "LLM_PARSE_FAILED", "message": "..." }
```

| 코드 | 의미 |
|---|---|
| 400 | utterance 누락/너무 김(>500자) |
| 422 | LLM 응답 JSON 검증 실패 |
| 502 | Copilot SDK 호출 실패 |

## 2. `POST /api/graph/sync`
클라이언트 graph snapshot 과 신규 task drafts 를 받아, 머지된 graph + 퀘스트를 반환.
> 서버를 stateless 로 유지하기 위한 핵심 엔드포인트.

### Request
```json
{
  "snapshot": { /* GraphSnapshot */ },
  "drafts":   [ /* extract API 의 tasks 배열 */ ],
  "nowISO":   "2026-06-20T14:32:11+09:00"
}
```

### Response 200
```json
{
  "snapshot": { /* merged GraphSnapshot */ },
  "quests": {
    "active":   { /* Quest | null */ },
    "upcoming": [ /* Quest[] */ ],
    "done":     [ /* Quest[] */ ]
  }
}
```

## 3. `POST /api/quests/complete`
활성 퀘스트를 클리어하고 XP/레벨 갱신값을 반환.

### Request
```json
{
  "snapshot": { /* GraphSnapshot */ },
  "questId": "q_123",
  "nowISO": "2026-06-21T10:50:00+09:00",
  "currentXp": 740
}
```

### Response 200
```json
{
  "snapshot": { /* updated */ },
  "xpGained": 36,
  "newXp": 776,
  "level": 7,
  "leveledUp": false,
  "npcReply": "퀘스트 클리어! +36 XP."
}
```

## 4. `POST /api/quests/skip`

```json
{ "snapshot": {...}, "questId": "q_123" }
```
응답: 갱신된 snapshot + 다음 active quest.

## 5. 공통 응답 헤더
- `Content-Type: application/json; charset=utf-8`
- `Cache-Control: no-store`

## 6. 타입 (공유)
> `lib/domain/types.ts` 의 타입을 그대로 import 한다. 별도 DTO 레이어를 두지 않는다(MVP).

```ts
export interface GraphSnapshot {
  version: 1;
  tasks: Task[];
  locations: Location[];
  categories: Category[];
}

export interface QuestBundle {
  active: Quest | null;
  upcoming: Quest[];
  done: Quest[];
}
```

## 7. 검증
- 서버에서는 [zod](https://zod.dev) 스키마로 모든 입력을 1차 검증.
- LLM 응답은 같은 zod 스키마로 2차 검증 → 실패 시 1회 재시도.

## 8. 레이트리밋(옵션)
- 동일 IP 기준 분당 30회. `lru-cache` 로 in-memory 카운터(MVP 충분).
