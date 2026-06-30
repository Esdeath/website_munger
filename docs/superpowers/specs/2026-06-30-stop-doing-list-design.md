# 芒格「不可为清单 / Stop Doing List」专题页 — 设计文档

**日期**：2026-06-30
**状态**：已与用户确认设计，待 spec 审阅

## 一句话目标

新增一个顶级站点专题页 `/stop-doing/`，从原始语料（`shareholders/` + `speech/`）**穷尽式**抽取芒格本人**逐字**说出的「不要 / 别 / 避免 / 切忌 / 要警惕」式告诫，按站点既有 8 个主题分组，每条 = 编者提纲 + 逐字引语 + 出处链接。

## 已确认的决策（来自 brainstorming）

| 维度 | 决策 |
|------|------|
| 交付形态 | 新建站点专题页面（非新文章、非纯文档） |
| 内容来源 | 从 `shareholders/` + `speech/` 原语料**新抽取**，逐字校验 |
| 分组方式 | 复用 `site.ts` 现有 8 个 `TOPICS`，按 `title` 精确匹配 |
| 条目组成 | 编者提纲（「不要 X」，编者话）+ 芒格逐字引语 + 出处链接 |
| 导航/网址 | 顶级导航独立页，英文 slug，URL `/stop-doing/` |
| 覆盖范围 | 穷尽式全量抽取（可能上百条） |

## 架构概览

沿用本仓库「内容是仓库根目录的纯文件、由 `src/lib/*` 在构建时用 `node:fs` 直接读取」的既有架构（无 Astro content collection）。新增一个根目录内容文件、一个加载器纯函数模块、一个静态页、一个校验脚本，并接入侧边栏导航与 SEO 路由。代码骨架先用 2–3 条手工样例条目做 TDD 跑通，再灌入穷尽式抽取的全量内容。

## 组件与职责

### 1. 内容数据文件 `stop-doing/不可为清单.md`（仓库根目录，手工维护）

唯一的内容来源。结构：`##` 主题分组 → `###` 编者提纲 → `>` blockquote 逐字引语（含 `——《篇名》年份` 出处）。

```markdown
## 投资原则

### 不要因为喜欢活动就去活动
> 「我们不是因为喜欢活动而活动，我们喜欢的是赚钱。」
> ——《2014年 每日期刊股东会讲话》2014

### 不要为了配置而配置
> 「……逐字原话……」
> ——《篇名》年份

## 人性偏误

### 不要低估激励机制的力量
> 「……逐字原话……」
> ——《篇名》年份
```

约束：
- `##` 标题**必须精确等于** `site.ts` 中某个 TOPIC 的 `title`（与文章 `category` 同样的精确中文名 join 方式；`relations.ts:topicForCategory` 是恒等函数）。
- `###` = 编者提纲，是编者的话（句式「不要 X」），**不**参与逐字校验。
- `>` blockquote 引语正文必须逐字命中语料；`——` 之后是出处篇名 + 年份。
- 全角标点：语料用 CJK 全角标点（`，。？；`）。引语必须照抄语料原标点，**不可**用 ASCII `,.?;`，否则逐字校验会「未在语料中找到」。

**为何单文件**：条目是无正文的短引语，单文件最易维护、最易整体校验；与「文章=一关键词一文件」不同，这里没有长篇正文要隔离。

### 2. 加载器 `src/lib/stop-doing.ts`（新模块，纯函数，可单测）

从 `process.cwd()/stop-doing/不可为清单.md` 读取并解析成结构化数据。

```typescript
import fs from "node:fs";
import path from "node:path";
import { TOPICS, type TopicDefinition } from "../content/site";
import { loadOriginalSources, type OriginalSource } from "./corpus";

export interface StopDoingEntry {
  headline: string;            // ### 文本（编者提纲「不要 X」）
  quote: string;               // 逐字引语正文（不含 —— 出处）
  sourceTitle: string;         // 出处篇名（—— 后、年份前）
  sourceYear: string;          // 年份
  sourceSlug: string | null;   // 匹配到的 OriginalSource.slug；匹配不到为 null
}

export interface StopDoingGroup {
  topic: TopicDefinition;      // 来自 TOPICS，按 title 精确匹配
  entries: StopDoingEntry[];
}

// 纯解析函数（接收原始 markdown + sources，便于单测，不碰 fs）
export function parseStopDoingList(
  markdown: string,
  sources: Pick<OriginalSource, "slug" | "title">[]
): StopDoingGroup[];

// 文件读取入口（构建时调用）
export function loadStopDoingList(): StopDoingGroup[];
```

行为：
- 解析按 `##` / `###` / `>` 分块，blockquote 拆分逻辑与 `check_stop_doing.py` 对齐。
- 分组顺序 = `TOPICS` 的既有顺序；空主题不输出。
- `##` 标题不是合法 TOPIC title 时——解析阶段**抛错**（让构建/测试失败，而非静默丢弃），错误信息含非法标题文本。
- `sourceSlug`：用出处篇名去 `sources` 里按 title 匹配（复用 `relations.ts` 已有的 `sourceLabelMatchesTitle` 风格匹配），命中记其 `slug`，用于把引语链回 `/sources/<slug>/`；找不到则 `null`，页面只显示出处文字、不加链接。
- `loadStopDoingList()` = 读文件 + `loadOriginalSources()` + 调 `parseStopDoingList`。

### 3. 页面 `src/pages/stop-doing.astro`（单静态页，archive 外壳）

- 英文 slug，最终 URL `https://munger.ayaseeri.com/stop-doing/`。
- 用 `BaseLayout`（archive shell，与 `topics/index.astro` 同款），SEO 用 `buildCollectionPageSchema`（title「不可为清单」、pathname `/stop-doing/`、itemUrls = 各主题锚点）。
- 结构：页眉（eyebrow「不可为清单」+ 标题 + 说明「以下皆为芒格逐字原话，编者只做提炼归类」）→ 顶部主题锚点目录（`#<topic.slug>`，呼应文章页 TOC）→ 按 8 主题分节（`<section id={topic.slug}>`）→ 每节列出条目：提纲（编者话，视觉上与引语区分）+ blockquote 引语 + 出处（`sourceSlug` 非空时链到 `/sources/<slug>/`，否则纯文字）。

### 4. 校验脚本 `tools/check_stop_doing.py`（复用 `check_article.py` 逻辑）

对 `stop-doing/不可为清单.md`：
- 复用 `check_article.py` 的 `normalize`（去空白/各类引号/`**`，**不**改 ASCII 标点）与语料加载、blockquote 解析。
- 每条 blockquote 引语的每个片段逐字命中语料，否则报「未在语料中找到」。
- 每条出处篇名能在 corpus 文件名/标题中找到。
- 每个 `##` 分组标题是合法 TOPIC title。
- 全部通过打印 `PASS` / exit 0。

### 5. 导航接入 `src/lib/navigation.ts`

站点无横向 top-nav，导航即 `buildSidebarSections` 生成的侧边栏树（现有「原文」「解读」两节）。新增一个**独立顶级条目**指向 `/stop-doing/`，置于侧边栏**第一项**（在「原文」「解读」之上），使其显眼、独立。`buildSidebarSections` 返回结构相应扩展（新增一个无子项、直接可点的顶级条目，或一个单叶子的 section——实现时取与现有 `SidebarSection`/`SidebarGroup` 类型最自然者，并在测试中固定其为首项且 href = `/stop-doing/`）。

### 6. SEO / agent 路由接入

- `seo.ts:buildSitemapEntries`：在 `/topics/` 系列之后、`/articles/` 之前（或紧随首页）插入 `{ url: canonicalUrl("/stop-doing/") }`。
- `seo.ts:buildLlmsTxt`：在「主要入口」加一行 `- 不可为清单: <canonical>/stop-doing/`。
- `seo.ts:buildLlmsFullTxt`：纳入清单页指引（可选纳入全部条目纯文本）。
- 对应 `.ts` 路由文件（`sitemap.xml.ts` / `llms.txt.ts` / `llms-full.txt.ts`）无需改动，因数据来自 `seo.ts` 函数；若 `buildLlmsTxt`/`buildLlmsFullTxt` 入参需新增字段，则相应路由文件补传。

## 数据流

```
stop-doing/不可为清单.md ─┐
                          ├─> parseStopDoingList(md, sources) ─> StopDoingGroup[] ─> stop-doing.astro 渲染
loadOriginalSources() ────┘                                                      └─> 出处链接 /sources/<slug>/

navigation.ts: buildSidebarSections() ─> 侧边栏首项「不可为清单」-> /stop-doing/
seo.ts: buildSitemapEntries / buildLlmsTxt ─> 收录 /stop-doing/
```

## 错误处理

- 非法 `##` 主题标题：`parseStopDoingList` 抛错（构建/测试失败）。
- 出处匹配不到：`sourceSlug = null`，页面降级为纯文字出处，不报错。
- 引语非逐字：由 `check_stop_doing.py` 在 `validate:content` / `check` 阶段拦截，打印失败片段。

## 内容生产流程（穷尽式抽取）

沿用既有 essay 流水线的并行 agent 惯例，作为实现计划的**最后批量任务**（代码骨架先用样例条目跑通）：

1. **分片并行扫描**：把 `shareholders/`（约 30 篇）+ `speech/`（约 40 篇）按出处分给多个 reader agent；每个 agent 只摘芒格**本人**说的否定/告诫句（「不要/别/避免/切忌/千万别/最蠢的/最危险的/要警惕/错误是」等），逐字摘出 + 记篇名年份；明确排除采访者/巴菲特/听众的话。
2. **归类**：每条挂到 8 个 TOPIC 之一，写成「### 编者提纲 + > 逐字引语 + —— 出处」，汇入 `stop-doing/不可为清单.md`。
3. **逐字核验**：跑 `tools/check_stop_doing.py`，修到全部 PASS（常见坑：ASCII 标点未全角化、错字）。
4. **独立事实核查**：另一批 fact-checker agent 逐条回读出处，确认 ①确为芒格本人 ②年份/篇名正确 ③否定语义未被翻译扭转。
5. **提交惯例**：与 essay 一致，直接提交到 `main`。

## 测试（Vitest，`tests/stop-doing.test.ts`）

针对纯函数与导航/SEO 改动：
- **解析**：`parseStopDoingList` 能把 `## / ### / >` 正确拆成 `StopDoingGroup[] / StopDoingEntry[]`（提纲、引语正文、出处篇名、年份分离正确）。
- **出处链接**：命中 sources 的条目 `sourceSlug` 非空且等于该 source 的 slug；命中不到时为 `null`。
- **分组**：只输出非空 TOPIC，顺序等于 `TOPICS`；非法 `##` 标题使 `parseStopDoingList` 抛错。
- **导航**：`buildSidebarSections` 第一项为指向 `/stop-doing/` 的顶级条目。
- **SEO**：`buildSitemapEntries` 含 `/stop-doing/`；`buildLlmsTxt` 含「不可为清单」入口行。

## 校验门槛

`validate:content` 目前是纯 Node 脚本（`scripts/validate-site-content.mjs`）。接入方式：在 `package.json` 的 `validate:content` 串接 Python 校验，改为 `node scripts/validate-site-content.mjs && python3 tools/check_stop_doing.py`（与 README 里 `python3 tools/check_article.py ...` 的调用方式一致，依赖 `python3` 在环境中可用——既有文档已假设此前提）。`npm run check` 仍是 canonical pre-commit gate（validate:content + astro check + vitest run + astro build），全绿方可提交。

## 明确不做（YAGNI）

- 不为条目维护「关联文章」链接（条目只链原文出处）。
- 不新增 `frequently-cited-people`（常引用人物）等与「不可为」关系不大的主题的硬性配额——某主题无合适条目则该节为空、不输出。
- 不做按年份的扁平视图、不做交互式筛选。
- 不改动现有 70 篇文章。
