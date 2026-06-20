// Pure domain types for the Kanban board feature.

/** The fixed set of board columns a card can live in. */
export type KanbanColumn = 'todo' | 'doing' | 'done';

/** A single Kanban card pinned to one column. */
export interface KanbanCard {
  id: string;
  title: string;
  column: KanbanColumn;
  order: number; // sort key within a column (ascending)
  createdAt: string; // ISO8601
}
