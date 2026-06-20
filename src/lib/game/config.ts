import { DIFFICULTY_PRESETS } from "./constants";
import type { Difficulty, GameConfig, GameMode, GridSize } from "./types";

export function buildGameConfig(
  mode: GameMode,
  difficulty: Difficulty,
  gridSize: GridSize,
): GameConfig {
  const preset =
    mode === "practice"
      ? { timeLimitSec: 0, targetWordCount: DIFFICULTY_PRESETS[difficulty].targetWordCount }
      : mode === "endless"
        ? { timeLimitSec: 180, targetWordCount: 0 }
        : DIFFICULTY_PRESETS[difficulty];

  const resolvedGridSize = mode === "endless" ? 5 : gridSize;
  const resolvedDifficulty = mode === "endless" ? "normal" : difficulty;

  return {
    mode,
    difficulty: resolvedDifficulty,
    gridSize: resolvedGridSize,
    timeLimitSec: preset.timeLimitSec,
    targetWordCount: preset.targetWordCount,
  };
}

export function parseGameSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): GameConfig {
  const mode = normalizeMode(searchParams.mode);
  const difficulty = normalizeDifficulty(searchParams.difficulty);
  const gridSize = normalizeGridSize(searchParams.grid);
  return buildGameConfig(mode, difficulty, gridSize);
}

function normalizeMode(input: string | string[] | undefined): GameMode {
  const value = Array.isArray(input) ? input[0] : input;
  if (value === "daily" || value === "practice" || value === "endless") {
    return value;
  }
  return "timed";
}

function normalizeDifficulty(input: string | string[] | undefined): Difficulty {
  const value = Array.isArray(input) ? input[0] : input;
  if (value === "easy" || value === "hard") {
    return value;
  }
  return "normal";
}

function normalizeGridSize(input: string | string[] | undefined): GridSize {
  const value = Number(Array.isArray(input) ? input[0] : input);
  if (value === 3 || value === 5) {
    return value;
  }
  return 4;
}
