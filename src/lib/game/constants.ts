import type { Achievement, DailyWordInfo, Difficulty, GameConfig, GridSize } from "./types";

export const DIFFICULTY_PRESETS: Record<
  Difficulty,
  Pick<GameConfig, "timeLimitSec" | "targetWordCount">
> = {
  easy: { timeLimitSec: 240, targetWordCount: 15 },
  normal: { timeLimitSec: 180, targetWordCount: 20 },
  hard: { timeLimitSec: 120, targetWordCount: 25 },
};

export const GRID_LABELS: Record<GridSize, string> = {
  3: "入门",
  4: "标准",
  5: "大师",
};

export const MODE_LABELS = {
  daily: "每日挑战",
  practice: "练习模式",
  timed: "计时挑战",
  endless: "无尽挑战",
} as const;

export const SCORE_BY_LENGTH: Record<number, number> = {
  2: 100,
  3: 250,
  4: 500,
  5: 1000,
  6: 1000,
};

export const COMBO_WINDOW_MS = 9_000;

export const MIN_VALID_WORDS: Record<GridSize, number> = {
  3: 18,
  4: 32,
  5: 44,
};

export const COMMON_FILLER_CHARS = [
  "人",
  "大",
  "中",
  "国",
  "学",
  "生",
  "文",
  "日",
  "上",
  "下",
  "天",
  "地",
  "安",
  "家",
  "名",
  "子",
  "时",
  "多",
  "外",
  "工",
  "作",
  "事",
  "民",
  "平",
  "力",
  "保",
  "加",
  "电",
  "心",
  "水",
];

export const DAILY_WORD_BANK: DailyWordInfo[] = [
  { word: "思念", pinyin: "si nian", translation: "to miss someone; longing; yearning", source: "local" },
  { word: "外语", pinyin: "wai yu", translation: "foreign language", source: "local" },
  { word: "中国", pinyin: "zhong guo", translation: "China", source: "local" },
  { word: "学习", pinyin: "xue xi", translation: "to study; to learn", source: "local" },
  { word: "安全", pinyin: "an quan", translation: "safe; secure", source: "local" },
  { word: "文明", pinyin: "wen ming", translation: "civilization; civilized", source: "local" },
  { word: "时间", pinyin: "shi jian", translation: "time", source: "local" },
  { word: "平安", pinyin: "ping an", translation: "safe and sound", source: "local" },
  { word: "国家", pinyin: "guo jia", translation: "country; nation", source: "local" },
  { word: "朋友", pinyin: "peng you", translation: "friend", source: "local" },
  { word: "工作", pinyin: "gong zuo", translation: "work; job", source: "local" },
  { word: "生活", pinyin: "sheng huo", translation: "life; to live", source: "local" },
  { word: "老师", pinyin: "lao shi", translation: "teacher", source: "local" },
  { word: "语言", pinyin: "yu yan", translation: "language", source: "local" },
];

export const ACHIEVEMENT_DEFS: Achievement[] = [
  {
    id: "first-word",
    label: "开笔成词",
    description: "首次成功找出一个词语",
  },
  {
    id: "five-words",
    label: "词感升温",
    description: "单局累计找到 5 个词语",
  },
  {
    id: "ten-words",
    label: "十词入流",
    description: "单局累计找到 10 个词语",
  },
  {
    id: "combo-3",
    label: "三段连锋",
    description: "连续命中 3 个有效词语",
  },
  {
    id: "combo-5",
    label: "连词如雨",
    description: "连续命中 5 个有效词语",
  },
  {
    id: "long-word",
    label: "长词捕手",
    description: "找到一个 5 字或更长的词语",
  },
  {
    id: "score-3000",
    label: "手感正热",
    description: "单局得分达到 3000 分",
  },
  {
    id: "score-8000",
    label: "高分冲线",
    description: "单局得分达到 8000 分",
  },
  {
    id: "speed-run",
    label: "疾风起势",
    description: "开局 15 秒内找到首个词语",
  },
  {
    id: "daily-finish",
    label: "今日应答",
    description: "完成一次每日挑战",
  },
  {
    id: "practice-finish",
    label: "静练有成",
    description: "完成一次练习模式",
  },
  {
    id: "master-grid",
    label: "大盘驾驭",
    description: "完成一局 5×5 大师盘面",
  },
  {
    id: "perfect-clear",
    label: "全盘细搜",
    description: "完成目标词数并取得高完成度",
  },
  {
    id: "daily-streak",
    label: "日日不空",
    description: "累计完成 3 次每日挑战",
  },
];
