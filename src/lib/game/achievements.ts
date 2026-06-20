import { ACHIEVEMENT_DEFS } from "./constants";
import type { Achievement, FoundWord, GameConfig, GameResult } from "./types";

export function evaluateAchievements(
  current: Achievement[],
  result: GameResult,
  foundWords: FoundWord[],
  config: GameConfig,
) {
  const next = current.length > 0 ? [...current] : ACHIEVEMENT_DEFS.map((item) => ({ ...item }));
  const unlocked = new Set(next.filter((item) => item.unlockedAt).map((item) => item.id));
  const updates: string[] = [];

  const unlock = (id: string) => {
    if (unlocked.has(id)) {
      return;
    }
    const index = next.findIndex((item) => item.id === id);
    if (index >= 0) {
      next[index] = { ...next[index], unlockedAt: new Date().toISOString() };
      unlocked.add(id);
      updates.push(id);
    }
  };

  if (foundWords.length >= 1) {
    unlock("first-word");
  }

  if (foundWords.length >= 5) {
    unlock("five-words");
  }

  if (foundWords.length >= 10) {
    unlock("ten-words");
  }

  if (result.mode === "daily") {
    unlock("daily-finish");
  }

  if (result.mode === "practice") {
    unlock("practice-finish");
  }

  if (config.gridSize === 5) {
    unlock("master-grid");
  }

  if (result.score >= 3000) {
    unlock("score-3000");
  }

  if (result.score >= 8000) {
    unlock("score-8000");
  }

  const comboStreak = foundWords.reduce(
    (best, word, index, words) => {
      if (index === 0) {
        return { best: 1, current: 1 };
      }

      const prev = words[index - 1];
      const current =
        word.foundAt - prev.foundAt <= 9000 ? best.current + 1 : 1;
      return {
        best: Math.max(best.best, current),
        current,
      };
    },
    { best: 0, current: 0 },
  );

  if (comboStreak.best >= 3) {
    unlock("combo-3");
  }

  if (comboStreak.best >= 5) {
    unlock("combo-5");
  }

  if (foundWords.some((word) => word.length >= 5)) {
    unlock("long-word");
  }

  if (result.completionRate >= 85 && result.completedTarget) {
    unlock("perfect-clear");
  }

  const earliestFoundAt = foundWords.reduce(
    (best, word) => (best === null ? word.foundAt : Math.min(best, word.foundAt)),
    null as number | null,
  );
  if (earliestFoundAt !== null) {
    const startTime = new Date(result.playedAt).getTime() - result.durationSec * 1000;
    if (earliestFoundAt - startTime <= 15_000) {
      unlock("speed-run");
    }
  }

  const dailyUnlocked = next.find((item) => item.id === "daily-finish")?.unlockedAt;
  if (dailyUnlocked) {
    const finishedDailyCount = next.filter(
      (item) => item.id === "daily-finish" && item.unlockedAt,
    ).length;
    if (finishedDailyCount >= 3) {
      unlock("daily-streak");
    }
  }

  return { achievements: next, unlockedIds: updates };
}
