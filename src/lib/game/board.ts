import { COMMON_FILLER_CHARS, MIN_VALID_WORDS } from "./constants";
import { getTrie, getWordList } from "./dictionary";
import { createRng, hashString, randomInt } from "./seed";
import type { BoardState, Cell, GameConfig, GridSize } from "./types";

type SolverResult = Record<string, number[][]>;

export function createBoard(config: GameConfig, dayKey?: string): BoardState {
  const seedInput =
    dayKey ??
    `${config.mode}-${config.difficulty}-${config.gridSize}-${Date.now()}-${Math.random()}`;
  const baseSeed = hashString(seedInput);
  const trie = getTrie();
  const words = getCandidateWords(config.gridSize);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const seed = baseSeed + attempt;
    const rng = createRng(seed);
    const chars = Array.from({ length: config.gridSize ** 2 }, () => "");

    const seededWords = sampleWords(words, Math.max(5, config.gridSize + 2), rng);
    for (const word of seededWords) {
      placeWord(chars, config.gridSize, word, rng);
    }

    for (let index = 0; index < chars.length; index += 1) {
      if (!chars[index]) {
        chars[index] = COMMON_FILLER_CHARS[randomInt(rng, COMMON_FILLER_CHARS.length)];
      }
    }

    const { cells, adjacencyMap, validWords } = buildBoardStateFromChars(chars, config.gridSize, trie);
    const foundWords = Object.keys(validWords);

    if (foundWords.length >= MIN_VALID_WORDS[config.gridSize]) {
      return {
        cells,
        adjacencyMap,
        validWords,
        hintPool: Object.values(validWords)
          .slice(0, 8)
          .map((paths) => paths[0]),
        seed,
      };
    }
  }

  return createFallbackBoard(config.gridSize, baseSeed);
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

function placeWord(chars: string[], gridSize: GridSize, word: string, rng: () => number) {
  const adjacencyMap = buildAdjacencyMap(gridSize);

  for (let tries = 0; tries < 36; tries += 1) {
    const start = randomInt(rng, chars.length);
    const path = [start];
    const used = new Set(path);
    let cursor = start;
    let ok = true;

    for (let index = 1; index < word.length; index += 1) {
      const options = adjacencyMap[cursor].filter((next) => !used.has(next));
      if (options.length === 0) {
        ok = false;
        break;
      }
      const next = options[randomInt(rng, options.length)];
      path.push(next);
      used.add(next);
      cursor = next;
    }

    if (!ok) {
      continue;
    }

    for (let index = 0; index < word.length; index += 1) {
      const position = path[index];
      if (!chars[position] || chars[position] === word[index]) {
        chars[position] = word[index];
      }
    }
    return;
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

function createFallbackBoard(gridSize: GridSize, seed: number): BoardState {
  const preset =
    gridSize === 3
      ? ["保", "中", "外", "人", "人", "国", "大", "大", "名"]
      : gridSize === 4
        ? ["学", "名", "学", "力", "国", "大", "人", "名", "加", "大", "人", "家", "外", "国", "安", "保"]
        : [
            "外",
            "事",
            "大",
            "大",
            "四",
            "事",
            "国",
            "多",
            "加",
            "大",
            "安",
            "多",
            "大",
            "大",
            "人",
            "南",
            "安",
            "国",
            "人",
            "家",
            "平",
            "定",
            "保",
            "中",
            "子",
          ];

  const trie = getTrie();
  const rng = createRng(seed);
  const fallbackMinWords = Math.max(8, Math.floor(MIN_VALID_WORDS[gridSize] * 0.7));

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const shuffledChars = shuffleChars([...preset], rng);
    const candidate = buildBoardStateFromChars(shuffledChars, gridSize, trie);
    if (Object.keys(candidate.validWords).length >= fallbackMinWords) {
      return {
        ...candidate,
        hintPool: Object.values(candidate.validWords)
          .slice(0, 8)
          .map((paths) => paths[0]),
        seed,
      };
    }
  }

  const transformedChars = applySymmetryTransform(preset, gridSize, seed % 8);
  const { cells, adjacencyMap, validWords } = buildBoardStateFromChars(transformedChars, gridSize, trie);

  return {
    cells,
    adjacencyMap,
    validWords,
    hintPool: Object.values(validWords)
      .slice(0, 8)
      .map((paths) => paths[0]),
    seed,
  };
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
