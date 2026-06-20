let counter = 0;

/** Deterministic-ish unique id with a readable prefix. */
export function newId(prefix: string): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`;
}
