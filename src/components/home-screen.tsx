"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Modal } from "./modal";
import { ACHIEVEMENT_DEFS, GRID_LABELS } from "@/lib/game/constants";
import { buildGameConfig } from "@/lib/game/config";
import { getLocalDailyWord } from "@/lib/game/dictionary";
import { getTodayKey } from "@/lib/game/format";
import { readAchievements, readDailyDone, readEndlessStats, readHistory } from "@/lib/game/storage";
import { buildShareAsset, buildShareText } from "@/lib/game/share";
import type { Achievement, DailyWordInfo, Difficulty, EndlessStats, GridSize, HistoryEntry } from "@/lib/game/types";

const difficulties: { id: Difficulty; label: string; note: string }[] = [
  { id: "easy", label: "简单", note: "240秒 · 最低15词" },
  { id: "normal", label: "普通", note: "180秒 · 最低20词" },
  { id: "hard", label: "困难", note: "120秒 · 最低25词" },
];

const grids: { id: GridSize; icon: string; note: string }[] = [
  { id: 3, icon: "芽", note: "3×3 · 轻松入门" },
  { id: 4, icon: "拼", note: "4×4 · 经典模式" },
  { id: 5, icon: "冠", note: "5×5 · 高手挑战" },
];

export function HomeScreen() {
  const isClient = typeof window !== "undefined";
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [history] = useState<HistoryEntry[]>(() => (isClient ? readHistory() : []));
  const [achievements] = useState<Achievement[]>(() => (isClient ? readAchievements() : ACHIEVEMENT_DEFS));
  const [showHelp, setShowHelp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [dailyDone] = useState(() => (isClient ? readDailyDone(getTodayKey()) : false));
  const [endlessStats] = useState<EndlessStats>(() => (isClient ? readEndlessStats() : { totalClears: 0, bestRun: 0 }));
  const [dailyWordInfo, setDailyWordInfo] = useState<DailyWordInfo>(() =>
    getLocalDailyWord(getTodayKey()),
  );

  useEffect(() => {
    let active = true;

    async function loadDailyWordInfo() {
      try {
        const response = await fetch("/api/daily-word", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as DailyWordInfo;
        if (active) {
          setDailyWordInfo(payload);
        }
      } catch {
        // Keep local fallback silently.
      }
    }

    void loadDailyWordInfo();
    return () => {
      active = false;
    };
  }, []);

  const config = buildGameConfig("timed", difficulty, gridSize);
  const unlockedCount = achievements.filter((item) => item.unlockedAt).length;
  const bestScore = history.reduce((best, item) => Math.max(best, item.score), 0);
  const displayUnlockedCount = hydrated ? unlockedCount : 0;
  const displayHistoryCount = hydrated ? history.length : 0;
  const displayDailyDone = hydrated ? dailyDone : false;
  const displayBestScore = hydrated ? bestScore : 0;
  const displayEndlessTotalClears = hydrated ? endlessStats.totalClears : 0;
  const displayEndlessBestRun = hydrated ? endlessStats.bestRun : 0;

  return (
    <main className="soft-grid min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[1280px] flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.06fr)_400px] xl:grid-cols-[minmax(0,1.02fr)_430px]">
        <section className="card-surface panel-outline rounded-[32px] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-100 pb-5">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-amber-500">Chinese Wordament</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-800 sm:text-5xl">
                汉谜达人
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
                用相邻汉字滑出词语。
              </p>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-white/80 px-4 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">词典基座</p>
              <p className="mt-1 text-lg font-semibold text-slate-700">CC-CEDICT 10万+词</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5">
            <div className="rounded-[24px] border border-orange-300 bg-white/90 p-5 shadow-[0_10px_26px_rgba(255,138,0,0.09)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-orange-500">每日挑战</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-800">每天同一题，180 秒冲刺</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    固定种子生成，今天{displayDailyDone ? "已完成" : "还没打卡"}。
                  </p>
                </div>
                <Link
                  href="/play?mode=daily&difficulty=normal&grid=4"
                  className="rounded-2xl bg-linear-to-r from-orange-500 to-amber-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(255,138,0,0.25)] transition hover:translate-y-[-1px]"
                >
                  开始每日题
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {difficulties.map((item) => {
                const active = difficulty === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDifficulty(item.id)}
                    className={`rounded-[22px] border p-4 text-left transition ${
                      active
                        ? "border-emerald-300 bg-emerald-50 shadow-[0_10px_30px_rgba(66,198,146,0.18)]"
                        : "border-white/70 bg-white/80 hover:border-amber-200 hover:bg-white"
                    }`}
                  >
                    <div className="text-xl font-bold text-slate-800">{item.label}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.note}</div>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {grids.map((item) => {
                const active = gridSize === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGridSize(item.id)}
                    className={`rounded-[24px] border p-4 text-left transition ${
                      active
                        ? "border-amber-300 bg-amber-50 shadow-[0_12px_34px_rgba(255,186,73,0.18)]"
                        : "border-white/70 bg-white/80 hover:border-amber-200 hover:bg-white"
                    }`}
                  >
                    <div className="text-sm uppercase tracking-[0.2em] text-slate-400">{GRID_LABELS[item.id]}</div>
                    <div className="mt-2 text-2xl font-black text-slate-800">{item.icon}</div>
                    <div className="mt-2 text-sm text-slate-500">{item.note}</div>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Link
                href={`/play?mode=timed&difficulty=${difficulty}&grid=${gridSize}`}
                className="flex min-h-16 items-center justify-center rounded-[22px] bg-linear-to-r from-orange-500 via-orange-400 to-amber-300 px-6 text-xl font-bold text-white shadow-[0_20px_40px_rgba(255,138,0,0.22)] transition hover:translate-y-[-1px]"
              >
                开始游戏
              </Link>
              <Link
                href={`/play?mode=practice&difficulty=${difficulty}&grid=${gridSize}`}
                className="flex min-h-16 items-center justify-center rounded-[22px] border border-emerald-300 bg-white/88 px-6 text-base font-semibold text-slate-700 transition hover:bg-emerald-50"
              >
                练习模式
              </Link>
              <Link
                href="/play?mode=endless"
                className="flex min-h-16 items-center justify-center rounded-[22px] border border-slate-900/10 bg-linear-to-r from-slate-900 to-slate-700 px-6 text-base font-semibold !text-white shadow-[0_18px_36px_rgba(15,23,42,0.2)] transition hover:translate-y-[-1px] hover:!text-white focus-visible:!text-white"
              >
                无尽挑战
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setShowAchievements(true)}
                className="rounded-[18px] border border-amber-100 bg-white/80 px-4 py-4 text-left transition hover:bg-white"
              >
                <div className="text-sm text-slate-400">成就</div>
                <div className="mt-1 text-lg font-semibold text-slate-800">
                  {displayUnlockedCount}/{ACHIEVEMENT_DEFS.length}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="rounded-[18px] border border-amber-100 bg-white/80 px-4 py-4 text-left transition hover:bg-white"
              >
                <div className="text-sm text-slate-400">玩法</div>
                <div className="mt-1 text-lg font-semibold text-slate-800">查看规则</div>
              </button>
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className="rounded-[18px] border border-amber-100 bg-white/80 px-4 py-4 text-left transition hover:bg-white"
              >
                <div className="text-sm text-slate-400">历史记录</div>
                <div className="mt-1 text-lg font-semibold text-slate-800">{displayHistoryCount} 局</div>
              </button>
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-5">
          <section className="card-surface panel-outline rounded-[30px] p-5">
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-500">今日词语</p>
              <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                {getTodayKey().replaceAll("-", ".")}
              </div>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-[136px_minmax(0,1fr)] xl:items-center">
              <div className="rounded-[22px] bg-linear-to-br from-slate-50 to-white px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Word</div>
                <h2 className="mt-3 text-5xl font-black leading-none tracking-tight text-slate-800 xl:text-[3.35rem]">
                  {dailyWordInfo.word}
                </h2>
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                <div className="rounded-2xl border border-amber-100 bg-white/72 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Pinyin</div>
                  <div className="mt-2 text-base font-medium italic text-slate-600 xl:min-h-[52px] xl:content-center">
                    {dailyWordInfo.pinyin}
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-white/72 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Meaning</div>
                  <div className="mt-2 text-base leading-6 text-slate-600 xl:min-h-[52px] xl:content-center">
                    {dailyWordInfo.translation}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="card-surface panel-outline rounded-[30px] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">本轮配置</p>
            <div className="mt-4 grid gap-3">
              <InfoRow label="难度" value={difficulties.find((item) => item.id === difficulty)?.label ?? "普通"} />
              <InfoRow label="网格" value={`${gridSize}×${gridSize} · ${GRID_LABELS[gridSize]}`} />
              <InfoRow label="时限" value={config.timeLimitSec ? `${config.timeLimitSec} 秒` : "不限时"} />
              <InfoRow label="目标" value={`${config.targetWordCount} 个词语`} />
              <InfoRow label="最佳分" value={displayBestScore ? `${displayBestScore} 分` : "还没有"} />
              <InfoRow label="累计通关" value={displayEndlessTotalClears ? `${displayEndlessTotalClears} 盘` : "0 盘"} />
              <InfoRow label="无尽最佳" value={displayEndlessBestRun ? `${displayEndlessBestRun} 盘` : "0 盘"} />
            </div>
          </section>
        </aside>
      </div>

      <Modal open={showHelp} onClose={() => setShowHelp(false)} title="玩法说明" subtitle="仔细阅读，才能成为汉谜达人">
        <ul className="grid gap-3 text-sm leading-7 text-slate-600">
          <li>在汉字网格中拖动连接相邻汉字，横竖斜都算相邻。</li>
          <li>组成词典中的有效词语即可得分，同一路径不能重复经过同一格。</li>
          <li>连续找到词语会触发连击加成，词语越长分数越高，最高按 6 字判定。</li>
          <li>快捷键：H 提示、R 再来一局、Esc 退出。移动端有对应按钮。</li>
        </ul>
      </Modal>

      <Modal open={showHistory} onClose={() => setShowHistory(false)} title="历史记录" subtitle="本地保存最近 20 局结果">
        <div className="grid gap-3">
          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-200 px-4 py-8 text-center text-sm text-slate-500">
              还没有对局记录，先开始一局吧。
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="rounded-2xl border border-amber-100 bg-white/80 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <strong className="text-slate-800">{item.score} 分</strong>
                  <span className="text-sm text-slate-500">{item.playedAt.slice(0, 10)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {item.mode === "daily" ? "每日挑战" : item.mode === "practice" ? "练习模式" : "计时挑战"} ·{" "}
                  {item.gridSize}×{item.gridSize} · 找到 {item.foundCount} 个词
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const asset = await buildShareAsset(item);
                      const shareFiles = typeof File !== "undefined" ? [new File([asset.blob], asset.fileName, { type: asset.blob.type })] : undefined;
                      if (typeof navigator !== "undefined" && "share" in navigator) {
                        const supportsFiles = typeof navigator.canShare === "function" && shareFiles ? navigator.canShare({ files: shareFiles }) : false;
                        if (shareFiles && supportsFiles) {
                          await navigator.share({
                            title: "汉谜达人",
                            text: buildShareText(item),
                            url: window.location.origin,
                            files: shareFiles,
                          });
                          return;
                        }
                      }

                      const url = URL.createObjectURL(asset.blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = asset.fileName;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
                    } catch {
                      // Keep history sharing silent on failure.
                    }
                  }}
                  className="mt-3 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-amber-50"
                >
                  分享本局
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal
        open={showAchievements}
        onClose={() => setShowAchievements(false)}
        title="成就殿堂"
        subtitle={`已解锁 ${displayUnlockedCount} / ${ACHIEVEMENT_DEFS.length}`}
      >
        <div className="grid gap-2.5 sm:gap-3">
          {achievements.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border px-4 py-4 ${
                item.unlockedAt
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-100 bg-white/80"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="text-base text-slate-800 sm:text-[1.05rem]">{item.label}</strong>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">{item.description}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-slate-500">
                  {item.unlockedAt ? "已解锁" : "锁定"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-amber-100 bg-white/70 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-700">{value}</span>
    </div>
  );
}
