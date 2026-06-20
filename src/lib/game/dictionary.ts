import dictionaryData from "@/data/dictionary.generated.json";
import { DAILY_WORD_BANK } from "./constants";
import type { DailyWordInfo, DictionaryIndex } from "./types";

type TrieNode = {
  children: Map<string, TrieNode>;
  terminal: boolean;
};

let cachedTrie: TrieNode | null = null;

export function getDictionaryIndex(): DictionaryIndex {
  return dictionaryData as DictionaryIndex;
}

export function getWordList() {
  return getDictionaryIndex().words;
}

export function buildTrie(words: string[]) {
  if (cachedTrie) {
    return cachedTrie;
  }

  const root: TrieNode = {
    children: new Map(),
    terminal: false,
  };

  for (const word of words) {
    let node = root;
    for (const char of word) {
      const next = node.children.get(char) ?? {
        children: new Map<string, TrieNode>(),
        terminal: false,
      };
      node.children.set(char, next);
      node = next;
    }
    node.terminal = true;
  }

  cachedTrie = root;
  return root;
}

export function getTrie() {
  return buildTrie(getWordList());
}

export function pickDailyWord(dayKey: string) {
  const words = DAILY_WORD_BANK;
  const seed = Array.from(dayKey).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return words[seed % words.length];
}

export function getLocalDailyWord(dayKey: string): DailyWordInfo {
  return pickDailyWord(dayKey);
}
