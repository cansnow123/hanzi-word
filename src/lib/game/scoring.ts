import { COMBO_WINDOW_MS, SCORE_BY_LENGTH } from "./constants";
import type { FoundWord } from "./types";

export function getBaseScore(length: number) {
  if (length <= 1) {
    return 0;
  }
  if (length >= 5) {
    return SCORE_BY_LENGTH[5];
  }
  return SCORE_BY_LENGTH[length] ?? 0;
}

export function getComboMultiplier(previous: FoundWord[], foundAt: number) {
  if (previous.length === 0) {
    return 1;
  }

  const recent = [...previous]
    .reverse()
    .filter((word) => foundAt - word.foundAt <= COMBO_WINDOW_MS);

  if (recent.length >= 4) {
    return 1.75;
  }

  if (recent.length >= 2) {
    return 1.35;
  }

  return 1;
}
