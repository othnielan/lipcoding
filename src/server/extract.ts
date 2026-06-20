// Server-side extraction used by POST /api/extract.
// Uses the Copilot SDK / OpenAI-compatible Chat Completions endpoint with
// JSON-schema structured output when credentials are configured, and falls
// back to the offline heuristic parser otherwise (demo safety).

import { CategoryName, ExtractResult, IntentName, Priority, SdkExchange, TaskDraft } from '../app/domain/types';
import { parseUtterance } from '../app/domain/nlu';

export interface ExtractRequest {
  utterance: string;
  nowISO: string;
  tz: string;
}

export type ExtractSource = 'copilot' | 'heuristic';

const INTENTS: IntentName[] = [
  'add_schedule',
  'complete_quest',
  'skip_quest',
  'next_quest',
  'query',
  'cancel',
  'chat',
];
const PRIORITIES: Priority[] = ['main', 'side'];
const CATEGORIES: CategoryName[] = ['work', 'health', 'study', 'errand', 'personal'];

const SYSTEM_PROMPT = [
  '너는 한국어 일정 비서이자 RPG 길드마스터 NPC다.',
  '사용자의 발화에서 의도(intent)와 일정(tasks), 그리고 길드마스터 말투의 한국어 답변(npcReply)을 만든다.',
  'intent 종류: add_schedule(새 일정 추가), complete_quest(완료), skip_quest(건너뛰기), next_quest(다음), query(내 일정 조회), cancel(취소), chat(그 외 일반 대화·질문·지식 요청).',
  '발화가 일정 관리와 무관한 일반 질문·잡담·지식 요청이면 intent=chat, tasks=[]로 두고, npcReply에 실제로 도움이 되는 답변을 길드마스터 말투로 1~4문장 작성한다. 질문에 아는 대로 성실히 답한다.',
  '일정을 추가하는 경우에만 tasks를 채운다. priority: 회의/미팅/시험/마감/약속/면접/발표는 main, 그 외는 side.',
  'category: work | health | study | errand | personal 중 하나.',
  'start/end는 nowISO와 tz를 기준으로 ISO8601 문자열, 시간이 없으면 null.',
  'location은 장소명 또는 null. dependsOnTitles는 먼저 끝내야 하는 선행 task의 title 배열("A 전에 B" → A가 B에 의존).',
  '반드시 제공된 JSON 스키마에 맞춰 답한다.',
].join('\n');

/** JSON schema passed to the model for strict structured output. */
const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    intent: { type: 'string', enum: INTENTS },
    npcReply: { type: 'string' },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          start: { type: ['string', 'null'] },
          end: { type: ['string', 'null'] },
          location: { type: ['string', 'null'] },
          priority: { type: 'string', enum: PRIORITIES },
          category: { type: 'string', enum: CATEGORIES },
          dependsOnTitles: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'title',
          'start',
          'end',
          'location',
          'priority',
          'category',
          'dependsOnTitles',
        ],
      },
    },
  },
  required: ['intent', 'tasks', 'npcReply'],
} as const;

/** Validates and normalizes the input request. Throws on invalid input. */
export function parseRequest(body: unknown): ExtractRequest {
  const b = (body ?? {}) as Record<string, unknown>;
  const utterance = typeof b['utterance'] === 'string' ? b['utterance'].trim() : '';
  if (!utterance || utterance.length > 500) {
    throw new Error('invalid utterance');
  }
  const nowISO = typeof b['nowISO'] === 'string' ? b['nowISO'] : new Date().toISOString();
  const tz = typeof b['tz'] === 'string' ? b['tz'] : 'Asia/Seoul';
  return { utterance, nowISO, tz };
}

/** Runs extraction, preferring the LLM and degrading to the heuristic parser. */
export async function runExtract(
  req: ExtractRequest,
): Promise<{ result: ExtractResult; source: ExtractSource; sdk: SdkExchange }> {
  const apiKey =
    process.env['COPILOT_API_KEY'] ||
    process.env['OPENAI_API_KEY'] ||
    process.env['GITHUB_TOKEN'];

  const baseUrl = (process.env['COPILOT_BASE_URL'] || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env['COPILOT_MODEL'] || 'gpt-4o-mini';

  if (apiKey && process.env['MOCK_LLM'] !== 'true') {
    const startedAt = Date.now();
    try {
      const { result, requestBody, raw, statusCode } = await callLlm(req, apiKey);
      return {
        result,
        source: 'copilot',
        sdk: {
          source: 'copilot',
          endpoint: `${baseUrl}/chat/completions`,
          model,
          status: statusCode,
          elapsedMs: Date.now() - startedAt,
          request: requestBody,
          response: raw,
          usage: extractUsage(raw),
        },
      };
    } catch (err) {
      const message = (err as Error).message;
      console.warn('[extract] LLM call failed, falling back to heuristic:', message);
      return {
        result: parseUtterance(req.utterance, req.nowISO),
        source: 'heuristic',
        sdk: {
          source: 'heuristic',
          endpoint: `${baseUrl}/chat/completions`,
          model,
          status: 0,
          elapsedMs: Date.now() - startedAt,
          request: buildRequestBody(req, model),
          response: null,
          usage: null,
          error: message,
        },
      };
    }
  }

  const startedAt = Date.now();
  return {
    result: parseUtterance(req.utterance, req.nowISO),
    source: 'heuristic',
    sdk: {
      source: 'heuristic',
      endpoint: '(local) domain/nlu.parseUtterance',
      model: 'heuristic-rules',
      status: 0,
      elapsedMs: Date.now() - startedAt,
      request: { utterance: req.utterance, nowISO: req.nowISO, tz: req.tz },
      response: null,
      usage: null,
      error: apiKey ? 'MOCK_LLM=true' : 'no API key configured',
    },
  };
}

/** Builds the chat.completions request body so it can be shown even on fallback. */
function buildRequestBody(req: ExtractRequest, model: string) {
  return {
    model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `nowISO: ${req.nowISO}\ntz: ${req.tz}\nutterance: "${req.utterance}"`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'ExtractResult', strict: true, schema: RESPONSE_SCHEMA },
    },
  };
}

function extractUsage(raw: unknown): SdkExchange['usage'] {
  const u = (raw as { usage?: Record<string, number> } | null)?.usage;
  if (!u) return null;
  return {
    prompt: u['prompt_tokens'],
    completion: u['completion_tokens'],
    total: u['total_tokens'],
  };
}

async function callLlm(
  req: ExtractRequest,
  apiKey: string,
): Promise<{ result: ExtractResult; requestBody: unknown; raw: unknown; statusCode: number }> {
  const baseUrl = (process.env['COPILOT_BASE_URL'] || 'https://api.openai.com/v1').replace(
    /\/$/,
    '',
  );
  const model = process.env['COPILOT_MODEL'] || 'gpt-4o-mini';
  const requestBody = buildRequestBody(req, model);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      throw new Error(`LLM HTTP ${res.status}`);
    }
    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('empty LLM content');
    }
    return {
      result: validateResult(JSON.parse(content)),
      requestBody,
      raw: data,
      statusCode: res.status,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Defensive validation/normalization of the model output. */
function validateResult(raw: unknown): ExtractResult {
  const o = (raw ?? {}) as Record<string, unknown>;
  const intent = INTENTS.includes(o['intent'] as IntentName)
    ? (o['intent'] as IntentName)
    : 'add_schedule';
  const npcReply = typeof o['npcReply'] === 'string' ? o['npcReply'] : '';
  const rawTasks = Array.isArray(o['tasks']) ? o['tasks'] : [];
  const tasks: TaskDraft[] = rawTasks
    .map((t) => normalizeTask(t))
    .filter((t): t is TaskDraft => t !== null);
  return { intent, tasks, npcReply };
}

function normalizeTask(raw: unknown): TaskDraft | null {
  const t = (raw ?? {}) as Record<string, unknown>;
  const title = typeof t['title'] === 'string' ? t['title'].trim() : '';
  if (!title) return null;
  return {
    title,
    start: typeof t['start'] === 'string' ? t['start'] : null,
    end: typeof t['end'] === 'string' ? t['end'] : null,
    location: typeof t['location'] === 'string' ? t['location'] : null,
    priority: PRIORITIES.includes(t['priority'] as Priority) ? (t['priority'] as Priority) : 'side',
    category: CATEGORIES.includes(t['category'] as CategoryName)
      ? (t['category'] as CategoryName)
      : 'personal',
    dependsOnTitles: Array.isArray(t['dependsOnTitles'])
      ? (t['dependsOnTitles'] as unknown[]).filter((x): x is string => typeof x === 'string')
      : [],
  };
}
