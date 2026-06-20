import { ACHIEVEMENT_DEFS } from "./constants";
import type { Achievement, EndlessStats, HistoryEntry, SettingsState } from "./types";

const STORAGE_KEYS = {
  settings: "hanmi-settings",
  history: "hanmi-history",
  achievements: "hanmi-achievements",
  dailyDone: "hanmi-daily-done",
  endlessStats: "hanmi-endless-stats",
} as const;

export const defaultSettings: SettingsState = {
  soundEnabled: true,
  reduceMotion: false,
};

export function readSettings() {
  return readJson<SettingsState>(STORAGE_KEYS.settings, defaultSettings);
}

export function writeSettings(settings: SettingsState) {
  writeJson(STORAGE_KEYS.settings, settings);
}

export function readHistory() {
  return readJson<HistoryEntry[]>(STORAGE_KEYS.history, []);
}

export function pushHistory(entry: HistoryEntry) {
  const next = [entry, ...readHistory()].slice(0, 20);
  writeJson(STORAGE_KEYS.history, next);
}

export function readAchievements() {
  return readJson<Achievement[]>(STORAGE_KEYS.achievements, ACHIEVEMENT_DEFS);
}

export function writeAchievements(achievements: Achievement[]) {
  writeJson(STORAGE_KEYS.achievements, achievements);
}

export function readDailyDone(dayKey: string) {
  const done = readJson<Record<string, boolean>>(STORAGE_KEYS.dailyDone, {});
  return Boolean(done[dayKey]);
}

export function writeDailyDone(dayKey: string) {
  const done = readJson<Record<string, boolean>>(STORAGE_KEYS.dailyDone, {});
  done[dayKey] = true;
  writeJson(STORAGE_KEYS.dailyDone, done);
}

const defaultEndlessStats: EndlessStats = {
  totalClears: 0,
  bestRun: 0,
};

export function readEndlessStats() {
  return readJson<EndlessStats>(STORAGE_KEYS.endlessStats, defaultEndlessStats);
}

export function writeEndlessStats(stats: EndlessStats) {
  writeJson(STORAGE_KEYS.endlessStats, stats);
}

function readJson<T>(key: string, fallback: T) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = readCookie(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }
  writeCookie(key, JSON.stringify(value));
}

function readCookie(key: string) {
  const target = `${encodeURIComponent(key)}=`;
  const parts = document.cookie.split("; ");

  for (const part of parts) {
    if (part.startsWith(target)) {
      return decodeURIComponent(part.slice(target.length));
    }
  }

  return null;
}

function writeCookie(key: string, value: string) {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = [
    `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    `expires=${expires.toUTCString()}`,
    "path=/",
    "SameSite=Lax",
  ].join("; ");
}
