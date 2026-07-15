# 原文页目录与正文关键词 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为全部原文详情页增加二、三级标题目录，并根据正文实际出现的已登记文章关键词填充右侧关键词模块，同时保持真实引用数量语义不变。

**Architecture:** 在 `src/lib/relations.ts` 增加独立的正文关键词关系函数，与现有 frontmatter 来源引用映射完全分离。原文详情页分别读取 `citedBy`、正文关键词匹配结果和 `source.headings`，复用现有侧栏卡片与链接样式，不增加客户端脚本或 CSS。

**Tech Stack:** Astro 4、TypeScript、Vitest、Markdown、现有 remark 标题 slug 管线。

## Global Constraints

- 股东会与股东信、演讲与访谈、李录演讲和访谈三类原文必须使用同一规则。
- “解读引用”只由解读文章 frontmatter `sources` 与原文标题匹配产生。
- “本篇涉及的关键词”只由原文正文包含的非空 `article.keyword` 产生。
- 相同关键词只显示一次；先按 `compareArticlesForDisplay()` 排序，再保留第一个文章目标。
- “本篇目录”收录 `source.headings` 中全部 Markdown `##` 与 `###` 标题；零标题页面仍显示计数为 0 的模块。
- 复用 `info-panel`、`link-list`、`keyword-list`，不改 CSS、原文 Markdown、文章 frontmatter、自动交叉链接或移动端抽屉。
- 保留提交 `697fbb2 feat: add source page table of contents` 已落地的目录模板与页面测试，在对应任务中只补全正文关键词行为，不重复或回滚目录实现。
- 所有行为改动采用 RED → GREEN，最终运行 `npm run check`。

## File Structure

| 文件 | 责任 |
| --- | --- |
| `src/lib/relations.ts` | 新增原文正文到解读文章关键词的纯关系函数；保留现有真实引用映射。 |
| `tests/relations.test.ts` | 锁定正文匹配、空关键词过滤、重复关键词去重和引用语义隔离。 |
| `src/pages/sources/[slug].astro` | 在原文信息后显示目录，并用正文关键词关系填充关键词卡片。 |
| `tests/source-page.test.ts` | 锁定右侧栏顺序、目录锚点、关键词数据源和真实引用计数数据源。 |

---

### Task 1: 建立独立的正文关键词关系

**Files:**
- Modify: `src/lib/relations.ts:37-49`
- Modify: `tests/relations.test.ts:1-205`

**Interfaces:**
- Consumes: `compareArticlesForDisplay(a: KnowledgeArticle, b: KnowledgeArticle): number`、`OriginalSource.body`、`KnowledgeArticle.keyword`。
- Produces: `mentionedArticlesForSource(source: OriginalSource, articles: KnowledgeArticle[]): KnowledgeArticle[]`。

- [ ] **Step 1: 写入失败的正文关键词与去重测试**

在 `tests/relations.test.ts` 的 relations import 中加入 `mentionedArticlesForSource`，并在 `buildSourceArticleMap` 测试之后加入：

```ts
describe("mentionedArticlesForSource", () => {
  it("matches body keywords and keeps one stable article per keyword", () => {
    const source = {
      ...sources[0],
      body: "这篇原文讨论能力圈、护城河，也提到未登记概念。"
    } satisfies OriginalSource;
    const duplicateAbilityCircle = {
      ...articles[0],
      slug: "思维模型讲义-能力圈",
      filePath: "articles/思维模型讲义-能力圈.md",
      title: "思维模型讲义:能力圈",
      category: "思维模型讲义",
      quoteCount: 20,
      order: 1
    } satisfies KnowledgeArticle;

    expect(
      mentionedArticlesForSource(source, [
        articles[0],
        articles[1],
        articles[2],
        duplicateAbilityCircle
      ]).map((article) => [article.keyword, article.slug])
    ).toEqual([
      ["能力圈", "思维模型讲义-能力圈"],
      ["护城河", "护城河-宽且不断变宽的护城河"]
    ]);
  });

  it("keeps body mentions separate from frontmatter source citations", () => {
    const source = {
      ...sources[0],
      title: "没有被引用的李录演讲",
      body: "能力圈"
    } satisfies OriginalSource;

    expect(buildSourceArticleMap([articles[0]], [source]).get(source.slug)).toEqual([]);
    expect(mentionedArticlesForSource(source, [articles[0]]).map((article) => article.keyword)).toEqual([
      "能力圈"
    ]);
  });
});
```

- [ ] **Step 2: 运行关系测试并确认因函数缺失而失败**

Run: `npx vitest run tests/relations.test.ts`

Expected: FAIL，TypeScript/Vitest 报告 `mentionedArticlesForSource` 未从 `src/lib/relations.ts` 导出。

- [ ] **Step 3: 实现最小正文关键词匹配函数**

在 `buildSourceArticleMap()` 后加入：

```ts
export function mentionedArticlesForSource(
  source: OriginalSource,
  articles: KnowledgeArticle[]
): KnowledgeArticle[] {
  const seenKeywords = new Set<string>();

  return [...articles]
    .sort(compareArticlesForDisplay)
    .filter((article) => {
      const keyword = article.keyword.trim();
      if (!keyword || seenKeywords.has(keyword) || !source.body.includes(keyword)) {
        return false;
      }
      seenKeywords.add(keyword);
      return true;
    });
}
```

- [ ] **Step 4: 运行关系测试并确认通过**

Run: `npx vitest run tests/relations.test.ts`

Expected: PASS，`tests/relations.test.ts` 全部测试通过，正文关键词结果为“能力圈、护城河”，引用隔离结果仍为空数组。

- [ ] **Step 5: 提交关系函数与单元测试**

```bash
git add src/lib/relations.ts tests/relations.test.ts
git diff --cached --check
git commit -m "feat: derive source keywords from body"
```

### Task 2: 保留已落地目录并接入关键词卡片

**Files:**
- Modify: `src/pages/sources/[slug].astro:1-79`
- Modify: `tests/source-page.test.ts:1-24`

**Interfaces:**
- Consumes: `mentionedArticlesForSource(source, articles)`、`source.headings`、`citedBy`。
- Produces: 所有 `/sources/<slug>/` 页面固定顺序的“原文信息 → 本篇目录 → 本篇涉及的关键词 → 同类原文”右侧栏。

- [ ] **Step 1: 补全页面模板失败测试**

将 `tests/source-page.test.ts` 更新为：

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sourcePage = readFileSync("src/pages/sources/[slug].astro", "utf8");

describe("source detail page", () => {
  it("shows source information, heading directory, body keywords, and related sources in order", () => {
    const sourceInfo = sourcePage.indexOf("<h2>原文信息</h2>");
    const directory = sourcePage.indexOf("<h2>本篇目录（{source.headings.length}）</h2>");
    const keywords = sourcePage.indexOf("<h2>本篇涉及的关键词（{mentionedArticles.length}）</h2>");
    const related = sourcePage.indexOf("<h2>同类原文</h2>");

    expect(sourceInfo).toBeGreaterThanOrEqual(0);
    expect(directory).toBeGreaterThan(sourceInfo);
    expect(keywords).toBeGreaterThan(directory);
    expect(related).toBeGreaterThan(keywords);
    expect(sourcePage).toContain("const mentionedArticles = mentionedArticlesForSource(source, articles);");
    expect(sourcePage).toContain("source.headings.map((heading) => (");
    expect(sourcePage).toContain('<li><a href={`#${heading.slug}`}>{heading.text}</a></li>');
    expect(sourcePage).toContain("mentionedArticles.map((article) => (");
    expect(sourcePage).toContain('<li><a href={`/articles/${article.slug}/`}>{article.keyword}</a></li>');
    expect(sourcePage).toContain("<p>{citedBy.length} 篇解读引用</p>");
  });
});
```

- [ ] **Step 2: 运行页面测试并确认关键词数据源断言失败**

Run: `npx vitest run tests/source-page.test.ts`

Expected: FAIL；当前模板仍包含 `本篇涉及的关键词（{citedBy.length}）`，且没有 `mentionedArticlesForSource` 或 `mentionedArticles`。

- [ ] **Step 3: 用独立正文关系接入关键词卡片并保留现有目录**

把 relations import 改为：

```ts
import {
  buildSourceArticleMap,
  mentionedArticlesForSource,
  sameYearSources
} from "../../lib/relations";
```

在 `citedBy` 后加入：

```ts
const mentionedArticles = mentionedArticlesForSource(source, articles);
```

保持提交 `697fbb2` 中“原文信息”后的目录卡片不变：

```astro
<section class="info-panel">
  <h2>本篇目录（{source.headings.length}）</h2>
  <ul class="link-list">
    {source.headings.map((heading) => (
      <li><a href={`#${heading.slug}`}>{heading.text}</a></li>
    ))}
  </ul>
</section>
```

将关键词卡片替换为：

```astro
<section class="info-panel">
  <h2>本篇涉及的关键词（{mentionedArticles.length}）</h2>
  <ul class="keyword-list">
    {mentionedArticles.map((article) => (
      <li><a href={`/articles/${article.slug}/`}>{article.keyword}</a></li>
    ))}
  </ul>
</section>
```

- [ ] **Step 4: 运行聚焦测试并确认通过**

Run: `npx vitest run tests/relations.test.ts tests/source-page.test.ts`

Expected: PASS，两个测试文件全部通过。

- [ ] **Step 5: 运行完整门禁**

Run: `npm run check`

Expected: PASS；内容校验、Astro check、全部 Vitest 和 Astro 静态构建均退出 0。

- [ ] **Step 6: 检查李录构建页面的目录、关键词和引用隔离**

Run:

```bash
node --input-type=module <<'NODE'
import fs from "node:fs";

const file = "dist/sources/李录-2013年于旧金山大学的精彩演讲及学生问答实录/index.html";
const html = fs.readFileSync(file, "utf8");
const tocCount = Number(html.match(/本篇目录（(\d+)）/)?.[1] ?? 0);
const keywordCount = Number(html.match(/本篇涉及的关键词（(\d+)）/)?.[1] ?? 0);

if (tocCount < 1) throw new Error(`expected TOC entries, found ${tocCount}`);
if (keywordCount < 1) throw new Error(`expected body keywords, found ${keywordCount}`);
if (!html.includes(">能力圈</a>")) throw new Error("missing 能力圈 keyword link");
if (!html.includes("0 篇解读引用")) throw new Error("body matches changed citation count");

console.log({ tocCount, keywordCount, citations: 0 });
NODE
```

Expected: 输出的 `tocCount` 与 `keywordCount` 均大于 0，包含“能力圈”文章链接，且真实引用仍为 0。

- [ ] **Step 7: 提交页面与测试**

```bash
git add src/pages/sources/[slug].astro tests/source-page.test.ts
git diff --cached --check
git commit -m "feat: add source toc and body keywords"
```
