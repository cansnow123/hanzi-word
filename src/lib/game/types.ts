export type GameMode = "daily" | "practice" | "timed" | "endless";
export type Difficulty = "easy" | "normal" | "hard";
export type GridSize = 3 | 4 | 5;

export type GameConfig = {
  mode: GameMode;
  difficulty: Difficulty;
  gridSize: GridSize;
  timeLimitSec: number;
  targetWordCount: number;
};

export type Cell = {
  id: number;
  row: number;
  col: number;
  char: string;
};

export type BoardState = {
  cells: Cell[];
  adjacencyMap: Record<number, number[]>;
  validWords: Record<string, number[][]>;
  hintPool: number[][];
  seed: number;
};

export type FoundWord = {
  text: string;
  path: number[];
  length: number;
  score: number;
  foundAt: number;
  comboMultiplier: number;
};

export type GameResult = {
  score: number;
  foundCount: number;
  completionRate: number;
  durationSec: number;
  completedTarget: boolean;
  mode: GameMode;
  gridSize: GridSize;
  difficulty: Difficulty;
  playedAt: string;
  endlessClears?: number;
};

export type DictionaryIndex = {
  words: string[];
  wordMeta: DictionaryWordMeta[];
  lengthBuckets: Record<string, number[]>;
  shapeBuckets: Record<string, number[]>;
  headBuckets: Record<string, number[]>;
  tailBuckets: Record<string, number[]>;
  charBuckets: Record<string, number[]>;
  metadataVersion: string;
};

export type DictionaryWordMeta = {
  length: number;
  chars: string[];
  uniqueChars: string[];
  headChar: string;
  tailChar: string;
  charHash: string;
  shapeKey: string;
};

export type DailyWordInfo = {
  word: string;
  pinyin: string;
  translation: string;
  source: "remote" | "local";
};

export type Achievement = {
  id: string;
  label: string;
  description: string;
  unlockedAt?: string;
};

export type HistoryEntry = GameResult & {
  id: string;
};

export type SettingsState = {
  soundEnabled: boolean;
  reduceMotion: boolean;
};

export type EndlessStats = {
  totalClears: number;
  bestRun: number;
};
