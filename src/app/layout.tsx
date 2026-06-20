import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://example.com"),
  title: "汉谜达人 - 中文词典连线找词小游戏，每日挑战与无尽模式",
  description:
    "汉谜达人是一款基于 CC-CEDICT 词库的中文连线找词小游戏，支持每日挑战、计时模式、练习模式和无尽挑战，适合电脑和手机直接游玩。",
  keywords: [
    "汉谜达人",
    "中文词典游戏",
    "汉字连线",
    "找词小游戏",
    "每日挑战",
    "无尽模式",
  ],
  applicationName: "汉谜达人",
  alternates: {
    canonical: "https://example.com",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    url: "https://example.com",
    siteName: "汉谜达人",
    title: "汉谜达人 - 中文词典连线找词小游戏，每日挑战与无尽模式",
    description:
      "汉谜达人是一款基于 CC-CEDICT 词库的中文连线找词小游戏，支持每日挑战、计时模式、练习模式和无尽挑战，适合电脑和手机直接游玩。",
    locale: "zh_CN",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "汉谜达人网站图标",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "汉谜达人 - 中文词典连线找词小游戏，每日挑战与无尽模式",
    description:
      "汉谜达人是一款基于 CC-CEDICT 词库的中文连线找词小游戏，支持每日挑战、计时模式、练习模式和无尽挑战，适合电脑和手机直接游玩。",
    images: ["/android-chrome-512x512.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
