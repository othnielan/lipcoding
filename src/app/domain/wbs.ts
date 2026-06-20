// Pure domain type for the WBS (Work Breakdown Structure) feature.

/**
 * A single node in a project's work breakdown structure. Nodes form a tree via
 * `parentId` (null = top-level project). Leaf nodes carry the real completion
 * state; a parent's progress is rolled up from its leaf descendants.
 */
export interface WbsItem {
  id: string;
  title: string;
  parentId: string | null;
  done: boolean;
  createdAt: string; // ISO8601 — also defines sibling order
}
