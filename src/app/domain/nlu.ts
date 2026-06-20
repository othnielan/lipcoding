// Pure, framework-agnostic Korean schedule NLU.
// Shared by the browser HeuristicExtractor adapter and the server /api/extract route.

import { CategoryName, ExtractResult, IntentName, Priority, TaskDraft } from './types';

/** Parses a Korean utterance into a structured ExtractResult (offline heuristic). */
export function parseUtterance(utterance: string, nowISO: string): ExtractResult {
  const text = utterance.trim();
  const intent = detectIntent(text);
  if (intent !== 'add_schedule') {
    return { intent, tasks: [], npcReply: replyFor(intent) };
  }

  const now = new Date(nowISO);
  const clauses = splitClauses(text);
  const tasks: TaskDraft[] = [];
  const beforeLinks: { taskTitle: string; refKeyword: string }[] = [];

  for (const clause of clauses) {
    // "X 전에 Y" → the task is Y, and Y must finish before X.
    let taskPart = clause;
    let refKeyword: string | null = null;
    const beforeIdx = clause.indexOf('전에');
    if (beforeIdx >= 0) {
      refKeyword = refToken(clause.slice(0, beforeIdx));
      taskPart = clause.slice(beforeIdx + 2).trim();
    }

    const title = cleanTitle(taskPart);
    if (!title) continue;
    tasks.push({
      title,
      start: parseTime(taskPart, now),
      end: null,
      location: detectLocation(taskPart),
      priority: detectPriority(taskPart),
      category: detectCategory(taskPart),
      dependsOnTitles: [],
    });
    if (refKeyword) beforeLinks.push({ taskTitle: title, refKeyword });
  }

  // Wire up "finish before" dependencies: the referenced task depends on this one.
  for (const link of beforeLinks) {
    const ref = tasks.find((t) => t.title.includes(link.refKeyword));
    if (!ref || ref.title === link.taskTitle) continue;
    const deps = (ref.dependsOnTitles ??= []);
    if (!deps.includes(link.taskTitle)) deps.push(link.taskTitle);
  }

  const npcReply =
    tasks.length === 0
      ? '용사여, 무슨 임무인지 다시 한 번 또렷이 말해주겠나?'
      : `용사여, ${tasks.length}개의 임무를 퀘스트 보드에 새겼다네. 모험을 시작하게!`;

  return { intent: 'add_schedule', tasks, npcReply };
}

function detectIntent(text: string): IntentName {
  if (/(끝|완료|했어|다\s?했|클리어)/.test(text)) return 'complete_quest';
  if (/(건너|패스|스킵)/.test(text)) return 'skip_quest';
  if (/(취소|빼줘|지워|삭제)/.test(text)) return 'cancel';
  if (/(남았|뭐\s?하|뭐\s?남|보여줘|목록|뭐가)/.test(text)) return 'query';
  if (/(다음|넥스트)/.test(text)) return 'next_quest';
  return 'add_schedule';
}

function replyFor(intent: IntentName): string {
  switch (intent) {
    case 'complete_quest':
      return '퀘스트 클리어! 경험치를 획득했다네. 다음 임무로 향하게.';
    case 'skip_quest':
      return '이 임무는 잠시 미뤄두지. 다음 모험으로!';
    case 'cancel':
      return '방금 새긴 임무를 지웠다네.';
    case 'query':
      return '남은 임무를 보드에서 확인하게, 용사여.';
    case 'next_quest':
      return '다음 임무를 안내하지.';
    default:
      return '말씀하시게.';
  }
}

function splitClauses(text: string): string[] {
  return text
    .split(/,|\.|그리고|그 다음|그다음|및|\n/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

function cleanTitle(clause: string): string {
  let t = clause;
  // Strip leading meal lead-ins ("점심 먹고 …").
  t = t.replace(/(아침|점심|저녁|밥)\s?먹고/g, ' ');
  // Strip day / time-of-day adverbs and explicit clock times.
  t = t.replace(/(내일모레|모레|내일|오늘|새벽|아침|점심|저녁|오전|오후|밤)/g, ' ');
  t = t.replace(/\d+\s?시(\s?\d+\s?분)?/g, ' ');
  // Drop "<place>에서" location phrases (location is captured separately).
  t = t.replace(/[가-힣A-Za-z]+\s?에서/g, ' ');
  // Strip trailing verb endings while keeping the action noun.
  t = t.replace(
    /(해야\s?지|해야\s?해|해줄래|해주라|해줘|할\s?거야|할게|할래|하자|하기|했어|해야|가고|가야|갈게|갔다|줘)/g,
    ' ',
  );
  // Drop dangling time/location particles left at token edges.
  t = t.replace(/\s(에|에서|으로|로)(\s|$)/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t || clause.trim();
}

/** Extracts the last meaningful noun from a "X 전에" reference phrase. */
function refToken(ref: string): string {
  const cleaned = ref
    .replace(/(내일모레|모레|내일|오늘|아침|점심|저녁|오전|오후)/g, ' ')
    .replace(/\d+\s?시(\s?\d+\s?분)?/g, ' ')
    .replace(/[,.]/g, ' ')
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  return words.length ? words[words.length - 1] : cleaned;
}

function parseTime(clause: string, now: Date): string | null {
  let dayOffset = 0;
  if (/모레/.test(clause)) dayOffset = 2;
  else if (/내일/.test(clause)) dayOffset = 1;

  const m = clause.match(/(\d{1,2})\s?시(?:\s?(\d{1,2})\s?분)?/);
  if (!m) {
    if (dayOffset === 0) return null;
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }
  let hour = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (/오후|저녁/.test(clause) && hour < 12) hour += 12;
  if (/점심/.test(clause) && hour < 12) hour = 12;
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

function detectPriority(clause: string): Priority {
  return /(회의|미팅|시험|마감|약속|면접|발표|deadline)/.test(clause) ? 'main' : 'side';
}

function detectCategory(clause: string): CategoryName {
  if (/(헬스|운동|러닝|조깅|요가|짐)/.test(clause)) return 'health';
  if (/(회의|미팅|보고서|업무|프로젝트|발표|면접)/.test(clause)) return 'work';
  if (/(공부|도서관|책|강의|스터디|시험|과제)/.test(clause)) return 'study';
  if (/(반납|장보기|마트|은행|심부름|택배|병원|약국)/.test(clause)) return 'errand';
  return 'personal';
}

function detectLocation(clause: string): string | null {
  const known = ['도서관', '헬스장', '회의실', '집', '회사', '카페', '학교', '병원', '은행', '마트'];
  for (const k of known) if (clause.includes(k)) return k;
  const m = clause.match(/([가-힣A-Za-z]+)\s?(?:에서|으로|로)\s/);
  if (m) return m[1];
  return null;
}
