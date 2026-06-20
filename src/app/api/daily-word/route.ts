import { NextResponse } from "next/server";
import { getLocalDailyWord } from "@/lib/game/dictionary";
import { getTodayKey } from "@/lib/game/format";

type TranslationResponse = {
  code?: number;
  msg?: string;
  data?: {
    result?: string;
    pinyin?: string;
  };
  result?: string;
  pinyin?: string;
  translation?: string;
};

export async function GET() {
  const local = getLocalDailyWord(getTodayKey());
  const remoteApiBase = process.env.DAILY_WORD_API_BASE?.trim();

  if (!remoteApiBase) {
    return NextResponse.json(local);
  }

  try {
    const url = new URL("/v2/fanyi", remoteApiBase);
    url.searchParams.set("text", local.word);
    url.searchParams.set("to", "en");

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(local);
    }

    const payload = (await response.json()) as TranslationResponse;
    return NextResponse.json({
      word: local.word,
      pinyin: payload.data?.pinyin?.trim() || payload.pinyin?.trim() || local.pinyin,
      translation:
        payload.data?.result?.trim() ||
        payload.result?.trim() ||
        payload.translation?.trim() ||
        local.translation,
      source: "remote",
    });
  } catch {
    return NextResponse.json(local);
  }
}
