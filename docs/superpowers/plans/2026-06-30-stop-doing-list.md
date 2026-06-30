# 芒格「不可为清单 / Stop Doing List」专题页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增一个顶级站点专题页 `/stop-doing/`，从原语料逐字抽取芒格本人的「不可为」告诫，按 8 个主题分组，每条 = 编者提纲 + 逐字引语 + 出处链接。

**Architecture:** 沿用仓库「根目录纯文件 + `src/lib/*` 构建时 `node:fs` 读取」架构。新增：根目录内容文件 `stop-doing/不可为清单.md`、纯函数加载器 `src/lib/stop-doing.ts`、静态页 `src/pages/stop-doing.astro`、Python 逐字校验脚本 `tools/check_stop_doing.py`、侧边栏顶级入口、SEO 路由收录。代码骨架先用样例条目 TDD 跑通，最后灌入穷尽式全量抽取内容。

**Tech Stack:** Astro 4、TypeScript（strict，`@/*`→`src/*`）、Vitest（node 环境、globals）、Python 3（校验脚本）、gray-matter / remark。

**Design spec:** `docs/superpowers/specs/2026-06-30-stop-doing-list-design.md`

---

## File Structure

| 文件 | 职责 | 新建/修改 |
|------|------|-----------|
| `stop-doing/不可为清单.md` | 唯一内容数据：`##` 主题 / `###` 编者提纲 / `>` 逐字引语+出处 | 新建（先样例，后全量） |
| `src/lib/stop-doing.ts` | 解析内容文件为 `StopDoingGroup[]`；匹配出处 slug；非法主题抛错 | 新建 |
| `src/pages/stop-doing.astro` | archive 外壳单静态页，渲染分组与条目 | 新建 |
| `tools/check_stop_doing.py` | 逐字核验引语、出处存在、主题合法 | 新建（复用 check_article.py 逻辑） |
| `src/lib/navigation.ts` | 导出 `STOP_DOING_NAV` 顶级入口常量 | 修改 |
| `src/layouts/BaseLayout.astro` | 在侧边栏 nav 顶部渲染「不可为清单」入口 | 修改 |
| `src/lib/seo.ts` | `buildSitemapEntries` 收录 `/stop-doing/`；`buildLlmsTxt` 加入口行 | 修改 |
| `package.json` | `validate:content` 串接 Python 校验 | 修改 |
| `tests/stop-doing.test.ts` | `parseStopDoingList` 单测 | 新建 |
| `tests/navigation.test.ts` | `STOP_DOING_NAV` 断言 | 修改 |
| `tests/seo.test.ts` | sitemap / llms 收录断言 | 修改 |

**关键设计点（避免破坏既有契约）**：`tests/navigation.test.ts` 已断言 `buildSidebarSections` 返回的 section 标题精确等于 `["原文","解读"]`。因此**不**把「不可为清单」塞进 `buildSidebarSections`，而是新增一个独立常量 `STOP_DOING_NAV`，由 `BaseLayout` 在侧边栏 nav 顶部单独渲染。这样既满足「顶级、显眼、独立」，又不动既有契约。

---

## Task 1: 加载器解析骨架 `parseStopDoingList`（纯解析，单主题单条目）

先实现最小解析：单个 `##` 主题、单个 `###` 提纲 + `>` 引语，拆出 headline / quote / sourceTitle / sourceYear，`sourceSlug` 先固定为 `null`（下一任务再接出处匹配）。

**Files:**
- Create: `src/lib/stop-doing.ts`
- Test: `tests/stop-doing.test.ts`

- [ ] **Step 1: Write the failing test**

写入 `tests/stop-doing.test.ts`：

```typescript
import { describe, expect, it } from "vitest";
import { parseStopDoingList } from "../src/lib/stop-doing";

const noSources: { slug: string; title: string }[] = [];

describe("parseStopDoingList", () => {
  it("parses one topic with one entry", () => {
    const md = [
      "## 投资原则",
      "",
      "### 不要因为喜欢活动就去活动",
      "> 「我们不是因为喜欢活动而活动，我们喜欢的是赚钱。」",
      "> ——《2014年 每日期刊股东会讲话》2014",
      ""
    ].join("\n");

    const groups = parseStopDoingList(md, noSources);

    expect(groups).toHaveLength(1);
    expect(groups[0].topic.title).toBe("投资原则");
    expect(groups[0].topic.slug).toBe("investment-principles");
    expect(groups[0].entries).toHaveLength(1);
    expect(groups[0].entries[0]).toEqual({
      headline: "不要因为喜欢活动就去活动",
      quote: "我们不是因为喜欢活动而活动，我们喜欢的是赚钱。",
      sourceTitle: "2014年 每日期刊股东会讲话",
      sourceYear: "2014",
      sourceSlug: null
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/stop-doing.test.ts`
Expected: FAIL — `parseStopDoingList` 未定义 / 模块不存在。

- [ ] **Step 3: Write minimal implementation**

写入 `src/lib/stop-doing.ts`：

```typescript
import fs from "node:fs";
import path from "node:path";
import { TOPICS, type TopicDefinition } from "../content/site";
import { loadOriginalSources, type OriginalSource } from "./corpus";

export interface StopDoingEntry {
  headline: string;
  quote: string;
  sourceTitle: string;
  sourceYear: string;
  sourceSlug: string | null;
}

export interface StopDoingGroup {
  topic: TopicDefinition;
  entries: StopDoingEntry[];
}

const ROOT = process.cwd();
const CONTENT_PATH = "stop-doing/不可为清单.md";

// 各类引号:CJK 括号 + 中英弯/直引号(与 check_stop_doing.py 对齐)
const QUOTE_CHARS = /[「」『』“”‘’"']/g;

function stripQuoteMarks(value: string): string {
  return value.replace(QUOTE_CHARS, "").trim();
}

// 从 blockquote 文本里拆出引语正文与出处。
// 出处行格式:——《篇名》年份
function splitQuoteAndCitation(lines: string[]): {
  quote: string;
  sourceTitle: string;
  sourceYear: string;
} {
  const joined = lines.join(" ");
  const dashIndex = joined.indexOf("——");
  const quotePart = dashIndex >= 0 ? joined.slice(0, dashIndex) : joined;
  const citePart = dashIndex >= 0 ? joined.slice(dashIndex + "——".length) : "";

  const quote = stripQuoteMarks(quotePart);

  // 出处:《篇名》年份
  const m = citePart.match(/《(.+?)》\s*((?:19|20)\d{2})?/);
  const sourceTitle = m?.[1]?.trim() ?? citePart.replace(/[《》]/g, "").trim();
  const sourceYear = m?.[2]?.trim() ?? "";

  return { quote, sourceTitle, sourceYear };
}

export function parseStopDoingList(
  markdown: string,
  sources: Pick<OriginalSource, "slug" | "title">[]
): StopDoingGroup[] {
  const lines = markdown.split("\n");
  const groups: StopDoingGroup[] = [];

  let currentTopic: TopicDefinition | null = null;
  let currentEntries: StopDoingEntry[] = [];
  let pendingHeadline: string | null = null;
  let quoteLines: string[] = [];

  const flushEntry = () => {
    if (pendingHeadline !== null && quoteLines.length > 0) {
      const { quote, sourceTitle, sourceYear } = splitQuoteAndCitation(quoteLines);
      currentEntries.push({
        headline: pendingHeadline,
        quote,
        sourceTitle,
        sourceYear,
        sourceSlug: null
      });
    }
    pendingHeadline = null;
    quoteLines = [];
  };

  const flushGroup = () => {
    flushEntry();
    if (currentTopic && currentEntries.length > 0) {
      groups.push({ topic: currentTopic, entries: currentEntries });
    }
    currentEntries = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      flushGroup();
      const title = line.slice(3).trim();
      const topic = TOPICS.find((t) => t.title === title);
      if (!topic) {
        throw new Error(`不可为清单:未知主题分组「${title}」(必须等于 site.ts TOPICS 的某个 title)`);
      }
      currentTopic = topic;
    } else if (line.startsWith("### ")) {
      flushEntry();
      pendingHeadline = line.slice(4).trim();
    } else if (line.startsWith(">")) {
      quoteLines.push(line.replace(/^>\s?/, "").trim());
    }
  }
  flushGroup();

  return groups;
}

export function loadStopDoingList(): StopDoingGroup[] {
  const markdown = fs.readFileSync(path.join(ROOT, CONTENT_PATH), "utf8");
  const sources = loadOriginalSources().map((s) => ({ slug: s.slug, title: s.title }));
  return parseStopDoingList(markdown, sources);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/stop-doing.test.ts`
Expected: PASS（1 passing）。

- [ ] **Step 5: Commit**

```bash
git add src/lib/stop-doing.ts tests/stop-doing.test.ts
git commit -m "feat: add parseStopDoingList skeleton for stop-doing page

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: 出处 slug 匹配 + 多主题/多条目 + 非法主题报错

补全 `sourceSlug` 匹配（按篇名匹配 `OriginalSource`）、多主题多条目解析、空主题不输出、非法 `##` 抛错。

**Files:**
- Modify: `src/lib/stop-doing.ts`
- Test: `tests/stop-doing.test.ts`

- [ ] **Step 1: Write the failing tests**

在 `tests/stop-doing.test.ts` 的 `describe` 内追加：

```typescript
  const sources = [
    { slug: "2014年-每日期刊股东会讲话", title: "2014年 每日期刊股东会讲话" },
    { slug: "查理芒格-1995年哈佛法学院演讲", title: "查理芒格：1995年哈佛法学院演讲" }
  ];

  it("resolves sourceSlug by matching the citation title against sources", () => {
    const md = [
      "## 投资原则",
      "### 不要因为喜欢活动就去活动",
      "> 「我们不是因为喜欢活动而活动，我们喜欢的是赚钱。」",
      "> ——《2014年 每日期刊股东会讲话》2014"
    ].join("\n");

    const [group] = parseStopDoingList(md, sources);
    expect(group.entries[0].sourceSlug).toBe("2014年-每日期刊股东会讲话");
  });

  it("leaves sourceSlug null when no source matches", () => {
    const md = [
      "## 投资原则",
      "### 不要乱来",
      "> 「这是一句不存在出处的话。」",
      "> ——《某篇并不存在的演讲》1999"
    ].join("\n");

    const [group] = parseStopDoingList(md, sources);
    expect(group.entries[0].sourceSlug).toBeNull();
  });

  it("parses multiple topics and entries, ordering groups by TOPICS order", () => {
    // 文件内「人性偏误」在前、「投资原则」在后；
    // 但 TOPICS 中「投资原则」先于「人性偏误」，故输出按 TOPICS 顺序。
    const md = [
      "## 人性偏误",
      "### 不要低估激励机制",
      "> 「永远别低估激励机制的力量。」",
      "> ——《查理芒格：1995年哈佛法学院演讲》1995",
      "",
      "## 投资原则",
      "### 不要因为喜欢活动就去活动",
      "> 「我们不是因为喜欢活动而活动，我们喜欢的是赚钱。」",
      "> ——《2014年 每日期刊股东会讲话》2014",
      "### 不要追逐自己看不懂的机会",
      "> 「我们喜欢的是赚钱。」",
      "> ——《2014年 每日期刊股东会讲话》2014"
    ].join("\n");

    const groups = parseStopDoingList(md, sources);
    expect(groups.map((g) => g.topic.title)).toEqual(["投资原则", "人性偏误"]);
    // 组内条目顺序 = 文件内出现顺序
    expect(groups[0].entries.map((e) => e.headline)).toEqual([
      "不要因为喜欢活动就去活动",
      "不要追逐自己看不懂的机会"
    ]);
  });

  it("throws on an unknown topic heading", () => {
    const md = ["## 不是合法主题", "### 不要乱来", "> 「随便。」", "> ——《某篇》2000"].join("\n");
    expect(() => parseStopDoingList(md, sources)).toThrow(/未知主题分组/);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/stop-doing.test.ts`
Expected: FAIL — `sourceSlug` 仍为 `null`（匹配未实现）；多主题输出顺序未按 TOPICS 排序。

- [ ] **Step 3: Update implementation**

在 `src/lib/stop-doing.ts` 顶部 import 后，加入篇名匹配辅助（仿 `relations.ts:sourceLabelMatchesTitle`）：

```typescript
function sourceLabelMatchesTitle(label: string, title: string): boolean {
  const normalizedLabel = label.replace(/\s+/g, "");
  const normalizedTitle = title.replace(/\s+/g, "");
  const labelWithoutYear = normalizedLabel.replace(/[（(](19|20)\d{2}[）)]/g, "");
  return normalizedTitle.includes(labelWithoutYear) || labelWithoutYear.includes(normalizedTitle);
}

function resolveSourceSlug(
  sourceTitle: string,
  sources: Pick<OriginalSource, "slug" | "title">[]
): string | null {
  const match = sources.find((s) => sourceLabelMatchesTitle(sourceTitle, s.title));
  return match ? match.slug : null;
}
```

修改 `parseStopDoingList`：(a) 在 `flushEntry` 里用 `resolveSourceSlug` 设置 `sourceSlug`；(b) 函数末尾返回前，按 `TOPICS` 顺序重排分组。

把 `flushEntry` 里的 `sourceSlug: null` 改为：

```typescript
        sourceSlug: resolveSourceSlug(sourceTitle, sources),
```

把函数末尾的 `return groups;` 改为按 TOPICS 顺序排序后返回：

```typescript
  const orderIndex = (g: StopDoingGroup) => TOPICS.findIndex((t) => t.slug === g.topic.slug);
  return groups.sort((a, b) => orderIndex(a) - orderIndex(b));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/stop-doing.test.ts`
Expected: PASS（全部 stop-doing 测试通过）。

- [ ] **Step 5: Commit**

```bash
git add src/lib/stop-doing.ts tests/stop-doing.test.ts
git commit -m "feat: resolve source slugs and order stop-doing groups by topic

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Python 逐字校验脚本 `tools/check_stop_doing.py`

复用 `check_article.py` 的 `normalize` / `load_corpus` / `parse_quote_blocks`，对 `stop-doing/不可为清单.md`：逐字核验引语、出处篇名存在于语料、`##` 主题合法。

**Files:**
- Create: `tools/check_stop_doing.py`
- Create（临时样例，便于本任务自测，下一任务后会被全量内容替换）: `stop-doing/不可为清单.md`

- [ ] **Step 1: 先放一个最小样例内容文件**

写入 `stop-doing/不可为清单.md`（引语必须逐字来自语料，**全角标点**；此处用一句已知存在于 `articles/` 引用过、来自每日期刊讲话的话作样例——若校验报「未在语料中找到」，按 Step 5 排错替换为语料中确实存在的句子）：

```markdown
# 不可为清单

> 以下皆为芒格逐字原话，编者只做提炼归类。

## 投资原则

### 不要因为喜欢活动就去活动
> 「我们不是因为喜欢活动而活动，我们喜欢的是赚钱。」
> ——《2014年 每日期刊股东会讲话》2014
```

- [ ] **Step 2: 写校验脚本**

写入 `tools/check_stop_doing.py`：

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""校验 stop-doing/不可为清单.md:
- 每条 blockquote 引语逐字来自语料(shareholders/ + speech/)
- 每条出处篇名能在语料文件名/标题中找到
- 每个 ## 分组标题是 site.ts TOPICS 里的合法主题 title
通过打印 PASS / exit 0;失败打印 FAIL + [ERR] / exit 1。
"""
import sys, re, glob, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORPUS_DIRS = ["shareholders", "speech"]
CONTENT = os.path.join(BASE, "stop-doing", "不可为清单.md")
SITE_TS = os.path.join(BASE, "src", "content", "site.ts")
QUOTE_MINLEN = 6

_QUOTE_RE = re.compile('[「」『』《》“”‘’"\']')

def normalize(s):
    s = s.replace('**', '')
    s = re.sub(r'[\s　]', '', s)
    s = _QUOTE_RE.sub('', s)
    return s

def load_corpus():
    parts = []
    for d in CORPUS_DIRS:
        for fp in glob.glob(os.path.join(BASE, d, "*.md")):
            with open(fp, encoding="utf-8") as f:
                parts.append(f.read())
    return normalize("\n".join(parts))

def load_corpus_titles():
    """语料文件名(去扩展名)+ 文件内首个 # 标题,normalize 后用于出处存在性核验。"""
    titles = []
    for d in CORPUS_DIRS:
        for fp in glob.glob(os.path.join(BASE, d, "*.md")):
            titles.append(normalize(os.path.splitext(os.path.basename(fp))[0]))
            with open(fp, encoding="utf-8") as f:
                m = re.search(r'(?m)^#\s+(.+)$', f.read())
                if m:
                    titles.append(normalize(m.group(1)))
    return titles

def load_topic_titles():
    """从 site.ts 提取 TOPICS 的 title 字段。"""
    with open(SITE_TS, encoding="utf-8") as f:
        return set(re.findall(r'title:\s*"([^"]+)"', f.read()))

def parse_quote_blocks(text):
    blocks, cur = [], []
    for ln in text.splitlines():
        if ln.lstrip().startswith('>'):
            cur.append(ln.lstrip()[1:].strip())
        elif cur:
            blocks.append(cur); cur = []
    if cur:
        blocks.append(cur)
    out = []
    for grp in blocks:
        joined = " ".join(x for x in grp if x)
        if not joined.strip():
            continue
        if '——' in joined:
            i = joined.index('——')
            out.append((joined[:i], joined[i:]))
        else:
            out.append((joined, ""))
    return out

def main():
    if not os.path.exists(CONTENT):
        print("FAIL"); print(f"  [ERR] 内容文件不存在: {CONTENT}"); return 1
    with open(CONTENT, encoding="utf-8") as f:
        text = f.read()
    corpus = load_corpus()
    corpus_titles = load_corpus_titles()
    topic_titles = load_topic_titles()
    errors = []

    # 1) ## 主题合法性
    for ln in text.splitlines():
        if ln.startswith("## "):
            t = ln[3:].strip()
            if t not in topic_titles:
                errors.append(f"非法主题分组「{t}」(必须是 site.ts TOPICS 的 title)")

    # 2) 逐字核验 + 出处存在性
    blocks = parse_quote_blocks(text)
    quote_blocks = [(q, c) for q, c in blocks if q.strip() and not q.strip().startswith("以下皆为")]
    for qtext, cite in quote_blocks:
        for frag in re.split(r'……|\.\.\.|…', qtext):
            nf = normalize(frag)
            if len(nf) >= QUOTE_MINLEN and nf not in corpus:
                errors.append(f"引用未在语料中找到(疑似杜撰/错字/ASCII标点): 「{qtext[:40]}…」 片段「{frag[:40]}…」")
        # 出处:——《篇名》年份
        m = re.search(r'《(.+?)》', cite)
        if not m:
            errors.append(f"引用缺少《篇名》出处: 「{qtext[:40]}…」")
        else:
            nt = normalize(m.group(1))
            if not any(nt in ct or ct in nt for ct in corpus_titles):
                errors.append(f"出处篇名未匹配到任何语料文件: 《{m.group(1)}》")

    print("--- 不可为清单.md ---")
    print(f"引语数: {len(quote_blocks)}  主题数: {sum(1 for l in text.splitlines() if l.startswith('## '))}")
    if errors:
        print("FAIL")
        for e in errors:
            print(f"  [ERR] {e}")
        return 1
    print("PASS")
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 3: 运行校验脚本**

Run: `python3 tools/check_stop_doing.py`
Expected: 打印 `--- 不可为清单.md ---`，末行 `PASS`，exit 0。

- [ ] **Step 4: 验证它能抓出错误（反向自测）**

临时把样例引语的某个字改错（例如把「赚钱」改成「賺錢」繁体），再运行：

Run: `python3 tools/check_stop_doing.py`
Expected: 打印 `FAIL` 且含 `[ERR] 引用未在语料中找到`，exit 1。确认后把字改回正确的简体原文，再次运行得到 `PASS`。

- [ ] **Step 5: 若 Step 3 即报「未在语料中找到」**

说明样例句子的标点/用字与语料不完全一致。排错：`grep -n "喜欢的是赚钱" shareholders/*.md speech/*.md`（或换 grep 关键词片段）定位语料里的真实原文，照抄其**全角标点与逐字用字**替换样例引语与出处篇名，直到 `PASS`。这一步演练的正是后续全量抽取要反复做的逐字对齐。

- [ ] **Step 6: Commit**

```bash
git add tools/check_stop_doing.py "stop-doing/不可为清单.md"
git commit -m "feat: add verbatim checker for stop-doing list

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: 侧边栏顶级入口 `STOP_DOING_NAV` + BaseLayout 渲染

新增独立顶级导航常量并在侧边栏 nav 顶部渲染，不触碰 `buildSidebarSections` 的既有 `["原文","解读"]` 契约。

**Files:**
- Modify: `src/lib/navigation.ts`
- Modify: `src/layouts/BaseLayout.astro:92`（`<nav class="sidebar-nav">` 起始处）
- Test: `tests/navigation.test.ts`

- [ ] **Step 1: Write the failing test**

在 `tests/navigation.test.ts` 顶部 import 行追加 `STOP_DOING_NAV`：

```typescript
import { buildArchiveCards, buildSidebarSections, STOP_DOING_NAV } from "../src/lib/navigation";
```

并在文件末尾追加：

```typescript
describe("STOP_DOING_NAV", () => {
  it("is a top-level entry pointing at /stop-doing/", () => {
    expect(STOP_DOING_NAV).toEqual({ label: "不可为清单", href: "/stop-doing/" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/navigation.test.ts`
Expected: FAIL — `STOP_DOING_NAV` 未导出。

- [ ] **Step 3: Implement the constant**

在 `src/lib/navigation.ts` 末尾追加：

```typescript
export const STOP_DOING_NAV = { label: "不可为清单", href: "/stop-doing/" } as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/navigation.test.ts`
Expected: PASS（含既有 `["原文","解读"]` 断言仍通过）。

- [ ] **Step 5: Render in BaseLayout**

在 `src/layouts/BaseLayout.astro` 的 import 区（第 5 行 `buildSidebarSections` 那条）改为同时引入常量：

```astro
import { buildSidebarSections, STOP_DOING_NAV } from "../lib/navigation";
```

在第 31 行 `const sidebarSections = ...` 之后追加当前路径判断：

```astro
const stopDoingActive = decodeURIComponent(Astro.url.pathname).replace(/\/$/, "") === STOP_DOING_NAV.href.replace(/\/$/, "");
```

把第 92 行 `<nav class="sidebar-nav">` 之后、`{sidebarSections.map(...)}` 之前插入顶级入口：

```astro
        <nav class="sidebar-nav">
          <section class="sidebar-section">
            <ul class="sidebar-tree">
              <li>
                <a class:list={["sidebar-toplink", stopDoingActive && "is-active"]} href={STOP_DOING_NAV.href}>
                  {STOP_DOING_NAV.label}
                </a>
              </li>
            </ul>
          </section>
          {sidebarSections.map((section) => (
```

（其余 `{sidebarSections.map(...)}` 内容与闭合标签保持不变。）

- [ ] **Step 6: Run full unit tests**

Run: `npx vitest run`
Expected: PASS（全部测试，含 navigation / responsive-css 等不受影响）。

- [ ] **Step 7: Commit**

```bash
git add src/lib/navigation.ts src/layouts/BaseLayout.astro tests/navigation.test.ts
git commit -m "feat: add stop-doing top-level sidebar entry

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: 静态页 `src/pages/stop-doing.astro`

archive 外壳，渲染页眉 + 主题锚点目录 + 分组条目（提纲 + 引语 + 出处链接）。

**Files:**
- Create: `src/pages/stop-doing.astro`

- [ ] **Step 1: Write the page**

写入 `src/pages/stop-doing.astro`：

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import { loadStopDoingList } from "../lib/stop-doing";
import { buildCollectionPageSchema, canonicalUrl } from "../lib/seo";

const groups = loadStopDoingList();

const structuredData = buildCollectionPageSchema({
  title: "不可为清单",
  description: "查理·芒格逐字原话中的「不要、避免、要警惕」告诫，按主题归类。",
  pathname: "/stop-doing/",
  itemUrls: groups.map((group) => canonicalUrl(`/stop-doing/#${group.topic.slug}`))
});
---

<BaseLayout
  title="不可为清单"
  description="查理·芒格逐字原话中的「不要、避免、要警惕」告诫，按主题归类。"
  structuredData={structuredData}
>
  <section class="page">
    <p class="eyebrow">不可为清单</p>
    <h1 class="hero-title">芒格说，别做这些事。</h1>
    <p class="page-lead">以下皆为芒格逐字原话，编者只做提炼归类。每条都可回到原文出处核验。</p>

    <nav class="anchor-toc" aria-label="主题目录">
      <ul>
        {groups.map((group) => (
          <li><a href={`#${group.topic.slug}`}>{group.topic.title}</a></li>
        ))}
      </ul>
    </nav>

    {groups.map((group) => (
      <section class="stop-doing-group" id={group.topic.slug}>
        <h2>{group.topic.title}</h2>
        <ul class="stop-doing-entries">
          {group.entries.map((entry) => (
            <li class="stop-doing-entry">
              <p class="stop-doing-headline">{entry.headline}</p>
              <blockquote>
                <p>「{entry.quote}」</p>
                <footer>
                  {entry.sourceSlug ? (
                    <a href={`/sources/${entry.sourceSlug}/`}>
                      ——《{entry.sourceTitle}》{entry.sourceYear}
                    </a>
                  ) : (
                    <span>——《{entry.sourceTitle}》{entry.sourceYear}</span>
                  )}
                </footer>
              </blockquote>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </section>
</BaseLayout>
```

- [ ] **Step 2: Build to verify the page renders**

Run: `npm run build`
Expected: 构建成功；输出含 `dist/stop-doing/index.html`。验证：`test -f dist/stop-doing/index.html && echo OK` 打印 `OK`。

- [ ] **Step 3: 验证页面内容与出处链接**

Run: `grep -o "/sources/[^\"/]*/" dist/stop-doing/index.html | head` 以及 `grep -c "stop-doing-entry" dist/stop-doing/index.html`
Expected: 样例条目命中出处时，能看到 `/sources/.../` 链接；`stop-doing-entry` 计数 ≥ 1。

- [ ] **Step 4: Commit**

```bash
git add src/pages/stop-doing.astro
git commit -m "feat: add stop-doing list page

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: 页面样式

为提纲/引语/锚点目录加上与站点一致的样式。先确认 `global.css` 是否已有可复用类，再补最小新增样式。

**Files:**
- Modify: `src/styles/global.css`（追加到文件末尾）

- [ ] **Step 1: 查现有可复用类，避免重复造轮子**

Run: `grep -n "page-lead\|anchor-toc\|hero-title\|\.eyebrow\|blockquote" src/styles/global.css`
Expected: 看到 `eyebrow` / `hero-title` 等已存在（页面已复用）；`page-lead` / `anchor-toc` / `stop-doing-*` 若不存在则需新增。

- [ ] **Step 2: 追加样式**

把以下追加到 `src/styles/global.css` 末尾（仅为本任务 Step 1 中确认**不存在**的类新增；已存在的类不要重复定义）：

```css
/* 不可为清单页 */
.page-lead {
  max-width: 46rem;
  color: var(--ink-soft, #5b5446);
  line-height: 1.7;
  margin: 0 0 2rem;
}

.anchor-toc ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  list-style: none;
  padding: 0;
  margin: 0 0 2.5rem;
}

.anchor-toc a {
  font-size: 0.9rem;
  text-decoration: none;
  border-bottom: 1px dashed currentColor;
}

.stop-doing-group {
  margin: 0 0 3rem;
  scroll-margin-top: 1.5rem;
}

.stop-doing-entries {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 1.75rem;
}

.stop-doing-headline {
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.stop-doing-entry blockquote {
  margin: 0;
  padding-left: 1rem;
  border-left: 3px solid var(--rule, #d8cfbe);
}

.stop-doing-entry blockquote footer {
  margin-top: 0.4rem;
  font-size: 0.875rem;
  color: var(--ink-soft, #5b5446);
}

.sidebar-toplink {
  display: block;
  font-weight: 600;
  text-decoration: none;
  padding: 0.25rem 0;
}

.sidebar-toplink.is-active {
  text-decoration: underline;
}
```

注：`var(--ink-soft, ...)` / `var(--rule, ...)` 用了带回退值的 CSS 变量——即便站点未定义这些变量，回退色也保证可用。

- [ ] **Step 3: Build to verify styles compile**

Run: `npm run build`
Expected: 构建成功，无 CSS 报错。

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "style: add stop-doing list page styles

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: SEO 收录（sitemap + llms.txt）

**Files:**
- Modify: `src/lib/seo.ts:191-205`（`buildSitemapEntries`）、`src/lib/seo.ts:219-242`（`buildLlmsTxt`）
- Test: `tests/seo.test.ts`

- [ ] **Step 1: Write the failing tests**

在 `tests/seo.test.ts` 的 `"builds sitemap entries for core routes and corpus pages"` 测试体内，`urls` 定义之后追加：

```typescript
    expect(urls).toContain("https://munger.ayaseeri.com/stop-doing/");
```

在 `"builds concise llms.txt with core entry points and citation guidance"` 测试体末尾追加：

```typescript
    expect(text).toContain("https://munger.ayaseeri.com/stop-doing/");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/seo.test.ts`
Expected: FAIL — sitemap / llms.txt 尚未包含 `/stop-doing/`。

- [ ] **Step 3: Update `buildSitemapEntries`**

在 `src/lib/seo.ts` 的 `buildSitemapEntries` 返回数组里，把 `{ url: canonicalUrl("/topics/") }` 之后插入一行（紧跟首页/主题入口、文章之前）：

```typescript
    { url: canonicalUrl("/") },
    { url: canonicalUrl("/stop-doing/") },
    { url: canonicalUrl("/topics/") },
```

（即在现有 `{ url: canonicalUrl("/") },` 与 `{ url: canonicalUrl("/topics/") },` 之间加入 `{ url: canonicalUrl("/stop-doing/") },`。）

- [ ] **Step 4: Update `buildLlmsTxt`**

在 `buildLlmsTxt` 的「## 主要入口」列表里，`首页` 之后加入一行：

```typescript
    "## 主要入口",
    `- 首页: ${canonicalUrl("/")}`,
    `- 不可为清单: ${canonicalUrl("/stop-doing/")}`,
    `- 主题索引: ${canonicalUrl("/topics/")}`,
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/seo.test.ts`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add src/lib/seo.ts tests/seo.test.ts
git commit -m "feat: include stop-doing page in sitemap and llms.txt

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: 把 Python 校验接入 `validate:content` 门槛

**Files:**
- Modify: `package.json:11`（`validate:content` 脚本）

- [ ] **Step 1: 修改脚本**

把 `package.json` 中：

```json
    "validate:content": "node scripts/validate-site-content.mjs",
```

改为：

```json
    "validate:content": "node scripts/validate-site-content.mjs && python3 tools/check_stop_doing.py",
```

- [ ] **Step 2: 验证 validate:content**

Run: `npm run validate:content`
Expected: 先跑 Node 文章校验（无新增报错），再跑 `check_stop_doing.py` 打印 `PASS`，整体 exit 0。

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "build: run stop-doing checker in validate:content gate

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: 穷尽式全量抽取并灌入内容（并行 agent 流水线）

代码骨架已全部跑通。此任务把样例内容替换为穷尽式抽取的全量「不可为」条目。这是**内容生产**任务，沿用 essay 流水线惯例：并行 reader → 归类汇入 → 逐字校验 → 独立事实核查。

**Files:**
- Modify（全量替换）: `stop-doing/不可为清单.md`

- [ ] **Step 1: 分片并行扫描原语料**

对 `shareholders/`（约 30 篇）+ `speech/`（约 40 篇）分片，分给多个 reader agent。每个 agent 的任务：在分到的原文里，**只**摘芒格**本人**说的否定/告诫句——触发词包括「不要 / 别 / 不能 / 不应 / 避免 / 切忌 / 千万别 / 最蠢的 / 最危险的 / 最大的错误 / 要警惕 / 我们从不 / 我们绝不」等。逐字摘录原句（含全角标点）+ 记录篇名与年份。**明确排除**采访者、巴菲特、听众的发言（访谈类文件尤其要分辨说话人）。每条产出：`{逐字原句, 篇名, 年份, 建议归入的主题}`。

- [ ] **Step 2: 归类并写入内容文件**

把所有摘录条目按 8 个 TOPIC（`投资原则 / 思维方法 / 人性偏误 / 品格处世 / 常引用人物 / 公司案例 / 学科体系 / 宏观警示`）归类，为每条写一句编者提纲（「不要 X」句式，是编者的话不是引语），写成：

```markdown
## <主题 title，须精确等于 site.ts>

### <编者提纲：不要 X>
> 「<芒格逐字原句，全角标点>」
> ——《<篇名>》<年份>
```

全量替换 `stop-doing/不可为清单.md`（保留文件开头的 `# 不可为清单` 标题与 `> 以下皆为芒格逐字原话…` 引导句）。空主题（如「常引用人物」无合适条目）直接不写该 `##` 节。

- [ ] **Step 3: 逐字校验，修到全绿**

Run: `python3 tools/check_stop_doing.py`
Expected: `PASS`。若报「未在语料中找到」：99% 是 (a) ASCII 标点没写成全角 `，。？；`，或 (b) 错字/漏字/多字。用 `grep -n "<句子片段>" shareholders/*.md speech/*.md` 定位语料原文，照抄修正。逐条修到 `PASS`。

- [ ] **Step 4: 独立事实核查**

对每条（或分片）派 fact-checker agent，回读被引用的出处原文，确认：①确为芒格**本人**所说（非采访者/巴菲特/听众）；②篇名、年份正确；③否定语义没有在翻译中被扭转成肯定（如把「不要做空」误摘成支持做空的上下文）。修正所有不符项后重跑 Step 3 确保仍 `PASS`。

- [ ] **Step 5: Commit**

```bash
git add "stop-doing/不可为清单.md"
git commit -m "content: populate stop-doing list from corpus (verbatim)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: 全门槛验收

**Files:** 无（仅运行门槛）

- [ ] **Step 1: 运行完整 check 门槛**

Run: `npm run check`
Expected: `validate:content`（含 `check_stop_doing.py` → `PASS`）→ `astro check`（0 errors）→ `vitest run`（全绿，含 `tests/stop-doing.test.ts`）→ `astro build`（成功）。整体 exit 0。

- [ ] **Step 2: 抽查构建产物**

Run: `test -f dist/stop-doing/index.html && grep -q "不可为清单" dist/stop-doing/index.html && grep -q "stop-doing" dist/sitemap.xml && grep -q "stop-doing" dist/llms.txt && echo ALL-OK`
Expected: 打印 `ALL-OK`（页面生成、sitemap、llms.txt 均收录）。

- [ ] **Step 3: 若有未提交改动则收尾提交**

Run: `git status --short`
若有残留改动，按所属任务归类提交；否则本计划完成。
