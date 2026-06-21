import { COMMON_FILLER_CHARS, MIN_VALID_WORDS } from "./constants";
import { getDictionaryIndex, getTrie, getWordList } from "./dictionary";
import { createRng, hashString, randomInt } from "./seed";
import type { BoardState, Cell, GameConfig, GridSize } from "./types";

type SolverResult = Record<string, number[][]>;

type DailySnapshot = {
  charSet: Set<string>;
  charFrequency: Record<string, number>;
  lengthHistogram: Record<number, number>;
  shapeHistogram: Record<string, number>;
  primaryHash: string;
};

type DailyBoardProfile = {
  primaryWords: string[];
  charSet: Set<string>;
  lengthHistogram: Record<number, number>;
  shapeHistogram: Record<string, number>;
  scoreBreakdown: ScoreBreakdown;
};

type ScoreBreakdown = {
  solvable: number;
  structural: number;
  freshness: number;
  family: number;
  path: number;
  visual: number;
  total: number;
};

type CandidateBoard = {
  chars: string[];
  state: {
    cells: Cell[];
    adjacencyMap: Record<number, number[]>;
    validWords: SolverResult;
  };
  profile: DailyBoardProfile;
};

type PlacementPlan = {
  word: string;
  shapeKey: string;
  uniqueChars: string[];
  rarity: number;
};

const DAILY_CANDIDATE_ATTEMPTS = 18;
const DAILY_HISTORY_DAYS = 7;
const DAILY_HISTORY_NEAR_DAYS = 3;
const DAILY_RECENT_CHAR_BAN_DAYS = 2;
const DAILY_RECENT_CHAR_SOFT_CAP = 3;
const DAILY_PRIMARY_WORD_COUNT: Record<GridSize, number> = {
  3: 6,
  4: 7,
  5: 8,
};

const DAILY_LENGTH_ROTATION: Record<GridSize, number[]> = {
  3: [3, 2, 4, 2, 3, 4],
  4: [4, 3, 2, 4, 3, 5, 2],
  5: [5, 4, 3, 2, 4, 3, 5, 2],
};

const FALLBACK_TEMPLATES: Record<GridSize, string[][]> = {
  3: [
    ["学", "安", "民", "国", "人", "家", "文", "生", "心"],
    ["时", "文", "工", "外", "国", "人", "学", "生", "安"],
    ["中", "平", "水", "力", "学", "人", "天", "家", "名"],
  ],
  4: [
    ["学", "名", "家", "心", "国", "人", "安", "文", "加", "大", "生", "作", "外", "时", "平", "工"],
    ["外", "国", "安", "保", "学", "生", "文", "名", "天", "地", "家", "人", "中", "心", "工", "作"],
    ["平", "民", "水", "力", "学", "时", "人", "外", "大", "文", "生", "安", "国", "家", "名", "心"],
  ],
  5: [
    ["外", "事", "大", "安", "家", "四", "学", "国", "多", "人", "加", "大", "文", "时", "心", "安", "名", "人", "工", "作", "平", "定", "保", "中", "生"],
    ["学", "文", "名", "家", "心", "国", "人", "生", "安", "时", "外", "工", "作", "大", "民", "天", "地", "中", "平", "水", "力", "保", "加", "多", "日"],
    ["中", "外", "学", "生", "心", "国", "家", "名", "安", "保", "文", "时", "工", "作", "人", "天", "地", "平", "民", "力", "大", "多", "水", "子", "日"],
  ],
};

export function createBoard(config: GameConfig, dayKey?: string): BoardState {
  const seedInput =
    dayKey ??
    `${config.mode}-${config.difficulty}-${config.gridSize}-${Date.now()}-${Math.random()}`;
  const baseSeed = hashString(seedInput);

  if (config.mode === "daily" && dayKey) {
    return createDailyBoard(config.gridSize, dayKey, baseSeed);
  }

  return createStandardBoard(config.gridSize, baseSeed);
}

function createStandardBoard(gridSize: GridSize, baseSeed: number): BoardState {
  const trie = getTrie();
  const words = getCandidateWords(gridSize);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const seed = baseSeed + attempt;
    const rng = createRng(seed);
    const chars = Array.from({ length: gridSize ** 2 }, () => "");

    const seededWords = sampleWords(words, Math.max(5, gridSize + 2), rng);
    for (const word of seededWords) {
      placeWord(chars, gridSize, word, rng);
    }

    fillRemainingCells(chars, gridSize, rng);
    const candidate = finalizeBoard(chars, gridSize, trie);
    if (Object.keys(candidate.validWords).length >= MIN_VALID_WORDS[gridSize]) {
      return {
        ...candidate,
        hintPool: Object.values(candidate.validWords)
          .slice(0, 8)
          .map((paths) => paths[0]),
        seed,
      };
    }
  }

  return createFallbackBoard(gridSize, baseSeed);
}

function createDailyBoard(gridSize: GridSize, dayKey: string, seed: number): BoardState {
  const trie = getTrie();
  const primaryWords = selectPrimaryWords(gridSize, dayKey);
  const recentSnapshots = buildRecentSnapshots(gridSize, dayKey);
  let bestCandidate: CandidateBoard | null = null;

  for (let attempt = 0; attempt < DAILY_CANDIDATE_ATTEMPTS; attempt += 1) {
    const attemptSeed = hashString(`${dayKey}-candidate-${attempt}`);
    const rng = createRng(attemptSeed);
    const chars = Array.from({ length: gridSize ** 2 }, () => "");
    const placementPlan = buildPlacementPlan(primaryWords);

    for (const item of placementPlan) {
      placeWord(chars, gridSize, item.word, rng, {
        preferCrossings: true,
        avoidDominantChars: item.uniqueChars,
      });
    }

    fillRemainingCells(chars, gridSize, rng, primaryWords, recentSnapshots);
    applyDailyPerturbation(chars, gridSize, rng, attempt);

    const state = finalizeBoard(chars, gridSize, trie);
    const validWordCount = Object.keys(state.validWords).length;
    if (validWordCount < MIN_VALID_WORDS[gridSize]) {
      continue;
    }

    const profile = buildDailyBoardProfile(state.validWords, chars, primaryWords, recentSnapshots);
    const candidate: CandidateBoard = {
      chars,
      state,
      profile,
    };

    if (!bestCandidate || candidate.profile.scoreBreakdown.total > bestCandidate.profile.scoreBreakdown.total) {
      bestCandidate = candidate;
    }
  }

  if (!bestCandidate) {
    return createFallbackBoard(gridSize, seed, recentSnapshots);
  }

  return {
    ...bestCandidate.state,
    hintPool: Object.values(bestCandidate.state.validWords)
      .slice(0, 8)
      .map((paths) => paths[0]),
    seed,
  };
}

function getCandidateWords(gridSize: GridSize) {
  return getWordList().filter((word) => word.length >= 2 && word.length <= Math.min(6, gridSize + 2));
}

function sampleWords(words: string[], count: number, rng: () => number) {
  const selected = new Set<string>();
  while (selected.size < count) {
    selected.add(words[randomInt(rng, words.length)]);
  }
  return [...selected];
}

function buildPlacementPlan(primaryWords: string[]): PlacementPlan[] {
  const dictionary = getDictionaryIndex();

  return primaryWords
    .map((word) => {
      const wordIndex = dictionary.words.indexOf(word);
      const meta = dictionary.wordMeta[wordIndex];
      return {
        word,
        shapeKey: meta.shapeKey,
        uniqueChars: meta.uniqueChars,
        rarity: 1 / Math.max(1, (dictionary.shapeBuckets[meta.shapeKey] ?? []).length),
      };
    })
    .sort((left, right) => {
      if (right.word.length !== left.word.length) {
        return right.word.length - left.word.length;
      }
      return right.rarity - left.rarity;
    });
}

function selectPrimaryWords(gridSize: GridSize, dayKey: string) {
  const dictionary = getDictionaryIndex();
  const wanted = DAILY_PRIMARY_WORD_COUNT[gridSize];
  const rotation = DAILY_LENGTH_ROTATION[gridSize];
  const selected: number[] = [];
  const usedWordIndexes = new Set<number>();
  const shapeUsage = new Map<string, number>();
  const charUsage = new Map<string, number>();
  const recentSnapshots = buildRecentSnapshots(gridSize, dayKey);
  const recentCharPressure = buildRecentCharPressure(recentSnapshots);

  for (let slot = 0; slot < wanted * 4 && selected.length < wanted; slot += 1) {
    const targetLength = rotation[slot % rotation.length];
    const bucket = dictionary.lengthBuckets[String(Math.min(targetLength, gridSize + 2))] ?? [];
    if (bucket.length === 0) {
      continue;
    }

    const ranked = bucket
      .filter((index) => !usedWordIndexes.has(index))
      .map((index) => {
        const meta = dictionary.wordMeta[index];
        const bannedRecentChars = meta.uniqueChars.filter((char) => isRecentlyBannedChar(char, recentCharPressure));
        if (bannedRecentChars.length >= Math.max(2, meta.uniqueChars.length - 1)) {
          return null;
        }
        const overlapPenalty = meta.uniqueChars.reduce((sum, char) => sum + (charUsage.get(char) ?? 0), 0);
        const shapePenalty = shapeUsage.get(meta.shapeKey) ?? 0;
        const recentCharPenalty = meta.uniqueChars.reduce((sum, char) => sum + getRecentCharPenalty(char, recentCharPressure), 0);
        const recentPenalty = recentSnapshots.reduce((sum, snapshot) => {
          const sharedChars = meta.uniqueChars.filter((char) => snapshot.charSet.has(char)).length;
          return sum + sharedChars * 0.85 + (snapshot.shapeHistogram[meta.shapeKey] ? 1.9 : 0);
        }, 0);
        const lengthBonus = meta.length * 2;
        const uniqueBonus = meta.uniqueChars.length * 1.4;
        const rarityBonus = 4 / Math.max(1, (dictionary.shapeBuckets[meta.shapeKey] ?? []).length);
        return {
          index,
          score:
            lengthBonus +
            uniqueBonus +
            rarityBonus -
            overlapPenalty * 1.7 -
            shapePenalty * 3.5 -
            recentPenalty -
            recentCharPenalty,
        };
      })
      .filter((entry): entry is { index: number; score: number } => entry !== null)
      .sort((left, right) => right.score - left.score);

    if (ranked.length === 0) {
      continue;
    }

    const pickSeed = hashString(`${dayKey}-${targetLength}-${slot}`);
    const pickIndex = Math.min(ranked.length - 1, pickSeed % Math.min(ranked.length, 14));
    const chosen = ranked[pickIndex];
    const meta = dictionary.wordMeta[chosen.index];
    usedWordIndexes.add(chosen.index);
    selected.push(chosen.index);
    shapeUsage.set(meta.shapeKey, (shapeUsage.get(meta.shapeKey) ?? 0) + 1);
    meta.uniqueChars.forEach((char) => charUsage.set(char, (charUsage.get(char) ?? 0) + 1));
  }

  if (selected.length < wanted) {
    const fallback = dictionary.words
      .map((word, index) => ({ word, index }))
      .filter(({ word, index }) => !usedWordIndexes.has(index) && word.length >= 2 && word.length <= gridSize + 2)
      .slice(0, wanted - selected.length);
    fallback.forEach(({ index }) => selected.push(index));
  }

  return selected.map((index) => dictionary.words[index]);
}

function buildRecentSnapshots(gridSize: GridSize, dayKey: string) {
  const snapshots: DailySnapshot[] = [];
  const date = parseDayKeyDate(dayKey);
  if (!date) {
    return snapshots;
  }

  for (let offset = 1; offset <= DAILY_HISTORY_DAYS; offset += 1) {
    const previous = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - offset));
    const previousDayKey = `${formatUtcDate(previous)}-${gridSize}-normal`;
    const primaryWords = selectHistoricalPrimaryWords(gridSize, previousDayKey);
    snapshots.push(buildSnapshotFromWords(primaryWords));
  }

  return snapshots;
}

function selectHistoricalPrimaryWords(gridSize: GridSize, dayKey: string) {
  const dictionary = getDictionaryIndex();
  const wanted = DAILY_PRIMARY_WORD_COUNT[gridSize];
  const rotation = DAILY_LENGTH_ROTATION[gridSize];
  const selected: string[] = [];
  const usedWordIndexes = new Set<number>();

  for (let slot = 0; slot < wanted * 3 && selected.length < wanted; slot += 1) {
    const length = rotation[slot % rotation.length];
    const bucket = dictionary.lengthBuckets[String(Math.min(length, gridSize + 2))] ?? [];
    if (bucket.length === 0) {
      continue;
    }
    const index = bucket[hashString(`${dayKey}-history-${slot}`) % bucket.length];
    if (usedWordIndexes.has(index)) {
      continue;
    }
    usedWordIndexes.add(index);
    selected.push(dictionary.words[index]);
  }

  return selected;
}

function buildSnapshotFromWords(words: string[]): DailySnapshot {
  const dictionary = getDictionaryIndex();
  const charSet = new Set<string>();
  const charFrequency: Record<string, number> = {};
  const lengthHistogram: Record<number, number> = {};
  const shapeHistogram: Record<string, number> = {};

  words.forEach((word) => {
    const index = dictionary.words.indexOf(word);
    if (index === -1) {
      return;
    }
    const meta = dictionary.wordMeta[index];
    meta.uniqueChars.forEach((char) => {
      charSet.add(char);
      charFrequency[char] = (charFrequency[char] ?? 0) + 1;
    });
    lengthHistogram[meta.length] = (lengthHistogram[meta.length] ?? 0) + 1;
    shapeHistogram[meta.shapeKey] = (shapeHistogram[meta.shapeKey] ?? 0) + 1;
  });

  return {
    charSet,
    charFrequency,
    lengthHistogram,
    shapeHistogram,
    primaryHash: hashWords(words),
  };
}

function placeWord(
  chars: string[],
  gridSize: GridSize,
  word: string,
  rng: () => number,
  options?: {
    preferCrossings?: boolean;
    avoidDominantChars?: string[];
  },
) {
  const adjacencyMap = buildAdjacencyMap(gridSize);
  let bestPath: number[] | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let tries = 0; tries < 48; tries += 1) {
    const start = randomInt(rng, chars.length);
    const path = [start];
    const used = new Set(path);
    let cursor = start;
    let ok = true;

    for (let index = 1; index < word.length; index += 1) {
      const optionsForStep = adjacencyMap[cursor].filter((next) => !used.has(next));
      if (optionsForStep.length === 0) {
        ok = false;
        break;
      }
      const next = optionsForStep[randomInt(rng, optionsForStep.length)];
      path.push(next);
      used.add(next);
      cursor = next;
    }

    if (!ok) {
      continue;
    }

    let score = 0;
    for (let index = 0; index < word.length; index += 1) {
      const position = path[index];
      const existing = chars[position];
      if (!existing) {
        score += 1.2;
      } else if (existing === word[index]) {
        score += options?.preferCrossings ? 3.5 : 1.5;
      } else {
        score -= 4;
      }
    }

    if (options?.avoidDominantChars) {
      const hotChars = new Set(options.avoidDominantChars);
      const localPenalty = path.reduce((sum, position) => sum + (chars[position] && hotChars.has(chars[position]) ? 1.2 : 0), 0);
      score -= localPenalty;
    }

    if (score > bestScore) {
      bestScore = score;
      bestPath = path;
    }
  }

  if (!bestPath) {
    return;
  }

  for (let index = 0; index < word.length; index += 1) {
    const position = bestPath[index];
    if (!chars[position] || chars[position] === word[index]) {
      chars[position] = word[index];
    }
  }
}

export function buildAdjacencyMap(gridSize: GridSize) {
  const map: Record<number, number[]> = {};
  const deltas = [-1, 0, 1];

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const index = row * gridSize + col;
      const neighbors: number[] = [];

      for (const dRow of deltas) {
        for (const dCol of deltas) {
          if (dRow === 0 && dCol === 0) {
            continue;
          }
          const nextRow = row + dRow;
          const nextCol = col + dCol;
          if (nextRow < 0 || nextRow >= gridSize || nextCol < 0 || nextCol >= gridSize) {
            continue;
          }
          neighbors.push(nextRow * gridSize + nextCol);
        }
      }

      map[index] = neighbors;
    }
  }

  return map;
}

function solveBoard(
  cells: Cell[],
  adjacencyMap: Record<number, number[]>,
  trie: ReturnType<typeof getTrie>,
) {
  const results: SolverResult = {};
  const byId = new Map(cells.map((cell) => [cell.id, cell]));

  function walk(index: number, prefix: string, node: ReturnType<typeof getTrie>, path: number[], used: Set<number>) {
    const cell = byId.get(index);
    if (!cell) {
      return;
    }

    const nextNode = node.children.get(cell.char);
    if (!nextNode) {
      return;
    }

    const nextPrefix = prefix + cell.char;
    const nextPath = [...path, index];
    const nextUsed = new Set(used);
    nextUsed.add(index);

    if (nextNode.terminal && nextPrefix.length >= 2 && nextPrefix.length <= 6 && !results[nextPrefix]) {
      results[nextPrefix] = [nextPath];
    }

    if (nextPrefix.length >= 6) {
      return;
    }

    for (const neighbor of adjacencyMap[index]) {
      if (nextUsed.has(neighbor)) {
        continue;
      }
      walk(neighbor, nextPrefix, nextNode, nextPath, nextUsed);
    }
  }

  for (const cell of cells) {
    walk(cell.id, "", trie, [], new Set<number>());
  }

  return results;
}

function createFallbackBoard(gridSize: GridSize, seed: number, recentSnapshots: DailySnapshot[] = []): BoardState {
  const trie = getTrie();
  const rng = createRng(seed);
  const fallbackMinWords = Math.max(8, Math.floor(MIN_VALID_WORDS[gridSize] * 0.7));
  let bestCandidate: CandidateBoard | null = null;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const templates = FALLBACK_TEMPLATES[gridSize];
    const template = templates[(seed + attempt) % templates.length];
    const transformedChars = applySymmetryTransform(template, gridSize, (seed + attempt) % 8);
    const candidateChars = shuffleChars([...transformedChars], rng);
    const state = finalizeBoard(candidateChars, gridSize, trie);
    const wordCount = Object.keys(state.validWords).length;
    if (wordCount < fallbackMinWords) {
      continue;
    }

    const primaryWords = Object.keys(state.validWords).slice(0, DAILY_PRIMARY_WORD_COUNT[gridSize]);
    const profile = buildDailyBoardProfile(state.validWords, candidateChars, primaryWords, recentSnapshots);
    const candidate: CandidateBoard = {
      chars: candidateChars,
      state,
      profile,
    };

    if (!bestCandidate || candidate.profile.scoreBreakdown.total > bestCandidate.profile.scoreBreakdown.total) {
      bestCandidate = candidate;
    }
  }

  const resolved = bestCandidate
    ? bestCandidate.state
    : finalizeBoard(applySymmetryTransform(FALLBACK_TEMPLATES[gridSize][seed % FALLBACK_TEMPLATES[gridSize].length], gridSize, seed % 8), gridSize, trie);

  return {
    ...resolved,
    hintPool: Object.values(resolved.validWords)
      .slice(0, 8)
      .map((paths) => paths[0]),
    seed,
  };
}

function finalizeBoard(chars: string[], gridSize: GridSize, trie: ReturnType<typeof getTrie>) {
  return buildBoardStateFromChars(chars, gridSize, trie);
}

function buildBoardStateFromChars(
  chars: string[],
  gridSize: GridSize,
  trie: ReturnType<typeof getTrie>,
) {
  const cells = chars.map<Cell>((char, index) => ({
    id: index,
    row: Math.floor(index / gridSize),
    col: index % gridSize,
    char,
  }));
  const adjacencyMap = buildAdjacencyMap(gridSize);
  const validWords = solveBoard(cells, adjacencyMap, trie);

  return {
    cells,
    adjacencyMap,
    validWords,
  };
}

function fillRemainingCells(
  chars: string[],
  gridSize: GridSize,
  rng: () => number,
  primaryWords: string[] = [],
  recentSnapshots: DailySnapshot[] = [],
) {
  const charUsage = new Map<string, number>();
  chars.forEach((char) => {
    if (char) {
      charUsage.set(char, (charUsage.get(char) ?? 0) + 1);
    }
  });
  const primaryPool = [...new Set(primaryWords.join("").split("").filter(Boolean))];
  const recentCharPressure = buildRecentCharPressure(recentSnapshots);
  const fillerPool = [...COMMON_FILLER_CHARS, ...primaryPool]
    .filter((char, index, list) => list.indexOf(char) === index)
    .filter((char) => !isRecentlyBannedChar(char, recentCharPressure) || primaryPool.includes(char));

  for (let index = 0; index < chars.length; index += 1) {
    if (chars[index]) {
      continue;
    }

    const ranked = fillerPool
      .map((char) => {
        const usagePenalty = (charUsage.get(char) ?? 0) * 1.35;
        const freshnessPenalty = getRecentCharPenalty(char, recentCharPressure);
        const primaryBonus = primaryPool.includes(char) ? 0.8 : 0;
        const uncommonBonus = COMMON_FILLER_CHARS.includes(char) ? 0 : 1.8;
        return {
          char,
          score: primaryBonus + uncommonBonus - usagePenalty - freshnessPenalty + rng() * 0.4,
        };
      })
      .sort((left, right) => right.score - left.score);

    const winner = ranked[Math.min(ranked.length - 1, randomInt(rng, Math.min(3, ranked.length)))];
    chars[index] = winner?.char ?? COMMON_FILLER_CHARS[randomInt(rng, COMMON_FILLER_CHARS.length)];
    charUsage.set(chars[index], (charUsage.get(chars[index]) ?? 0) + 1);
  }

  if (gridSize >= 4 && rng() > 0.45) {
    const swapA = randomInt(rng, chars.length);
    const swapB = randomInt(rng, chars.length);
    [chars[swapA], chars[swapB]] = [chars[swapB], chars[swapA]];
  }
}

function applyDailyPerturbation(chars: string[], gridSize: GridSize, rng: () => number, attempt: number) {
  if (attempt === 0) {
    return;
  }

  if (attempt % 3 === 0) {
    const variant = attempt % 8;
    const transformed = applySymmetryTransform(chars, gridSize, variant);
    transformed.forEach((char, index) => {
      chars[index] = char;
    });
  } else {
    const swaps = 1 + (attempt % Math.max(2, gridSize - 1));
    for (let count = 0; count < swaps; count += 1) {
      const left = randomInt(rng, chars.length);
      const right = randomInt(rng, chars.length);
      [chars[left], chars[right]] = [chars[right], chars[left]];
    }
  }
}

function shuffleChars(chars: string[], rng: () => number) {
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(rng, index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }
  return chars;
}

function applySymmetryTransform(chars: string[], gridSize: GridSize, variant: number) {
  const output = new Array<string>(chars.length);

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const sourceIndex = row * gridSize + col;
      const [nextRow, nextCol] = mapSymmetry(row, col, gridSize, variant);
      output[nextRow * gridSize + nextCol] = chars[sourceIndex];
    }
  }

  return output;
}

function mapSymmetry(row: number, col: number, gridSize: GridSize, variant: number) {
  const last = gridSize - 1;

  switch (variant) {
    case 0:
      return [row, col] as const;
    case 1:
      return [col, last - row] as const;
    case 2:
      return [last - row, last - col] as const;
    case 3:
      return [last - col, row] as const;
    case 4:
      return [row, last - col] as const;
    case 5:
      return [last - row, col] as const;
    case 6:
      return [col, row] as const;
    default:
      return [last - col, last - row] as const;
  }
}

function buildDailyBoardProfile(
  validWords: SolverResult,
  chars: string[],
  primaryWords: string[],
  recentSnapshots: DailySnapshot[],
): DailyBoardProfile {
  const dictionary = getDictionaryIndex();
  const charSet = new Set(chars);
  const lengthHistogram: Record<number, number> = {};
  const shapeHistogram: Record<string, number> = {};

  Object.keys(validWords).forEach((word) => {
    lengthHistogram[word.length] = (lengthHistogram[word.length] ?? 0) + 1;
    const index = dictionary.words.indexOf(word);
    if (index !== -1) {
      const shapeKey = dictionary.wordMeta[index].shapeKey;
      shapeHistogram[shapeKey] = (shapeHistogram[shapeKey] ?? 0) + 1;
    }
  });

  const scoreBreakdown = scoreCandidateBoard(validWords, chars, primaryWords, lengthHistogram, shapeHistogram, recentSnapshots);
  return {
    primaryWords,
    charSet,
    lengthHistogram,
    shapeHistogram,
    scoreBreakdown,
  };
}

function scoreCandidateBoard(
  validWords: SolverResult,
  chars: string[],
  primaryWords: string[],
  lengthHistogram: Record<number, number>,
  shapeHistogram: Record<string, number>,
  recentSnapshots: DailySnapshot[],
): ScoreBreakdown {
  const validWordsList = Object.keys(validWords);
  const totalWords = validWordsList.length;
  const lengthsCovered = [2, 3, 4, 5].filter((length) => (lengthHistogram[length] ?? 0) > 0).length;
  const solvable = Math.min(30, totalWords * 0.55) + lengthsCovered * 2.5;

  const counts = [2, 3, 4, 5].map((length) => lengthHistogram[length] ?? 0);
  const avg = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  const variance = counts.reduce((sum, count) => sum + Math.abs(count - avg), 0) / counts.length;
  const structural = Math.max(0, 22 - variance * 1.3);

  const nearSnapshots = recentSnapshots.slice(0, DAILY_HISTORY_NEAR_DAYS);
  const currentSet = new Set(chars);
  const currentHash = hashWords(primaryWords);
  const currentFrequency = buildCharFrequency(chars);
  const freshnessPenalty = nearSnapshots.reduce((sum, snapshot) => {
    const overlap = [...currentSet].filter((char) => snapshot.charSet.has(char)).length / Math.max(1, currentSet.size);
    const frequencyPenalty = Object.keys(currentFrequency).reduce(
      (acc, char) => acc + Math.min(currentFrequency[char] ?? 0, snapshot.charFrequency[char] ?? 0) * 0.8,
      0,
    );
    return sum + overlap * 15 + frequencyPenalty;
  }, 0);
  const freshness = Math.max(0, 24 - freshnessPenalty);

  const familyPenalty = recentSnapshots.reduce((sum, snapshot) => {
    const shapeOverlap = Object.keys(shapeHistogram).reduce(
      (acc, key) => acc + Math.min(shapeHistogram[key] ?? 0, snapshot.shapeHistogram[key] ?? 0),
      0,
    );
    const hashPenalty = snapshot.primaryHash === currentHash ? 8 : 0;
    return sum + shapeOverlap * 0.65 + hashPenalty;
  }, 0);
  const family = Math.max(0, 16 - familyPenalty);

  const pathVariety = scorePathVariety(validWords);
  const path = Math.min(10, pathVariety);

  const visual = scoreVisualBalance(chars);
  const total = solvable + structural + freshness + family + path + visual;

  return {
    solvable,
    structural,
    freshness,
    family,
    path,
    visual,
    total,
  };
}

function scorePathVariety(validWords: SolverResult) {
  const directions = new Set<string>();

  Object.values(validWords)
    .slice(0, 20)
    .forEach((paths) => {
      const path = paths[0] ?? [];
      for (let index = 1; index < path.length; index += 1) {
        const diff = path[index] - path[index - 1];
        directions.add(String(diff));
      }
    });

  return directions.size * 1.35;
}

function scoreVisualBalance(chars: string[]) {
  const counts = new Map<string, number>();
  chars.forEach((char) => counts.set(char, (counts.get(char) ?? 0) + 1));
  const dominantShare = Math.max(...counts.values()) / chars.length;
  const duplicatePenalty = [...counts.values()].filter((count) => count >= 3).length * 0.7;
  return Math.max(0, 12 - dominantShare * 14 - duplicatePenalty);
}

function buildRecentCharPressure(recentSnapshots: DailySnapshot[]) {
  const charPressure = new Map<string, { nearDays: number; weightedCount: number }>();

  recentSnapshots.forEach((snapshot, index) => {
    const weight = Math.max(1, DAILY_HISTORY_NEAR_DAYS + 1 - index);
    Object.entries(snapshot.charFrequency).forEach(([char, count]) => {
      const current = charPressure.get(char) ?? { nearDays: 0, weightedCount: 0 };
      charPressure.set(char, {
        nearDays: index < DAILY_HISTORY_NEAR_DAYS ? current.nearDays + 1 : current.nearDays,
        weightedCount: current.weightedCount + count * weight,
      });
    });
  });

  return charPressure;
}

function isRecentlyBannedChar(
  char: string,
  recentCharPressure: Map<string, { nearDays: number; weightedCount: number }>,
) {
  const pressure = recentCharPressure.get(char);
  return Boolean(pressure && pressure.nearDays >= DAILY_RECENT_CHAR_BAN_DAYS && pressure.weightedCount >= DAILY_RECENT_CHAR_SOFT_CAP);
}

function getRecentCharPenalty(
  char: string,
  recentCharPressure: Map<string, { nearDays: number; weightedCount: number }>,
) {
  const pressure = recentCharPressure.get(char);
  if (!pressure) {
    return 0;
  }
  const banPenalty = isRecentlyBannedChar(char, recentCharPressure) ? 6 : 0;
  return banPenalty + pressure.weightedCount * 0.75 + pressure.nearDays * 1.2;
}

function buildCharFrequency(chars: string[]) {
  const frequency: Record<string, number> = {};
  chars.forEach((char) => {
    frequency[char] = (frequency[char] ?? 0) + 1;
  });
  return frequency;
}

function hashWords(words: string[]) {
  return hashString(words.slice().sort((left, right) => left.localeCompare(right, "zh-Hans-CN")).join("|")).toString(16);
}

function parseDayKeyDate(dayKey: string) {
  const match = dayKey.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function formatUtcDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getBoardSummary(board: BoardState) {
  const chars = board.cells.map((cell) => cell.char);
  const words = Object.keys(board.validWords);
  const lengthHistogram: Record<number, number> = {};
  words.forEach((word) => {
    lengthHistogram[word.length] = (lengthHistogram[word.length] ?? 0) + 1;
  });

  return {
    chars,
    charSet: new Set(chars),
    words,
    lengthHistogram,
  };
}
