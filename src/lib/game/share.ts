import { formatPercent } from "./format";
import { MODE_LABELS } from "./constants";
import type { GameResult } from "./types";
import QRCode from "qrcode";

export type ShareCardData = {
  title: string;
  modeLabel: string;
  gridLabel: string;
  scoreLabel: string;
  scoreValue: string;
  completionLabel: string;
  completionValue: string;
  foundLabel: string;
  foundValue: string;
  bodyCopy: string;
  footerCopy: string;
  rootUrl: string;
};

export type ShareAsset = {
  fileName: string;
  blob: Blob;
  card: ShareCardData;
};

export function buildShareCardData(result: GameResult): ShareCardData {
  const dateLabel = formatDateLabel(new Date());
  return {
    title: "本局成绩",
    modeLabel: MODE_LABELS[result.mode],
    gridLabel: `${result.gridSize}×${result.gridSize}`,
    scoreLabel: "得分",
    scoreValue: `${result.score}`,
    completionLabel: "完成度",
    completionValue: formatPercent(result.completionRate),
    foundLabel: result.mode === "endless" ? "连过" : "恭喜你找到",
    foundValue: result.mode === "endless" ? `${result.endlessClears ?? 0} 盘` : `${result.foundCount} 个字`,
    bodyCopy: getShareBodyCopy(result),
    footerCopy: `${dateLabel} 完成打卡`,
    rootUrl: getRootUrl(),
  };
}

export function buildShareText(result: GameResult) {
  const modeLabel = MODE_LABELS[result.mode];
  const extra = result.mode === "endless" ? `${result.endlessClears ?? 0} 盘` : `${result.foundCount} 个字`;
  return `汉谜达人｜${modeLabel}\n${result.score} 分 · ${formatPercent(result.completionRate)} · ${extra}\n来试试你的手感`;
}

export function buildShareFileName(result: GameResult) {
  const date = formatDateLabel(result.playedAt).replaceAll(".", "");
  return `hanmi-${result.mode}-${date}.png`;
}

export async function buildShareAsset(result: GameResult): Promise<ShareAsset> {
  const card = buildShareCardData(result);
  const qrSvg = await buildQrSvg(card.rootUrl);
  const svg = renderShareSvg(card, qrSvg);
  const blob = await renderPngBlob(svg);
  return {
    fileName: buildShareFileName(result),
    blob,
    card,
  };
}

export function getShareImageAlt(result: GameResult) {
  return `${MODE_LABELS[result.mode]} · ${result.score} 分的分享卡片`;
}

export function renderShareSvg(card: ShareCardData, qrSvg: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600" fill="none">
  <defs>
    <radialGradient id="bg" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(150 150) rotate(18) scale(1080 1380)">
      <stop offset="0" stop-color="#FFF7D6" stop-opacity="0.7"/>
      <stop offset="0.42" stop-color="#FFFDF8" stop-opacity="0.94"/>
      <stop offset="1" stop-color="#FDF8EF" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="scoreBand" x1="150" y1="0" x2="1050" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFD95A"/>
      <stop offset="0.2" stop-color="#FFC0A9"/>
      <stop offset="0.42" stop-color="#B7E9F7"/>
      <stop offset="0.64" stop-color="#EEB3F6"/>
      <stop offset="0.84" stop-color="#F89D8F"/>
      <stop offset="1" stop-color="#7EACFF"/>
    </linearGradient>
    <filter id="shadow" x="0" y="0" width="1200" height="1600" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#D8A84B" flood-opacity="0.16"/>
    </filter>
  </defs>
  <rect width="1200" height="1600" fill="url(#bg)"/>
  <circle cx="1040" cy="140" r="208" fill="#FFE6A1" fill-opacity="0.32"/>
  <circle cx="150" cy="1395" r="228" fill="#D9F4C9" fill-opacity="0.24"/>
  <circle cx="1010" cy="1320" r="138" fill="#F7C5C7" fill-opacity="0.2"/>
  <rect x="48" y="48" width="1104" height="1504" rx="70" fill="#FFFFFF" fill-opacity="0.74" stroke="#F4E8D0" stroke-width="2" filter="url(#shadow)"/>
  <rect x="76" y="76" width="1048" height="1448" rx="58" fill="none" stroke="#FFFFFF" stroke-opacity="0.8" stroke-width="2"/>

  <text x="150" y="178" fill="#000000" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="58" font-weight="900">${escapeXml(card.modeLabel)}</text>
  <text x="150" y="284" fill="#111827" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="84" font-weight="900">${escapeXml(card.title)}</text>
  <text x="150" y="338" fill="#3B4557" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="30" font-weight="500">${escapeXml(card.modeLabel)} · ${escapeXml(card.gridLabel)}</text>

  <g>
    <rect x="150" y="432" width="900" height="148" rx="28" fill="url(#scoreBand)" fill-opacity="0.96"/>
    <text x="182" y="492" fill="#111111" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="30" font-weight="800">${escapeXml(card.scoreLabel)}</text>
    <text x="266" y="553" fill="#111111" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="86" font-weight="900">${escapeXml(card.scoreValue)}</text>
    <text x="595" y="492" fill="#111111" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="30" font-weight="800">${escapeXml(card.completionLabel)}</text>
    <text x="676" y="553" fill="#111111" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="86" font-weight="900">${escapeXml(card.completionValue)}</text>
  </g>

  <g>
    <rect x="150" y="632" width="900" height="120" rx="24" fill="#FFF9DA" fill-opacity="0.96" stroke="#F1E0A5" stroke-opacity="0.76"/>
    <text x="210" y="706" fill="#111111" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="64" font-weight="900">${escapeXml(card.foundLabel)}</text>
    <text x="978" y="706" fill="#111111" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="58" font-weight="900" text-anchor="end">${escapeXml(card.foundValue)}</text>
  </g>

  <text x="150" y="842" fill="#222A37" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="34" font-weight="700">${escapeXml(card.bodyCopy)}</text>

  <rect x="150" y="918" width="900" height="92" rx="16" fill="#FFFFFF" fill-opacity="0.72" stroke="#E7E1D7" stroke-opacity="0.8"/>
  <text x="600" y="980" fill="#111827" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="46" font-style="italic" font-weight="800" text-anchor="middle">${escapeXml(card.footerCopy)}</text>

  <g>
    <rect x="150" y="1104" width="900" height="134" rx="28" fill="#111827"/>
    <text x="600" y="1166" fill="#FFFFFF" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="30" font-weight="800" text-anchor="middle">相邻汉字滑出词语</text>
    <text x="600" y="1208" fill="#FBD38D" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="22" font-weight="600" text-anchor="middle">汉谜达人 · 中文词语连线挑战</text>
  </g>

  <g transform="translate(494 1272)">
    <rect width="212" height="212" rx="20" fill="#FFFFFF" stroke="#F0E6D2" stroke-width="2"/>
    <rect x="16" y="16" width="180" height="180" rx="8" fill="#FFFFFF"/>
    <g transform="translate(16 16)">
      ${qrSvg}
    </g>
  </g>
</svg>`;
}

function getShareBodyCopy(result: GameResult) {
  if (result.mode === "endless") {
    return `连续通关 ${result.endlessClears ?? 0} 盘，继续冲更高分。`;
  }
  if (result.completionRate >= 100) {
    return "这一局已经完整收下，继续冲更高分。";
  }
  return "这一局已经有不错手感，下一局继续刷新记录。";
}

function formatDateLabel(input: string | Date) {
  const date = input instanceof Date ? input : new Date(input);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function getRootUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://example.com";
}

async function buildQrSvg(url: string) {
  return QRCode.toString(url, {
    type: "svg",
    margin: 0,
    width: 180,
    color: {
      dark: "#111827",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
  });
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function renderPngBlob(svg: string) {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1600;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context unavailable");
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((output) => {
        if (output) {
          resolve(output);
        } else {
          reject(new Error("PNG export failed"));
        }
      }, "image/png");
    });

    return pngBlob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = src;
  });
}
