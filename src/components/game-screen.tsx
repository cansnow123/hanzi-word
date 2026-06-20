"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Modal } from "./modal";
import { evaluateAchievements } from "@/lib/game/achievements";
import { createBoard } from "@/lib/game/board";
import { GRID_LABELS, MODE_LABELS } from "@/lib/game/constants";
import { formatPercent, formatTimer, getTodayKey } from "@/lib/game/format";
import { getBaseScore, getComboMultiplier } from "@/lib/game/scoring";
import { buildShareAsset, buildShareText, getShareImageAlt } from "@/lib/game/share";
import {
  pushHistory,
  readAchievements,
  readEndlessStats,
  readSettings,
  writeAchievements,
  writeDailyDone,
  writeEndlessStats,
  writeSettings,
} from "@/lib/game/storage";
import type { BoardState, EndlessStats, FoundWord, GameConfig, HistoryEntry, SettingsState } from "@/lib/game/types";

type Props = {
  initialConfig: GameConfig;
};

type FeedbackTone = "neutral" | "success" | "error" | "hint" | "combo";

export function GameScreen({ initialConfig }: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [settings, setSettings] = useState<SettingsState>(() => readSettings());
  const [board, setBoard] = useState<BoardState>(() =>
    createBoard(initialConfig, initialConfig.mode === "daily" ? getDailySeed(initialConfig) : undefined),
  );
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [selectedPath, setSelectedPath] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(initialConfig.timeLimitSec);
  const [message, setMessage] = useState("在网格中滑动连接汉字，找到词语吧。");
  const [messageTone, setMessageTone] = useState<FeedbackTone>("neutral");
  const [showExit, setShowExit] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [hintedPath, setHintedPath] = useState<number[] | null>(null);
  const [pointerDown, setPointerDown] = useState(false);
  const [finishStamp, setFinishStamp] = useState<number | null>(null);
  const [sessionClears, setSessionClears] = useState(0);
  const [endlessStats, setEndlessStats] = useState<EndlessStats>(() => readEndlessStats());
  const [isAdvancingBoard, setIsAdvancingBoard] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const advanceTimerRef = useRef<number | null>(null);
  const [pathPoints, setPathPoints] = useState<{ x: number; y: number }[]>([]);
  const [boardPulse, setBoardPulse] = useState<"idle" | "success" | "error" | "hint">("idle");
  const [boardPulseNonce, setBoardPulseNonce] = useState(0);
  const [shareStatus, setShareStatus] = useState("分享卡片已准备好。");
  const [shareBusy, setShareBusy] = useState(false);
  const [sharePreview, setSharePreview] = useState<string | null>(null);
  const sharePreviewUrlRef = useRef<string | null>(null);
  const isEndlessMode = config.mode === "endless";
  const totalWords = Object.keys(board.validWords).length;
  const endlessCleared = isEndlessMode && !showResult && !finishStamp && totalWords > 0 && foundWords.length === totalWords;
  const standardCleared = !isEndlessMode && !showResult && !finishStamp && totalWords > 0 && foundWords.length === totalWords;

  const completionRate = useMemo(() => {
    const total = totalWords || config.targetWordCount;
    return total > 0 ? Math.min(100, (foundWords.length / total) * 100) : 0;
  }, [config.targetWordCount, foundWords.length, totalWords]);

  const boardPrefixes = useMemo(() => {
    const prefixes = new Set<string>();
    Object.keys(board.validWords).forEach((word) => {
      for (let index = 1; index <= word.length; index += 1) {
        prefixes.add(word.slice(0, index));
      }
    });
    return prefixes;
  }, [board.validWords]);

  const currentPathText = useMemo(
    () => selectedPath.map((id) => board.cells[id]?.char ?? "").join(""),
    [board.cells, selectedPath],
  );
  const livePathInvalid =
    selectedPath.length >= 2 &&
    currentPathText.length >= 2 &&
    !boardPrefixes.has(currentPathText);

  const boardWidthClass =
    config.gridSize === 3
      ? "max-w-[338px]"
      : config.gridSize === 4
        ? "max-w-[448px]"
        : "max-w-[560px]";
  const cellTextClass =
    config.gridSize === 3
      ? "text-[clamp(2.85rem,7vw,3.55rem)]"
      : config.gridSize === 4
        ? "text-[clamp(2.55rem,5.5vw,3.2rem)]"
        : "text-[clamp(2.15rem,4.35vw,2.85rem)]";
  const cellFontSize =
    config.gridSize === 3
      ? "clamp(2.85rem, 7vw, 3.55rem)"
      : config.gridSize === 4
        ? "clamp(2.55rem, 5.5vw, 3.2rem)"
        : "clamp(2.15rem, 4.35vw, 2.85rem)";

  useLayoutEffect(() => {
    const boardElement = boardRef.current;
    if (!boardElement || selectedPath.length === 0) {
      setPathPoints([]);
      return;
    }

    const boardRect = boardElement.getBoundingClientRect();
    const points = selectedPath
      .map((id) => {
        const element = cellRefs.current[id];
        if (!element) {
          return null;
        }
        const rect = element.getBoundingClientRect();
        return {
          x: rect.left - boardRect.left + rect.width / 2,
          y: rect.top - boardRect.top + rect.height / 2,
        };
      })
      .filter((point): point is { x: number; y: number } => point !== null);

    setPathPoints(points);
  }, [selectedPath, config.gridSize]);

  useEffect(() => {
    if (boardPulse === "idle") {
      return;
    }

    const timer = window.setTimeout(() => {
      setBoardPulse("idle");
    }, boardPulse === "error" ? 420 : 320);

    return () => window.clearTimeout(timer);
  }, [boardPulse, boardPulseNonce]);

  const setFeedback = useCallback((text: string, tone: FeedbackTone) => {
    setMessage(text);
    setMessageTone(tone);
  }, []);

  const pulseBoard = useCallback((tone: "success" | "error" | "hint") => {
    setBoardPulse(tone);
    setBoardPulseNonce((current) => current + 1);
  }, []);

  const resolveCellFromPointer = useCallback((clientX: number, clientY: number) => {
    const target = document.elementFromPoint(clientX, clientY);
    const cellButton = target instanceof HTMLElement ? target.closest<HTMLButtonElement>("[data-cell-id]") : null;
    if (!cellButton) {
      return null;
    }

    const cellId = Number(cellButton.dataset.cellId);
    return Number.isNaN(cellId) ? null : cellId;
  }, []);

  const restartGame = useCallback((nextConfig = config) => {
    const seed = nextConfig.mode === "daily" ? getDailySeed(nextConfig) : undefined;
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setConfig(nextConfig);
    setBoard(createBoard(nextConfig, seed));
    setFoundWords([]);
    setSelectedPath([]);
    setHintedPath(null);
    setScore(0);
    setSecondsLeft(nextConfig.timeLimitSec);
    setSessionClears(0);
    setIsAdvancingBoard(false);
    setFeedback(nextConfig.mode === "endless" ? "无尽挑战开始，180 秒内尽可能多清几盘。" : "新盘面已准备好，开始找词吧。", "neutral");
    setShowExit(false);
    setShowResult(false);
    setFinishStamp(null);
    setBoardPulse("idle");
  }, [config, setFeedback]);

  const revealHint = useCallback(() => {
    if (isEndlessMode) {
      return;
    }
    const remaining = Object.entries(board.validWords).find(
      ([word]) => !foundWords.some((item) => item.text === word),
    );

    if (!remaining) {
      setFeedback("当前盘面没有更多未发现词语了。", "neutral");
      return;
    }

    const path = remaining[1][0];
    setHintedPath(path.slice(0, 1));
    setFeedback("提示只亮起未找到词语的起始字，继续从相邻方向尝试。", "hint");
    pulseBoard("hint");
  }, [board.validWords, foundWords, isEndlessMode, pulseBoard, setFeedback]);

  const finishGame = useCallback(() => {
    if (finishStamp) {
      return;
    }
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    const finishedAt = Date.now();
    setFinishStamp(finishedAt);
    setShowResult(true);
    setIsAdvancingBoard(false);

    const result = {
      score,
      foundCount: foundWords.length,
      completionRate,
      durationSec: config.timeLimitSec === 0 ? 0 : config.timeLimitSec - secondsLeft,
      completedTarget: isEndlessMode ? foundWords.length >= totalWords : foundWords.length >= config.targetWordCount,
      mode: config.mode,
      gridSize: config.gridSize,
      difficulty: config.difficulty,
      playedAt: new Date(finishedAt).toISOString(),
      endlessClears: isEndlessMode ? sessionClears : undefined,
    };

    const historyEntry: HistoryEntry = {
      ...result,
      id: `${result.playedAt}-${score}-${sessionClears}`,
    };
    pushHistory(historyEntry);

    const achievements = evaluateAchievements(readAchievements(), result, foundWords, config);
    writeAchievements(achievements.achievements);
    if (config.mode === "daily") {
      writeDailyDone(getTodayKey());
    }
  }, [completionRate, config, finishStamp, foundWords, isEndlessMode, score, secondsLeft, sessionClears, totalWords]);

  const submitCurrentPath = useCallback(() => {
    setPointerDown(false);
    if (selectedPath.length < 2) {
      setSelectedPath([]);
      return;
    }

    const text = selectedPath.map((id) => board.cells[id]?.char ?? "").join("");
    const entry = board.validWords[text];
    const exists = foundWords.some((item) => item.text === text);

    if (!entry || exists) {
      setFeedback(exists ? `“${text}” 已经找到过了。` : `“${text}” 不能作为有效词提交。`, "error");
      pulseBoard("error");
      setSelectedPath([]);
      return;
    }

    const foundAt = Date.now();
    const comboMultiplier = getComboMultiplier(foundWords, foundAt);
    const scoreGain = Math.round(getBaseScore(text.length) * comboMultiplier);
    const nextWord: FoundWord = {
      text,
      path: selectedPath,
      length: text.length,
      score: scoreGain,
      foundAt,
      comboMultiplier,
    };

    const nextFound = [nextWord, ...foundWords].sort((a, b) => b.foundAt - a.foundAt);
    setFoundWords(nextFound);
    setScore((current) => current + scoreGain);
    if (!isEndlessMode) {
      setHintedPath(null);
    }
    setFeedback(
      comboMultiplier > 1
        ? `找到“${text}”，连击加成生效，+${scoreGain} 分。`
        : `找到“${text}”，获得 ${scoreGain} 分。`,
      comboMultiplier > 1 ? "combo" : "success",
    );
    pulseBoard("success");
    setSelectedPath([]);
  }, [board.cells, board.validWords, foundWords, isEndlessMode, pulseBoard, selectedPath, setFeedback]);

  const advanceEndlessBoard = useCallback(() => {
    if (!endlessCleared || isAdvancingBoard) {
      return;
    }

    const nextClears = sessionClears + 1;
    const nextStats = {
      totalClears: endlessStats.totalClears + 1,
      bestRun: Math.max(endlessStats.bestRun, nextClears),
    };

    setSessionClears(nextClears);
    setEndlessStats(nextStats);
    writeEndlessStats(nextStats);
    setIsAdvancingBoard(true);
    setHintedPath(null);
    setSelectedPath([]);
    setFeedback(`第 ${nextClears} 盘完成，下一盘生成中。`, "success");
    pulseBoard("success");

    advanceTimerRef.current = window.setTimeout(() => {
      setBoard(createBoard(config));
      setFoundWords([]);
      setSelectedPath([]);
      setHintedPath(null);
      setIsAdvancingBoard(false);
      setFeedback(`已进入第 ${nextClears + 1} 盘，继续冲刺。`, "neutral");
      advanceTimerRef.current = null;
    }, 900);
  }, [config, endlessCleared, endlessStats, isAdvancingBoard, pulseBoard, sessionClears, setFeedback]);

  useEffect(() => {
    if (config.timeLimitSec === 0 || showResult) {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          finishGame();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [config.timeLimitSec, finishGame, showResult]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "h" && !isEndlessMode) {
        event.preventDefault();
        revealHint();
      } else if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        restartGame(config);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setShowExit(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [config, isEndlessMode, restartGame, revealHint]);

  useEffect(() => () => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!endlessCleared) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      advanceEndlessBoard();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [advanceEndlessBoard, endlessCleared]);

  useEffect(() => {
    if (!standardCleared) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      finishGame();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [finishGame, standardCleared]);

  useEffect(() => {
    if (!pointerDown) {
      return;
    }

    const endSelection = () => submitCurrentPath();
    window.addEventListener("pointerup", endSelection);
    return () => window.removeEventListener("pointerup", endSelection);
  }, [pointerDown, submitCurrentPath]);

  function toggleSound() {
    const next = { ...settings, soundEnabled: !settings.soundEnabled };
    setSettings(next);
    writeSettings(next);
  }

  function handleCellEnter(index: number) {
    if (!pointerDown || showResult || isAdvancingBoard) {
      return;
    }

    setSelectedPath((current) => {
      if (current.length === 0) {
        return [index];
      }

      if (current[current.length - 2] === index) {
        return current.slice(0, -1);
      }

      const last = current[current.length - 1];
      const isAdjacent = board.adjacencyMap[last]?.includes(index);
      if (!isAdjacent || current.includes(index)) {
        setFeedback("这一步连不上，试着沿着相邻字继续滑。", "error");
        pulseBoard("error");
        return current;
      }
      return [...current, index];
    });
  }

  function handleBoardPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointerDown || showResult || isAdvancingBoard) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    const cellId = resolveCellFromPointer(event.clientX, event.clientY);
    if (cellId !== null) {
      handleCellEnter(cellId);
    }
  }

  function handleBoardPointerCancel() {
    setPointerDown(false);
    setSelectedPath([]);
  }

  const missingWords = Object.keys(board.validWords).filter(
    (word) => !foundWords.some((item) => item.text === word),
  );
  const circlePercent =
    config.timeLimitSec === 0 ? 100 : Math.max(0, (secondsLeft / config.timeLimitSec) * 100);
  const modeLabel = MODE_LABELS[config.mode];

  const resultSummary = {
    targetReached: isEndlessMode ? foundWords.length >= totalWords && totalWords > 0 : foundWords.length >= config.targetWordCount,
    comboActive: foundWords[0]?.comboMultiplier > 1,
  };

  const currentResult = useMemo(
    () => ({
      score,
      foundCount: foundWords.length,
      completionRate,
      durationSec: config.timeLimitSec === 0 ? 0 : config.timeLimitSec - secondsLeft,
      completedTarget: isEndlessMode ? foundWords.length >= totalWords : foundWords.length >= config.targetWordCount,
      mode: config.mode,
      gridSize: config.gridSize,
      difficulty: config.difficulty,
      playedAt: finishStamp ? new Date(finishStamp).toISOString() : "",
      endlessClears: isEndlessMode ? sessionClears : undefined,
    }),
    [completionRate, config, finishStamp, foundWords.length, isEndlessMode, score, secondsLeft, sessionClears, totalWords],
  );

  const shareCopyText = useMemo(() => buildShareText(currentResult), [currentResult]);

  const triggerDownload = useCallback(async () => {
    const asset = await buildShareAsset(currentResult);
    const url = URL.createObjectURL(asset.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = asset.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }, [currentResult]);

  useEffect(() => {
    if (!finishStamp) {
      return;
    }

    let revoked = false;

    async function loadPreview() {
      try {
        const asset = await buildShareAsset(currentResult);
        if (revoked) {
          return;
        }
        const url = URL.createObjectURL(asset.blob);
        if (sharePreviewUrlRef.current) {
          URL.revokeObjectURL(sharePreviewUrlRef.current);
        }
        sharePreviewUrlRef.current = url;
        setSharePreview(url);
      } catch {
        if (!revoked) {
          setSharePreview(null);
        }
      }
    }

    void loadPreview();
    return () => {
      revoked = true;
      if (sharePreviewUrlRef.current) {
        URL.revokeObjectURL(sharePreviewUrlRef.current);
        sharePreviewUrlRef.current = null;
      }
    };
  }, [currentResult, finishStamp]);

  const shareGameResult = useCallback(async () => {
    setShareBusy(true);
    try {
      const asset = await buildShareAsset(currentResult);
      const canUseNativeShare = typeof navigator !== "undefined" && "share" in navigator;
      const shareFiles = typeof File !== "undefined" ? [new File([asset.blob], asset.fileName, { type: asset.blob.type })] : undefined;

      if (canUseNativeShare) {
        const supportFiles = typeof navigator.canShare === "function" && shareFiles ? navigator.canShare({ files: shareFiles }) : false;
        const supportText = typeof navigator.canShare === "function" ? navigator.canShare({ title: "汉谜达人", text: shareCopyText }) : true;

        if ((shareFiles && supportFiles) || supportText) {
          await navigator.share({
            title: "汉谜达人",
            text: shareCopyText,
            url: window.location.origin,
            files: shareFiles,
          });
          setShareStatus("已调起系统分享。");
          return;
        }
      }

      await triggerDownload();
      setShareStatus("当前设备不支持系统分享，已改为下载图片。");
    } catch {
      setShareStatus("分享失败，请改用保存图片。");
    } finally {
      setShareBusy(false);
    }
  }, [currentResult, shareCopyText, triggerDownload]);

  const downloadShareImage = useCallback(async () => {
    setShareBusy(true);
    try {
      await triggerDownload();
      setShareStatus("图片已保存到本地。");
    } catch {
      setShareStatus("生成图片失败，请稍后再试。");
    } finally {
      setShareBusy(false);
    }
  }, [triggerDownload]);

  const copyShareText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareCopyText);
      setShareStatus("文案已复制，可以直接粘贴分享。");
    } catch {
      setShareStatus("复制失败，请手动选择复制。");
    }
  }, [shareCopyText]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,211,145,0.28),transparent_28%),linear-gradient(180deg,#fff9ef_0%,#fffdfa_55%,#fffefc_100%)] px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card-surface panel-outline rounded-[32px] p-4 sm:p-6">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-100 pb-4">
            <div>
              <Link href="/" className="text-sm font-medium uppercase tracking-[0.22em] text-amber-500">
                汉谜达人
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>{modeLabel}</span>
                <span>·</span>
                <span>{config.gridSize}×{config.gridSize}</span>
                <span>·</span>
                <span>{GRID_LABELS[config.gridSize]}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSound}
                className="rounded-full border border-amber-200 bg-white/86 px-4 py-2 text-sm text-slate-600"
              >
                {settings.soundEnabled ? "音效开" : "音效关"}
              </button>
              <div className="grid h-16 w-16 place-items-center rounded-full border-[6px] border-emerald-400 bg-white text-sm font-bold text-slate-700 shadow-[0_8px_24px_rgba(73,203,143,0.18)]">
                {config.timeLimitSec === 0 ? "∞" : formatTimer(secondsLeft)}
              </div>
            </div>
          </header>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
              <div className="rounded-[22px] bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-400">当前分数</div>
                    <div className="mt-1 text-4xl font-black tracking-tight text-slate-800">{score}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-400">{isEndlessMode ? "盘面进度" : "目标进度"}</div>
                    <div className="mt-1 text-xl font-bold text-slate-700">
                      {isEndlessMode ? `${foundWords.length}/${totalWords}` : `${foundWords.length}/${Math.max(config.targetWordCount, totalWords)}`}
                    </div>
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-emerald-400 to-amber-400 transition-[width]"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
                  <span>{isEndlessMode ? `已找到 ${foundWords.length}/${totalWords} 个词语` : `已找到 ${foundWords.length}/${totalWords} 个词语`}</span>
                  <span>{formatPercent(completionRate)}</span>
                </div>
              </div>
              <div className="rounded-[22px] bg-linear-to-br from-white via-orange-50 to-amber-50 p-4">
                <div className="text-sm text-slate-400">状态</div>
                <div className="mt-2 text-lg font-bold text-slate-800">
                  {isEndlessMode
                    ? isAdvancingBoard
                      ? "切换中"
                      : resultSummary.comboActive
                        ? "连击中"
                        : "冲刺中"
                    : resultSummary.targetReached
                      ? "已达目标"
                      : resultSummary.comboActive
                        ? "连击中"
                        : "寻找中"}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {isEndlessMode
                    ? `本次连过 ${sessionClears} 盘`
                    : resultSummary.targetReached
                      ? "已完成本盘"
                      : config.timeLimitSec === 0
                        ? "不限时练习"
                        : `剩余 ${formatPercent(circlePercent)}`}
                </div>
              </div>
            </div>

            <div
              ref={boardRef}
              onPointerMove={handleBoardPointerMove}
              onPointerCancel={handleBoardPointerCancel}
              className={`relative mx-auto w-full ${boardWidthClass} rounded-[30px] border border-orange-200 bg-linear-to-br from-[#ffe7b5] via-[#fff2d3] to-[#ffd9a4] p-2 shadow-[0_18px_42px_rgba(255,176,53,0.18)] sm:p-2.5 ${
                boardPulse === "error"
                  ? "animate-board-shake"
                  : boardPulse === "success"
                    ? "animate-board-success"
                    : boardPulse === "hint"
                      ? "animate-board-hint"
                      : ""
              } touch-none select-none`}
              style={{
                display: "grid",
                gap: config.gridSize === 5 ? "7px" : "8px",
                gridTemplateColumns: `repeat(${config.gridSize}, minmax(0, 1fr))`,
                touchAction: "none",
                overscrollBehavior: "contain",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
              }}
            >
              {pathPoints.length > 0 ? (
                <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                  <defs>
                    <linearGradient id="pathGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor={livePathInvalid ? "#ff8f8f" : "#ffbd2f"} />
                      <stop offset="100%" stopColor={livePathInvalid ? "#f04438" : "#ff8a00"} />
                    </linearGradient>
                  </defs>
                  {pathPoints.length > 1 ? (
                    <polyline
                      points={pathPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                      fill="none"
                      stroke={livePathInvalid ? "rgba(255,226,226,0.95)" : "rgba(255,255,255,0.82)"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={16}
                    />
                  ) : null}
                  {pathPoints.length > 1 ? (
                    <polyline
                      points={pathPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                      fill="none"
                      stroke="url(#pathGradient)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={9}
                    />
                  ) : null}
                  {pathPoints.map((point, index) => (
                    <g key={`${point.x}-${point.y}-${index}`}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={index === pathPoints.length - 1 ? 15 : 12}
                        fill="rgba(255,255,255,0.88)"
                      />
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={index === pathPoints.length - 1 ? 10 : 8}
                        fill={
                          livePathInvalid
                            ? index === pathPoints.length - 1
                              ? "#ef4444"
                              : "#f97316"
                            : index === pathPoints.length - 1
                              ? "#ff7b28"
                              : "#ffb04a"
                        }
                      />
                    </g>
                  ))}
                </svg>
              ) : null}
              {board.cells.map((cell) => {
                const active = selectedPath.includes(cell.id);
                const hinted = hintedPath?.includes(cell.id);
                const activeIndex = selectedPath.indexOf(cell.id);
                const isStart = activeIndex === 0;
                const isEnd = activeIndex === selectedPath.length - 1 && activeIndex !== -1;
                return (
                  <button
                    key={cell.id}
                    type="button"
                    data-cell-id={cell.id}
                    ref={(element) => {
                      cellRefs.current[cell.id] = element;
                    }}
                    onPointerDown={(event) => {
                      if (showResult || isAdvancingBoard) {
                        return;
                      }
                      if (event.cancelable) {
                        event.preventDefault();
                      }
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setPointerDown(true);
                      setSelectedPath([cell.id]);
                    }}
                    onPointerEnter={() => handleCellEnter(cell.id)}
                    className={`relative aspect-square rounded-[16px] border text-center font-black tracking-[-0.06em] transition ${
                      active
                        ? livePathInvalid
                          ? "z-10 border-red-300 bg-linear-to-b from-[#ffb0a8] to-[#f35b54] text-white shadow-[0_14px_30px_rgba(239,68,68,0.28)]"
                          : "z-10 border-amber-300 bg-linear-to-b from-[#ffc93b] to-[#ffb100] text-white shadow-[0_14px_30px_rgba(255,176,0,0.3)]"
                        : hinted
                          ? "border-emerald-300 bg-linear-to-b from-[#effff6] to-[#d7f8e7] text-emerald-700 shadow-[0_8px_20px_rgba(108,225,167,0.18)]"
                          : "border-white/85 bg-[linear-gradient(180deg,#ffffff_0%,#f6f6f4_100%)] text-slate-500 shadow-[0_10px_20px_rgba(255,220,158,0.14)]"
                    } flex items-center justify-center ${cellTextClass} touch-none select-none leading-none`}
                    style={{
                      fontSize: cellFontSize,
                      fontWeight: 900,
                      lineHeight: 1,
                      touchAction: "none",
                      WebkitTapHighlightColor: "transparent",
                    }}
                    aria-label={`字符 ${cell.char}`}
                  >
                    {active ? (
                      <span
                        className={`absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                          isEnd
                            ? livePathInvalid
                              ? "bg-red-600 text-white"
                              : "bg-orange-500 text-white"
                            : isStart
                              ? "bg-amber-100 text-amber-900"
                              : "bg-white/92 text-orange-500"
                        }`}
                      >
                        {activeIndex + 1}
                      </span>
                    ) : null}
                    {cell.char}
                  </button>
                );
              })}
            </div>

            <div className={`grid gap-3 ${isEndlessMode ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
              {!isEndlessMode ? (
                <button
                  type="button"
                  onClick={revealHint}
                  className="rounded-[20px] border border-amber-200 bg-white/88 px-4 py-4 text-base font-semibold text-slate-700 transition hover:bg-white"
                >
                  提示 (H)
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => restartGame(config)}
                className="rounded-[20px] border border-amber-200 bg-white/88 px-4 py-4 text-base font-semibold text-slate-700 transition hover:bg-white"
              >
                再来一局 (R)
              </button>
              <button
                type="button"
                onClick={() => setShowExit(true)}
                className="rounded-[20px] border border-amber-200 bg-white/88 px-4 py-4 text-base font-semibold text-slate-700 transition hover:bg-white"
              >
                退出 (Esc)
              </button>
            </div>

            <div className="rounded-[26px] border border-amber-200/70 bg-white/84 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:p-5">
              <div className="flex flex-col gap-3 border-b border-amber-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-800">已找到的词语</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    最新结果会优先显示，方便快速扫一眼自己的连击节奏。
                  </p>
                </div>
                <div
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    messageTone === "error"
                      ? "border-red-200 bg-red-50 text-red-600"
                      : messageTone === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : messageTone === "combo"
                          ? "border-orange-200 bg-orange-50 text-orange-700"
                          : messageTone === "hint"
                            ? "border-sky-200 bg-sky-50 text-sky-700"
                            : "border-amber-200 bg-amber-50/80 text-slate-600"
                  }`}
                >
                  {message}
                </div>
              </div>
              <div className="mt-4 max-h-[320px] overflow-y-auto pr-1">
                {foundWords.length === 0 ? (
                  <div className="flex min-h-32 items-center justify-center rounded-[22px] border border-dashed border-amber-200 text-center text-sm text-slate-400">
                    {isEndlessMode ? "还没有找到词语，先从稳妥的 2 字词开始连起来。" : "还没有找到词语，先从 2 字或 3 字常见词开始连起来。"}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {foundWords.map((word, index) => (
                      <div
                        key={`${word.text}-${word.foundAt}`}
                        className={`rounded-[22px] border px-4 py-3 transition ${
                          index === 0
                            ? "border-orange-300 bg-linear-to-r from-amber-50 to-orange-50 shadow-[0_10px_28px_rgba(255,160,57,0.14)]"
                            : "border-amber-100 bg-white/84"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[1.35rem] font-black leading-none tracking-tight text-slate-800">
                              {word.text}
                            </div>
                            <div className="mt-2 text-xs text-slate-400">
                              {word.length} 字词 · {word.comboMultiplier > 1 ? `${word.comboMultiplier.toFixed(2)}x 连击` : "普通命中"}
                            </div>
                          </div>
                          <div className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
                            +{word.score}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-400" />2字 +100</span>
              <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-orange-400" />3字 +250</span>
              <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-violet-400" />4字 +500</span>
              <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-amber-400" />5字+ +1000</span>
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="card-surface panel-outline rounded-[28px] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-500">{isEndlessMode ? "挑战数据" : "本局概要"}</p>
            <div className="mt-4 grid gap-3">
              {isEndlessMode ? (
                <>
                  <MiniStat label="本次连过" value={`${sessionClears}`} />
                  <MiniStat label="累计通关" value={`${endlessStats.totalClears}`} />
                  <MiniStat label="历史最佳" value={`${endlessStats.bestRun}`} />
                </>
              ) : (
                <>
                  <MiniStat label="已找到" value={`${foundWords.length}`} />
                  <MiniStat label="可解词数" value={`${totalWords}`} />
                  <MiniStat label="最快连击" value={foundWords[0]?.comboMultiplier && foundWords[0].comboMultiplier > 1 ? `${foundWords[0].comboMultiplier.toFixed(2)}x` : "1.00x"} />
                </>
              )}
            </div>
          </section>
          <section className="card-surface panel-outline rounded-[28px] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{isEndlessMode ? "挑战规则" : "局内提示"}</p>
            <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-500">
              {isEndlessMode ? (
                <>
                  <p>180 秒内持续清盘，清完整盘会自动接入下一题。</p>
                  <p>状态区只显示进度数量，不会暴露任何未找到词的具体信息。</p>
                  <p>拖拽路径会显示编号和连线，往回拖一格可以撤回上一步。</p>
                </>
              ) : (
                <>
                  <p>拖拽路径会显示编号和连线，方便判断当前是否走对。</p>
                  <p>橙色终点代表当前落点，往回拖一格可以撤回上一步。</p>
                  <p>提示功能只亮起开头路径，不会直接把完整答案暴露出来。</p>
                </>
              )}
            </div>
          </section>
        </aside>
      </div>

      <Modal
        open={showExit}
        onClose={() => setShowExit(false)}
        title={isEndlessMode ? "结束本次挑战？" : "退出这一局？"}
        subtitle={isEndlessMode ? `当前已连续通关 ${sessionClears} 盘，退出后会保留本次成绩。` : "你可以直接返回首页，也可以从当前配置重新开一局"}
        footer={
          <div className="grid gap-3 sm:grid-cols-2">
            {isEndlessMode ? (
              <button
                type="button"
                onClick={finishGame}
                className="rounded-[18px] border border-amber-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700"
              >
                结束挑战
              </button>
            ) : (
              <Link
                href="/"
                className="rounded-[18px] border border-amber-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700"
              >
                返回首页
              </Link>
            )}
            <button
              type="button"
              onClick={() => restartGame(config)}
              className="rounded-[18px] bg-linear-to-r from-orange-500 to-amber-400 px-4 py-3 text-sm font-semibold text-white"
            >
              重新开局
            </button>
          </div>
        }
      >
        <p className="text-sm leading-7 text-slate-600">
          当前已经找到 {foundWords.length} 个词语，得分 {score} 分。
        </p>
      </Modal>

      <Modal
        open={showResult}
        onClose={() => setShowResult(false)}
        title={isEndlessMode ? "挑战结束" : foundWords.length >= config.targetWordCount ? "挑战完成" : "本局结束"}
        subtitle={isEndlessMode ? `180 秒内连续通关 ${sessionClears} 盘，最终得分 ${score} 分。` : `本局共找到 ${foundWords.length} 个词语，完成度 ${formatPercent(completionRate)}`}
        footer={
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => restartGame(config)}
              className="rounded-[18px] border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            >
              再来一局
            </button>
            <Link
              href="/"
              className="rounded-[18px] bg-linear-to-r from-orange-500 to-amber-400 px-4 py-3 text-center text-sm font-semibold text-white"
            >
              返回首页
            </Link>
          </div>
        }
        >
        <div className="rounded-[24px] border border-amber-100 bg-linear-to-br from-white via-orange-50 to-amber-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-amber-500">分享战绩</div>
              <div className="mt-1 text-sm text-slate-500">{shareStatus}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={shareGameResult}
                disabled={shareBusy}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                分享图片
              </button>
              <button
                type="button"
                onClick={downloadShareImage}
                disabled={shareBusy}
                className="rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                保存图片
              </button>
              <button
                type="button"
                onClick={copyShareText}
                className="rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition"
              >
                复制文案
              </button>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-[30px] border border-white/70 bg-white/90 p-4 shadow-[0_12px_30px_rgba(255,166,55,0.14)]">
            <div className="overflow-hidden rounded-[26px] bg-[#fffdf8]">
              {sharePreview ? (
                <Image
                  src={sharePreview}
                  alt={getShareImageAlt(currentResult)}
                  width={600}
                  height={800}
                  unoptimized
                  className="h-auto w-full"
                />
              ) : (
                <div className="grid min-h-[220px] place-items-center rounded-[26px] text-sm text-slate-400">
                  正在生成分享卡片
                </div>
              )}
            </div>
          </div>
        </div>
        <div className={`grid gap-3 ${isEndlessMode ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
          <ResultStat label="得分" value={`${score}`} />
          {isEndlessMode ? (
            <>
              <ResultStat label="连过" value={`${sessionClears}`} />
              <ResultStat label="累计通关" value={`${endlessStats.totalClears}`} />
              <ResultStat label="历史最佳" value={`${endlessStats.bestRun}`} />
            </>
          ) : (
            <>
              <ResultStat label="目标" value={`${config.targetWordCount}`} />
              <ResultStat label="找到" value={`${foundWords.length}`} />
            </>
          )}
        </div>
        {!isEndlessMode && missingWords.length > 0 ? (
          <div className="mt-4 rounded-[20px] border border-amber-100 bg-amber-50/70 p-4">
            <div className="text-sm font-semibold text-slate-700">本局还有这些词没有找到</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {missingWords.slice(0, 18).map((word) => (
                <span
                  key={word}
                  className="rounded-full border border-amber-200 bg-white/85 px-3 py-1 text-sm text-slate-600"
                >
                  {word}
                </span>
              ))}
            </div>
            {missingWords.length > 18 ? (
              <p className="mt-3 text-xs text-slate-500">其余 {missingWords.length - 18} 个词已省略。</p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </main>
  );
}

function getDailySeed(config: GameConfig) {
  return `${getTodayKey()}-${config.gridSize}-${config.difficulty}`;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-white/76 px-4 py-3">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-800">{value}</div>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-white/76 px-4 py-4 text-center">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black text-slate-800">{value}</div>
    </div>
  );
}

