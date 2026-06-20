# Copilot SDK 통합 가이드

> 대회 규정상 **Copilot SDK 사용 필수**. 본 문서는 SDK를 어떤 지점에서, 어떤 패턴으로
> 호출하는지 정리한다. 실제 메서드명/모델명은 사용 중인 SDK 문서를 따라 최종 확정한다.

## 1. 사용 지점 한눈에 보기

| 위치 | 호출 목적 | SDK 기능 |
|---|---|---|
| `lib/copilot/client.ts` | SDK 클라이언트 싱글톤 | 인스턴스 생성 + 인증 |
| `app/api/extract/route.ts` | 발화 → 구조화 JSON | Chat Completion + Structured Output |
| (옵션) NPC 자연어 보강 | 퀘스트 narrative 풍부화 | Chat Completion |
| (옵션) "오늘 뭐 남았어?" 요약 | 요약 답변 | Chat Completion (스트리밍) |

## 2. 클라이언트 초기화 (의사 코드)

```ts
// lib/copilot/client.ts
import { Copilot } from '@github/copilot-sdk'; // 실제 패키지명은 SDK 문서 기준으로 교체

let _client: Copilot | null = null;

export function getCopilot() {
  if (_client) return _client;
  const apiKey = process.env.COPILOT_API_KEY;
  if (!apiKey) throw new Error('COPILOT_API_KEY missing');
  _client = new Copilot({
    apiKey,
    model: process.env.COPILOT_MODEL ?? 'gpt-4o-mini',
    timeoutMs: 8_000,
  });
  return _client;
}
```

> 키는 **서버 전용** 환경 변수(`process.env`, `NEXT_PUBLIC_` 접두사 금지).
> 브라우저 번들에 절대 포함되지 않도록 Route Handler 안에서만 import.

## 3. 추출 호출 패턴

```ts
// app/api/extract/route.ts
import { z } from 'zod';
import { getCopilot } from '@/lib/copilot/client';
import { extractSchema, ExtractResult } from '@/lib/copilot/extract-schema';
import { SYSTEM_PROMPT, userPrompt } from '@/lib/copilot/extract-prompt';

export async function POST(req: Request) {
  const body = await req.json();
  const { utterance, nowISO, tz } = z.object({
    utterance: z.string().min(1).max(500),
    nowISO: z.string(),
    tz: z.string(),
  }).parse(body);

  const copilot = getCopilot();

  const completion = await copilot.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userPrompt({ utterance, nowISO, tz }) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'ExtractResult', schema: extractSchema, strict: true },
    },
    temperature: 0.2,
  });

  const raw = completion.choices[0].message.content ?? '{}';
  const parsed: ExtractResult = extractSchemaZ.parse(JSON.parse(raw));
  return Response.json(parsed);
}
```

### 핵심 포인트
- **Structured Output (`response_format: json_schema`)** 사용 → 파싱 안정성 ↑.
- 동일 스키마를 서버에서 **zod로 한 번 더 검증** → SDK가 못 잡는 엣지를 방어.
- `temperature: 0.2` 로 추출의 일관성 확보.
- 실패 시 1회 재시도 (지수 백오프 100ms → 300ms).

## 4. 스키마 단일 출처 전략

`extract-schema.ts` 한 파일에서:

```ts
import { z } from 'zod';
export const extractSchemaZ = z.object({
  intent: z.enum(['add_schedule','complete_quest','skip_quest','next_quest','query','cancel']),
  tasks: z.array(z.object({
    title: z.string(),
    start: z.string().nullable(),
    end: z.string().nullable(),
    location: z.string().nullable(),
    priority: z.enum(['main','side']),
    category: z.enum(['work','health','study','errand','personal']),
    dependsOnTitles: z.array(z.string()).default([]),
  })),
  npcReply: z.string(),
});
export type ExtractResult = z.infer<typeof extractSchemaZ>;

// SDK 호출용으로 zod → JSON Schema 변환 (zod-to-json-schema)
import { zodToJsonSchema } from 'zod-to-json-schema';
export const extractSchema = zodToJsonSchema(extractSchemaZ, 'ExtractResult');
```

→ 프롬프트/SDK/서버 검증이 **하나의 zod 정의**에서 파생됨. 버그/스키마 드리프트 방지.

## 5. (옵션) NPC 대사 보강

기본 `npcReply` 는 extract 단계에서 함께 받는다.
시간 여유가 있다면 **레벨업 / 칭호 획득** 시점에만 추가 호출하여 더 풍부한 멘트를 받는다.

```ts
const fluff = await copilot.chat.completions.create({
  messages: [
    { role: 'system', content: 'You are an RPG NPC guildmaster. Reply in Korean, one short sentence.' },
    { role: 'user', content: `사용자가 레벨업했어요(Lv ${newLevel}). 축하 멘트를 NPC 톤으로.` },
  ],
  temperature: 0.7,
});
```

## 6. 비용/속도 가이드
- 한 발화당 토큰: 입력 ~300, 출력 ~250 정도로 설계 (JSON 압축).
- 모델 선택: 빠른 응답이 필요한 추출에는 경량 모델(`gpt-4o-mini` 등), 데모 임팩트가 필요한 멘트 보강에는 더 큰 모델.
- 캐싱: 동일 발화 → 동일 결과는 거의 없으므로 캐시 X. 대신 LLM 호출 실패에 대비한 1회 재시도만.

## 7. 보안 체크리스트
- [ ] API 키는 `.env.local` 에만, 저장소에는 `.env.example` 만 커밋.
- [ ] Route Handler 외부에서 `getCopilot()` 호출 금지.
- [ ] 사용자 입력은 길이 제한 + zod 검증.
- [ ] LLM 응답을 그대로 `dangerouslySetInnerHTML` 등에 주입 금지.
- [ ] 에러 메시지는 사용자에게는 일반화된 문구로(스택/키 절대 누출 X).

## 8. 데모 시 폴백 전략 (네트워크 불안 대비)
- 환경 변수 `MOCK_LLM=true` 인 경우, `lib/copilot/mock.ts` 의 미리 정의된 응답을 반환.
- 대회 시연 직전에 한 번 `MOCK_LLM=false` 로 실제 호출 점검.
