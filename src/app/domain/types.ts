// Pure domain types — no Angular dependency.

export type Priority = 'main' | 'side';
export type Status = 'pending' | 'active' | 'done' | 'skipped';
export type CategoryName = 'work' | 'health' | 'study' | 'errand' | 'personal';
export type QuestKind = 'main' | 'sub' | 'side';

export type IntentName =
  | 'add_schedule'
  | 'complete_quest'
  | 'skip_quest'
  | 'next_quest'
  | 'query'
  | 'cancel';

export interface Task {
  id: string;
  title: string;
  start?: string | null; // ISO8601
  end?: string | null;
  priority: Priority;
  status: Status;
  category: CategoryName;
  location?: string | null;
  dependsOn: string[]; // task ids
  xpReward: number;
  createdAt: string;
}

export interface Quest {
  id: string;
  kind: QuestKind;
  title: string;
  narrative: string;
  taskIds: string[];
  parentQuestId?: string;
}

export interface Triple {
  subject: string;
  predicate: string;
  object: string;
}

export interface ChatMessage {
  id: string;
  role: 'npc' | 'user' | 'system' | 'extract';
  text: string;
  ts: string;
  /** Present when role === 'extract': the structured values produced by the LLM/SDK. */
  extract?: ExtractCard;
}

/** Structured extraction result surfaced inside the chat before ontology update. */
export interface ExtractCard {
  source: 'copilot' | 'heuristic';
  elapsedMs: number;
  intent: IntentName;
  tasks: TaskDraft[];
}

/** A single task draft as produced by the LLM/extractor before graph insertion. */
export interface TaskDraft {
  title: string;
  start?: string | null;
  end?: string | null;
  location?: string | null;
  priority: Priority;
  category: CategoryName;
  dependsOnTitles?: string[];
}

export interface ExtractResult {
  intent: IntentName;
  tasks: TaskDraft[];
  npcReply: string;
}

export const CATEGORY_EMOJI: Record<CategoryName, string> = {
  work: '💼',
  health: '💪',
  study: '📚',
  errand: '🛒',
  personal: '🌿',
};

export const XP_BY_KIND: Record<QuestKind, number> = {
  side: 10,
  sub: 30,
  main: 100,
};
