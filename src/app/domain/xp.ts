import { QuestKind, XP_BY_KIND } from './types';

/** Pure XP / level math. */
export class XpCalculator {
  static reward(kind: QuestKind): number {
    return XP_BY_KIND[kind];
  }

  /** Total XP required to reach the *start* of a given level (level >= 1). */
  static xpForLevel(level: number): number {
    if (level <= 1) return 0;
    let total = 0;
    for (let l = 1; l < level; l++) {
      total += 100 * l + 50 * l * (l - 1);
    }
    return total;
  }

  static levelFor(xp: number): number {
    let level = 1;
    while (xp >= XpCalculator.xpForLevel(level + 1)) level++;
    return level;
  }

  /** XP into the current level and XP needed for the whole current level. */
  static progress(xp: number): { current: number; needed: number; ratio: number } {
    const level = XpCalculator.levelFor(xp);
    const base = XpCalculator.xpForLevel(level);
    const next = XpCalculator.xpForLevel(level + 1);
    const needed = next - base;
    const current = xp - base;
    return { current, needed, ratio: needed === 0 ? 0 : current / needed };
  }
}
