# Hanzi Word Connect

一个基于 `Next.js 16`、面向中文语境设计的连线找词小游戏。公开仓库名使用 `Hanzi Word Connect`，避免与私有主项目重名；游戏内显示名称仍保留为“汉谜达人”。

## 项目亮点

- 中文词库驱动：基于 `CC-CEDICT` 衍生词表构建游戏词典。
- 多种玩法模式：包含每日挑战、计时模式、练习模式和无尽模式。
- 移动端友好：支持触控滑动、响应式布局和直接开玩。
- 离线可降级：即使外部接口不可用，核心玩法仍可正常运行。
- 单仓库交付：前端页面、游戏逻辑和轻量接口都在同一个 `Next.js` 项目中。

## 在线体验

这个公开仓库默认把线上域名替换成了占位值 `https://example.com`。如果你要部署自己的版本，请把这些占位值改成你的真实域名：

- [src/app/layout.tsx](C:/Users/ztab/Documents/New%20project/hanzi-word-connect-open-source/src/app/layout.tsx)
- [src/app/sitemap.ts](C:/Users/ztab/Documents/New%20project/hanzi-word-connect-open-source/src/app/sitemap.ts)
- [src/app/robots.ts](C:/Users/ztab/Documents/New%20project/hanzi-word-connect-open-source/src/app/robots.ts)
- [src/lib/game/share.ts](C:/Users/ztab/Documents/New%20project/hanzi-word-connect-open-source/src/lib/game/share.ts)

## 技术栈

- `Next.js 16`
- `React 19`
- `TypeScript 5`
- `Tailwind CSS 4`
- `ESLint 9`

## 目录结构

```text
hanzi-word-connect/
├─ public/                      # 图标、PWA 资源与静态素材
├─ scripts/                     # 词典构建与运行辅助脚本
├─ src/
│  ├─ app/                      # App Router 页面与 API
│  ├─ components/               # UI 组件
│  ├─ data/                     # 生成后的词典 JSON
│  └─ lib/game/                 # 盘面、词典、计分、分享等核心逻辑
├─ docs/                        # 项目说明与部署文档
├─ THIRD_PARTY_NOTICES.md       # 第三方依赖与数据来源说明
├─ COPYRIGHT.md                 # 版权与贡献归属说明
└─ README.md
```

## 快速开始

### 环境要求

- `Node.js 20+`
- `npm 10+`

### 安装依赖

```bash
npm install
```

### 配置环境变量

```bash
copy .env.example .env.local
```

默认配置：

```env
PORT=3000
HOSTNAME=0.0.0.0
DAILY_WORD_API_BASE=
```

说明：

- `PORT` 和 `HOSTNAME` 用于本地或生产运行。
- `DAILY_WORD_API_BASE` 是可选项，用于每日词语的远程拼音/释义补充。
- 如果不配置 `DAILY_WORD_API_BASE`，项目会直接使用本地数据，不影响核心玩法。

### 启动开发环境

```bash
npm run dev
```

默认访问地址为 [http://localhost:3000](http://localhost:3000)。

## 常用命令

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run dictionary:build
```

说明：

- `npm run build` 会生成 `standalone` 产物。
- `postbuild` 会自动同步 `public` 和 `.next/static` 到 `.next/standalone`。
- `npm run dictionary:build` 会根据 `cedict_ts.u8.gz` 重新生成 `src/data/dictionary.generated.json`。

## 玩法概览

- `每日挑战`
  - 固定日期生成固定题目，适合同日比较成绩。
- `计时模式`
  - 提供多档难度和不同棋盘尺寸。
- `练习模式`
  - 不限时，适合熟悉词库和规则。
- `无尽模式`
  - 连续清盘，适合刷手感和高分挑战。

## 数据与词典说明

项目内置 `cedict_ts.u8.gz`，构建脚本会从中提取 2 到 6 字词语并生成运行时词表。由于这部分数据来自第三方词典来源，公开分发时建议一并保留来源说明，并根据你的使用方式再次确认上游授权要求。

相关文件：

- [scripts/build-dictionary.mjs](C:/Users/ztab/Documents/New%20project/hanzi-word-connect-open-source/scripts/build-dictionary.mjs)
- [src/data/dictionary.generated.json](C:/Users/ztab/Documents/New%20project/hanzi-word-connect-open-source/src/data/dictionary.generated.json)
- [THIRD_PARTY_NOTICES.md](C:/Users/ztab/Documents/New%20project/hanzi-word-connect-open-source/THIRD_PARTY_NOTICES.md)

## 部署

这个项目最适合以下几类部署方式：

- `Node.js + PM2 + Nginx`
- `Docker`
- `宝塔 Node 项目`

详细步骤见：

- [docs/部署指南.md](./docs/部署指南.md)

## 开源与版权

- 源代码使用 [MIT License](./LICENSE)。
- 第三方依赖、词典数据和外部服务各自遵循其原始许可或服务条款。
- 发布、Fork 或二次开发前，建议先阅读：
  - [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)
  - [COPYRIGHT.md](./COPYRIGHT.md)
  - [OPEN_SOURCE_CHECKLIST.md](./OPEN_SOURCE_CHECKLIST.md)

## 文档

- [docs/项目说明.md](./docs/项目说明.md)
- [docs/部署指南.md](./docs/部署指南.md)

## 后续可扩展方向

- 排行榜与用户系统
- 多语言界面
- 更丰富的词语释义与例句
- 在线词库更新
- PWA 离线缓存
- 边缘平台适配

## 致谢

- `CC-CEDICT` 及相关中文词典整理工作，为中文词表构建提供基础来源。
- `Next.js`、`React`、`Tailwind CSS` 及其他依赖项目的维护者。
