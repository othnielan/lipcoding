// Pure domain type for the Notes feature — no Angular dependency.

/** How a note ended up in the store. */
export type NoteSource = 'voice' | 'text' | 'auto';

/**
 * A free-form memo. Created either explicitly (typed/spoken in the notes view)
 * or automatically when an utterance is classified as general talk rather than
 * a schedule.
 */
export interface Note {
  id: string;
  text: string;
  createdAt: string; // ISO8601
  source: NoteSource;
}
