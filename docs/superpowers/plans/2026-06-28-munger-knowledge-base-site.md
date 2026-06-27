# Munger Knowledge Base Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static knowledge-base website from the existing `articles/`, `shareholders/`, and `speech/` Markdown content, following `docs/knowledge-base-site-design.md`.

**Architecture:** Use Astro to generate static pages. Keep source Markdown in its current directories, add TypeScript content utilities that parse front matter and corpus metadata, then render home, topic, article, source, and index pages from those utilities.

**Tech Stack:** Astro, TypeScript, Vitest, unified/remark, gray-matter, GitHub-flavored Markdown, plain CSS.

---

## File Structure

Create the Astro site in the repository root so it can read the existing content directories without moving them.

**New root files**

- `package.json`: npm scripts and dependencies.
- `astro.config.mjs`: Astro configuration for static output.
- `tsconfig.json`: TypeScript configuration.
- `vitest.config.ts`: Vitest configuration.

**New source files**

- `src/content/site.ts`: Topic groups, reading paths, and site constants.
- `src/lib/slug.ts`: Stable slug generation for Chinese filenames and source paths.
- `src/lib/markdown.ts`: Markdown loading, front matter parsing, title extraction, heading extraction, and excerpt extraction.
- `src/lib/corpus.ts`: Load `articles/`, `shareholders/`, `speech/`, and `docs/article-production/state/corpus-manifest.md`.
- `src/lib/relations.ts`: Build article-topic, article-source, source-article, and related-article relationships.
- `src/layouts/BaseLayout.astro`: Shared HTML shell, navigation, metadata, and global stylesheet import.
- `src/styles/global.css`: Visual system for the research-reading-room direction.
- `src/pages/index.astro`: Theme-map home page.
- `src/pages/topics/index.astro`: Topic index page.
- `src/pages/topics/[slug].astro`: Topic detail pages.
- `src/pages/articles/index.astro`: All articles index.
- `src/pages/articles/[slug].astro`: Article detail pages.
- `src/pages/sources/index.astro`: All original-source index.
- `src/pages/sources/[slug].astro`: Original-source detail pages.

**New tests**

- `tests/slug.test.ts`: Slug behavior.
- `tests/markdown.test.ts`: Markdown/front matter parsing behavior.
- `tests/corpus.test.ts`: Content loading and manifest parsing behavior.
- `tests/relations.test.ts`: Relationship-building behavior.

**Existing files to read but not modify**

- `docs/knowledge-base-site-design.md`
- `docs/article-production/state/article-status.md`
- `docs/article-production/state/corpus-manifest.md`
- `docs/article-production/state/keyword-registry.md`
- `docs/article-production/reference/article-index.md`
- `articles/*.md`
- `shareholders/*.md`
- `speech/*.md`

---

## Task 1: Scaffold Astro Project

**Files:**

- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Create `package.json`**

Create `package.json` with:

```json
{
  "name": "website-munger",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "astro check && vitest run"
  },
  "dependencies": {
    "@astrojs/check": "^0.9.4",
    "astro": "^4.16.18",
    "gray-matter": "^4.0.3",
    "github-slugger": "^2.0.0",
    "remark": "^15.0.1",
    "remark-gfm": "^4.0.0",
    "remark-html": "^16.0.1",
    "typescript": "^5.6.3",
    "unist-util-visit": "^5.0.0"
  },
  "devDependencies": {
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `astro.config.mjs`**

Create `astro.config.mjs` with:

```js
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: "https://example.com"
});
```

- [ ] **Step 3: Create `tsconfig.json`**

Create `tsconfig.json` with:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*", "tests/**/*", "astro.config.mjs", "vitest.config.ts"]
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

Create `vitest.config.ts` with:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"]
  }
});
```

- [ ] **Step 5: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and dependencies install without errors.

- [ ] **Step 6: Run the empty test command**

Run:

```bash
npm test -- --passWithNoTests
```

Expected: Vitest exits successfully with no tests found.

- [ ] **Step 7: Commit scaffold**

Run:

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json vitest.config.ts
git commit -m "chore: scaffold astro knowledge base"
```

Expected: Commit succeeds.

---

## Task 2: Add Slug Utilities

**Files:**

- Create: `src/lib/slug.ts`
- Test: `tests/slug.test.ts`

- [ ] **Step 1: Write failing slug tests**

Create `tests/slug.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { filePathToSlug, textToSlug } from "../src/lib/slug";

describe("textToSlug", () => {
  it("keeps readable Chinese text and removes punctuation", () => {
    expect(textToSlug("能力圈：知道自己不知道什么")).toBe("能力圈-知道自己不知道什么");
  });

  it("normalizes spaces and latin text", () => {
    expect(textToSlug("GEICO / 政府雇员保险")).toBe("geico-政府雇员保险");
  });
});

describe("filePathToSlug", () => {
  it("uses the file basename without extension", () => {
    expect(filePathToSlug("articles/能力圈-知道自己不知道什么.md")).toBe("能力圈-知道自己不知道什么");
  });

  it("normalizes source file punctuation", () => {
    expect(filePathToSlug("speech/查理芒格：2023年《最后的访谈CNBC》.md")).toBe(
      "查理芒格-2023年-最后的访谈cnbc"
    );
  });
});
```

- [ ] **Step 2: Run slug tests to verify failure**

Run:

```bash
npm test -- tests/slug.test.ts
```

Expected: FAIL because `src/lib/slug.ts` does not exist.

- [ ] **Step 3: Implement slug utilities**

Create `src/lib/slug.ts` with:

```ts
import path from "node:path";

const punctuationPattern = /[：:《》“”"'.?!！？，,、/\\|()[\]{}]+/g;
const whitespacePattern = /\s+/g;
const repeatedDashPattern = /-+/g;

export function textToSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(punctuationPattern, "-")
    .replace(whitespacePattern, "-")
    .replace(repeatedDashPattern, "-")
    .replace(/^-|-$/g, "");
}

export function filePathToSlug(filePath: string): string {
  const parsed = path.parse(filePath);
  return textToSlug(parsed.name);
}
```

- [ ] **Step 4: Run slug tests to verify pass**

Run:

```bash
npm test -- tests/slug.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit slug utilities**

Run:

```bash
git add src/lib/slug.ts tests/slug.test.ts
git commit -m "test: add stable content slugs"
```

Expected: Commit succeeds.

---

## Task 3: Add Markdown Parsing Utilities

**Files:**

- Create: `src/lib/markdown.ts`
- Test: `tests/markdown.test.ts`

- [ ] **Step 1: Write failing markdown tests**

Create `tests/markdown.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { extractExcerpt, extractHeadings, parseMarkdownDocument } from "../src/lib/markdown";

const articleMarkdown = `---
title: 多元思维模型:把知识挂上格栅
keyword: 多元思维模型
category: 思维方法
quote_count: 17
sources:
  - 论基本的、普世的智慧，及其与投资管理和商业的关系(1994)
  - 每日期刊股东会讲话(2017)
date: 2026-06-25
---

> 「你们必须在头脑中拥有一些思维模型。」

## 一、拿着一把锤子，你能看见什么

一个商学院毕业生进入咨询行业。

## 二、他怎么定义

知识的碎片毫无用处。
`;

describe("parseMarkdownDocument", () => {
  it("parses front matter and body", () => {
    const parsed = parseMarkdownDocument("articles/多元思维模型-把知识挂上格栅.md", articleMarkdown);

    expect(parsed.data.title).toBe("多元思维模型:把知识挂上格栅");
    expect(parsed.data.keyword).toBe("多元思维模型");
    expect(parsed.data.category).toBe("思维方法");
    expect(parsed.data.quote_count).toBe(17);
    expect(parsed.data.sources).toEqual([
      "论基本的、普世的智慧，及其与投资管理和商业的关系(1994)",
      "每日期刊股东会讲话(2017)"
    ]);
    expect(parsed.body).toContain("一个商学院毕业生进入咨询行业。");
  });
});

describe("extractHeadings", () => {
  it("extracts level two headings with ids", () => {
    const parsed = parseMarkdownDocument("articles/多元思维模型-把知识挂上格栅.md", articleMarkdown);

    expect(extractHeadings(parsed.body)).toEqual([
      { depth: 2, text: "一、拿着一把锤子，你能看见什么", slug: "一-拿着一把锤子-你能看见什么" },
      { depth: 2, text: "二、他怎么定义", slug: "二-他怎么定义" }
    ]);
  });
});

describe("extractExcerpt", () => {
  it("uses the first non-heading and non-quote paragraph", () => {
    const parsed = parseMarkdownDocument("articles/多元思维模型-把知识挂上格栅.md", articleMarkdown);

    expect(extractExcerpt(parsed.body, 30)).toBe("一个商学院毕业生进入咨询行业。");
  });
});
```

- [ ] **Step 2: Run markdown tests to verify failure**

Run:

```bash
npm test -- tests/markdown.test.ts
```

Expected: FAIL because `src/lib/markdown.ts` does not exist.

- [ ] **Step 3: Implement markdown utilities**

Create `src/lib/markdown.ts` with:

```ts
import matter from "gray-matter";
import { textToSlug } from "./slug";

export interface ArticleFrontMatter {
  title?: string;
  keyword?: string;
  category?: string;
  quote_count?: number;
  sources?: string[];
  date?: string;
}

export interface ParsedMarkdownDocument {
  filePath: string;
  data: ArticleFrontMatter;
  body: string;
}

export interface MarkdownHeading {
  depth: number;
  text: string;
  slug: string;
}

export function parseMarkdownDocument(filePath: string, raw: string): ParsedMarkdownDocument {
  const parsed = matter(raw);
  return {
    filePath,
    data: parsed.data as ArticleFrontMatter,
    body: parsed.content.trim()
  };
}

export function extractHeadings(body: string): MarkdownHeading[] {
  return body
    .split("\n")
    .map((line) => line.match(/^(#{2,3})\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => {
      const text = match[2].trim();
      return {
        depth: match[1].length,
        text,
        slug: textToSlug(text)
      };
    });
}

export function extractExcerpt(body: string, maxLength = 96): string {
  const paragraph =
    body
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .find((block) => block && !block.startsWith("#") && !block.startsWith(">")) ?? "";

  const singleLine = paragraph.replace(/\s+/g, " ");
  if (singleLine.length <= maxLength) {
    return singleLine;
  }
  return `${singleLine.slice(0, maxLength).replace(/[，。；、\s]+$/u, "")}...`;
}
```

- [ ] **Step 4: Run markdown tests to verify pass**

Run:

```bash
npm test -- tests/markdown.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit markdown utilities**

Run:

```bash
git add src/lib/markdown.ts tests/markdown.test.ts
git commit -m "test: add markdown parsing utilities"
```

Expected: Commit succeeds.

---

## Task 4: Add Site Taxonomy Constants

**Files:**

- Create: `src/content/site.ts`

- [ ] **Step 1: Create site constants**

Create `src/content/site.ts` with:

```ts
export interface TopicDefinition {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
}

export const SITE_TITLE = "查理·芒格知识库";
export const SITE_DESCRIPTION = "一个按主题地图组织的查理·芒格思想知识库。";

export const TOPICS: TopicDefinition[] = [
  {
    slug: "investment-principles",
    title: "投资原则",
    description: "投资判断、资本配置、长期复利和商业质量。",
    keywords: ["能力圈", "护城河", "长期持有", "复利", "内在价值", "机会成本", "资本配置", "定价权"]
  },
  {
    slug: "thinking-methods",
    title: "思维方法",
    description: "多元思维模型、逆向思维、检查清单和跨学科判断。",
    keywords: ["多元思维模型", "跨学科", "普世智慧", "逆向思维", "检查清单", "概率", "赔率", "期望值", "客观与理性"]
  },
  {
    slug: "human-misjudgment",
    title: "人性偏误",
    description: "心理倾向、误判机制、群体行为和 lollapalooza 叠加效应。",
    keywords: ["激励机制", "社会认同", "过度自信", "嫉妒", "承诺一致性倾向", "Lollapalooza", "巴甫洛夫联想"]
  },
  {
    slug: "character-conduct",
    title: "品格处世",
    description: "可靠、诚信、勤奋、好奇心和长期可信度。",
    keywords: ["诚信与声誉", "可靠", "勤奋", "好奇心", "延迟满足", "谦逊", "纪律", "自律", "避免愚蠢"]
  },
  {
    slug: "business-cases",
    title: "商业案例",
    description: "把公司作为理解芒格思想的案例载体。",
    keywords: ["喜诗糖果", "可口可乐", "比亚迪", "GEICO", "蓝筹印花", "西科金融", "每日期刊", "好市多"]
  },
  {
    slug: "people-disciplines",
    title: "人物与学科",
    description: "芒格反复引用的人物、学科和基础模型。",
    keywords: ["富兰克林", "格雷厄姆", "李光耀", "达尔文", "凯恩斯", "心理学", "工程学", "会计学", "历史"]
  }
];

export const READING_PATH_KEYWORDS = ["能力圈", "多元思维模型", "避免愚蠢", "激励机制"];
```

- [ ] **Step 2: Run TypeScript check**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit site taxonomy**

Run:

```bash
git add src/content/site.ts
git commit -m "feat: define knowledge base taxonomy"
```

Expected: Commit succeeds.

---

## Task 5: Add Corpus Loading Utilities

**Files:**

- Create: `src/lib/corpus.ts`
- Test: `tests/corpus.test.ts`

- [ ] **Step 1: Write failing corpus tests**

Create `tests/corpus.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import {
  loadArticles,
  loadCorpusManifest,
  loadOriginalSources,
  parseCorpusManifest
} from "../src/lib/corpus";

const manifestMarkdown = `# 原始语料清单

| 本地文件 | 年份 | 书名/资料名 | 类型 | 来源链接 | 清洗状态 |
|---|---|---|---|---|---|
| \`shareholders/2023年 每日期刊股东会讲话.md\` | 2023 | 2023年 每日期刊股东会讲话 | 股东信/股东会 | 未记录 | 需复核 |
| \`speech/查理芒格：2023年《最后的访谈CNBC》.md\` | 2023 | 查理芒格：2023年《最后的访谈CNBC》 | 访谈 | 未记录 | 需复核 |
`;

describe("parseCorpusManifest", () => {
  it("parses corpus rows from the manifest table", () => {
    expect(parseCorpusManifest(manifestMarkdown)).toEqual([
      {
        filePath: "shareholders/2023年 每日期刊股东会讲话.md",
        year: "2023",
        title: "2023年 每日期刊股东会讲话",
        type: "股东信/股东会",
        sourceUrl: "未记录",
        status: "需复核"
      },
      {
        filePath: "speech/查理芒格：2023年《最后的访谈CNBC》.md",
        year: "2023",
        title: "查理芒格：2023年《最后的访谈CNBC》",
        type: "访谈",
        sourceUrl: "未记录",
        status: "需复核"
      }
    ]);
  });
});

describe("loaders against repository content", () => {
  it("loads completed articles", () => {
    const articles = loadArticles();
    expect(articles.length).toBeGreaterThanOrEqual(70);
    expect(articles.find((article) => article.keyword === "能力圈")).toBeDefined();
  });

  it("loads original source files", () => {
    const sources = loadOriginalSources();
    expect(sources.length).toBeGreaterThanOrEqual(80);
    expect(sources.find((source) => source.filePath.includes("2023年 每日期刊股东会讲话"))).toBeDefined();
  });

  it("loads corpus manifest metadata", () => {
    const manifest = loadCorpusManifest();
    expect(manifest.length).toBeGreaterThanOrEqual(80);
    expect(manifest.find((entry) => entry.filePath === "shareholders/2023年 每日期刊股东会讲话.md")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run corpus tests to verify failure**

Run:

```bash
npm test -- tests/corpus.test.ts
```

Expected: FAIL because `src/lib/corpus.ts` does not exist.

- [ ] **Step 3: Implement corpus loading**

Create `src/lib/corpus.ts` with:

```ts
import fs from "node:fs";
import path from "node:path";
import { extractExcerpt, extractHeadings, parseMarkdownDocument } from "./markdown";
import { filePathToSlug } from "./slug";

const ROOT = process.cwd();

export interface KnowledgeArticle {
  slug: string;
  filePath: string;
  title: string;
  keyword: string;
  category: string;
  quoteCount: number;
  sources: string[];
  date?: string;
  excerpt: string;
  body: string;
  headings: ReturnType<typeof extractHeadings>;
}

export interface OriginalSource {
  slug: string;
  filePath: string;
  title: string;
  type: "shareholder" | "speech";
  year: string;
  excerpt: string;
  body: string;
  headings: ReturnType<typeof extractHeadings>;
}

export interface CorpusManifestEntry {
  filePath: string;
  year: string;
  title: string;
  type: string;
  sourceUrl: string;
  status: string;
}

function readMarkdownFiles(directory: "articles" | "shareholders" | "speech"): string[] {
  return fs
    .readdirSync(path.join(ROOT, directory))
    .filter((fileName) => fileName.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
    .map((fileName) => path.join(directory, fileName));
}

function readRepoFile(filePath: string): string {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function stripBackticks(value: string): string {
  return value.trim().replace(/^`|`$/g, "");
}

function inferYear(filePath: string, body: string): string {
  const fromPath = filePath.match(/(19|20)\d{2}/)?.[0];
  if (fromPath) {
    return fromPath;
  }
  const fromBody = body.match(/(19|20)\d{2}/)?.[0];
  return fromBody ?? "未标明";
}

function titleFromMarkdown(filePath: string, body: string): string {
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) {
    return heading;
  }
  return path.parse(filePath).name;
}

export function parseCorpusManifest(markdown: string): CorpusManifestEntry[] {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("| `"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length === 6)
    .map(([filePath, year, title, type, sourceUrl, status]) => ({
      filePath: stripBackticks(filePath),
      year,
      title,
      type,
      sourceUrl,
      status
    }));
}

export function loadCorpusManifest(): CorpusManifestEntry[] {
  return parseCorpusManifest(readRepoFile("docs/article-production/state/corpus-manifest.md"));
}

export function loadArticles(): KnowledgeArticle[] {
  return readMarkdownFiles("articles").map((filePath) => {
    const parsed = parseMarkdownDocument(filePath, readRepoFile(filePath));
    return {
      slug: filePathToSlug(filePath),
      filePath,
      title: parsed.data.title ?? path.parse(filePath).name,
      keyword: parsed.data.keyword ?? path.parse(filePath).name.split("-")[0],
      category: parsed.data.category ?? "未分类",
      quoteCount: parsed.data.quote_count ?? 0,
      sources: parsed.data.sources ?? [],
      date: parsed.data.date,
      excerpt: extractExcerpt(parsed.body),
      body: parsed.body,
      headings: extractHeadings(parsed.body)
    };
  });
}

export function loadOriginalSources(): OriginalSource[] {
  return (["shareholders", "speech"] as const).flatMap((directory) =>
    readMarkdownFiles(directory).map((filePath) => {
      const raw = readRepoFile(filePath);
      const parsed = parseMarkdownDocument(filePath, raw);
      const title = titleFromMarkdown(filePath, parsed.body);
      return {
        slug: filePathToSlug(filePath),
        filePath,
        title,
        type: directory === "shareholders" ? "shareholder" : "speech",
        year: inferYear(filePath, parsed.body),
        excerpt: extractExcerpt(parsed.body),
        body: parsed.body,
        headings: extractHeadings(parsed.body)
      };
    })
  );
}
```

- [ ] **Step 4: Run corpus tests to verify pass**

Run:

```bash
npm test -- tests/corpus.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit corpus utilities**

Run:

```bash
git add src/lib/corpus.ts tests/corpus.test.ts
git commit -m "test: load munger corpus content"
```

Expected: Commit succeeds.

---

## Task 6: Add Relationship Builders

**Files:**

- Create: `src/lib/relations.ts`
- Test: `tests/relations.test.ts`

- [ ] **Step 1: Write failing relationship tests**

Create `tests/relations.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { TOPICS } from "../src/content/site";
import type { KnowledgeArticle, OriginalSource } from "../src/lib/corpus";
import {
  articlesForTopic,
  buildSourceArticleMap,
  relatedArticles,
  sourcesForArticle
} from "../src/lib/relations";

const articles = [
  {
    slug: "能力圈-知道自己不知道什么",
    filePath: "articles/能力圈-知道自己不知道什么.md",
    title: "能力圈:知道自己不知道什么",
    keyword: "能力圈",
    category: "投资原则",
    quoteCount: 16,
    sources: ["每日期刊股东会讲话(2017)"],
    excerpt: "知道边界，比拥有能力更重要。",
    body: "",
    headings: []
  },
  {
    slug: "护城河-宽且不断变宽的护城河",
    filePath: "articles/护城河-宽且不断变宽的护城河.md",
    title: "护城河:宽且不断变宽的护城河",
    keyword: "护城河",
    category: "投资原则",
    quoteCount: 18,
    sources: ["西科金融股东会讲话(2002)"],
    excerpt: "最深的护城河，是每天都在变宽的那条。",
    body: "",
    headings: []
  },
  {
    slug: "多元思维模型-把知识挂上格栅",
    filePath: "articles/多元思维模型-把知识挂上格栅.md",
    title: "多元思维模型:把知识挂上格栅",
    keyword: "多元思维模型",
    category: "思维方法",
    quoteCount: 17,
    sources: ["每日期刊股东会讲话(2017)"],
    excerpt: "手里只有一把锤子，看什么都像钉子。",
    body: "",
    headings: []
  }
] satisfies KnowledgeArticle[];

const sources = [
  {
    slug: "2017年-每日期刊股东会讲话",
    filePath: "shareholders/2017年 每日期刊股东会讲话.md",
    title: "2017年 每日期刊股东会讲话",
    type: "shareholder",
    year: "2017",
    excerpt: "",
    body: "",
    headings: []
  },
  {
    slug: "2002年-西科金融股东会讲话",
    filePath: "shareholders/2002年 西科金融股东会讲话.md",
    title: "2002年 西科金融股东会讲话",
    type: "shareholder",
    year: "2002",
    excerpt: "",
    body: "",
    headings: []
  }
] satisfies OriginalSource[];

describe("articlesForTopic", () => {
  it("matches topic keywords and categories", () => {
    const topic = TOPICS.find((item) => item.slug === "investment-principles");
    expect(topic).toBeDefined();
    expect(articlesForTopic(articles, topic!).map((article) => article.keyword)).toEqual(["护城河", "能力圈"]);
  });
});

describe("sourcesForArticle", () => {
  it("matches source labels to source titles", () => {
    expect(sourcesForArticle(articles[0], sources).map((source) => source.title)).toEqual([
      "2017年 每日期刊股东会讲话"
    ]);
  });
});

describe("buildSourceArticleMap", () => {
  it("maps original sources back to articles", () => {
    const map = buildSourceArticleMap(articles, sources);
    expect(map.get("2017年-每日期刊股东会讲话")?.map((article) => article.keyword)).toEqual([
      "能力圈",
      "多元思维模型"
    ]);
  });
});

describe("relatedArticles", () => {
  it("returns same-category articles before unrelated articles", () => {
    expect(relatedArticles(articles[0], articles).map((article) => article.keyword)).toEqual(["护城河"]);
  });
});
```

- [ ] **Step 2: Run relationship tests to verify failure**

Run:

```bash
npm test -- tests/relations.test.ts
```

Expected: FAIL because `src/lib/relations.ts` does not exist.

- [ ] **Step 3: Implement relationship utilities**

Create `src/lib/relations.ts` with:

```ts
import type { TopicDefinition } from "../content/site";
import type { KnowledgeArticle, OriginalSource } from "./corpus";

function sourceLabelMatchesTitle(label: string, title: string): boolean {
  const normalizedLabel = label.replace(/\s+/g, "");
  const normalizedTitle = title.replace(/\s+/g, "");
  const labelWithoutYear = normalizedLabel.replace(/[（(](19|20)\d{2}[）)]/g, "");
  return normalizedTitle.includes(labelWithoutYear) || labelWithoutYear.includes(normalizedTitle);
}

export function articlesForTopic(articles: KnowledgeArticle[], topic: TopicDefinition): KnowledgeArticle[] {
  return articles
    .filter((article) => {
      if (article.category === topic.title) {
        return true;
      }
      return topic.keywords.some((keyword) => article.keyword.includes(keyword) || article.title.includes(keyword));
    })
    .sort((a, b) => b.quoteCount - a.quoteCount || a.title.localeCompare(b.title, "zh-Hans-CN"));
}

export function sourcesForArticle(article: KnowledgeArticle, sources: OriginalSource[]): OriginalSource[] {
  return sources
    .filter((source) => article.sources.some((sourceLabel) => sourceLabelMatchesTitle(sourceLabel, source.title)))
    .sort((a, b) => a.year.localeCompare(b.year) || a.title.localeCompare(b.title, "zh-Hans-CN"));
}

export function buildSourceArticleMap(
  articles: KnowledgeArticle[],
  sources: OriginalSource[]
): Map<string, KnowledgeArticle[]> {
  return new Map(
    sources.map((source) => [
      source.slug,
      articles.filter((article) =>
        article.sources.some((sourceLabel) => sourceLabelMatchesTitle(sourceLabel, source.title))
      )
    ])
  );
}

export function relatedArticles(article: KnowledgeArticle, articles: KnowledgeArticle[], limit = 4): KnowledgeArticle[] {
  return articles
    .filter((candidate) => candidate.slug !== article.slug && candidate.category === article.category)
    .sort((a, b) => b.quoteCount - a.quoteCount || a.title.localeCompare(b.title, "zh-Hans-CN"))
    .slice(0, limit);
}
```

- [ ] **Step 4: Run relationship tests to verify pass**

Run:

```bash
npm test -- tests/relations.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit relationship utilities**

Run:

```bash
git add src/lib/relations.ts tests/relations.test.ts
git commit -m "test: build knowledge base relations"
```

Expected: Commit succeeds.

---

## Task 7: Add Base Layout and Global Styles

**Files:**

- Create: `src/layouts/BaseLayout.astro`
- Create: `src/styles/global.css`

- [ ] **Step 1: Create base layout**

Create `src/layouts/BaseLayout.astro` with:

```astro
---
import "../styles/global.css";
import { SITE_DESCRIPTION, SITE_TITLE } from "../content/site";

interface Props {
  title?: string;
  description?: string;
}

const pageTitle = Astro.props.title ? `${Astro.props.title} | ${SITE_TITLE}` : SITE_TITLE;
const description = Astro.props.description ?? SITE_DESCRIPTION;
---

<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <title>{pageTitle}</title>
  </head>
  <body>
    <header class="site-header">
      <a class="site-brand" href="/">{SITE_TITLE}</a>
      <nav class="site-nav" aria-label="主导航">
        <a href="/topics/">主题</a>
        <a href="/articles/">文章</a>
        <a href="/sources/">原文</a>
      </nav>
    </header>
    <main>
      <slot />
    </main>
    <footer class="site-footer">
      <p>基于本仓库的文章、股东会资料、演讲与访谈生成。</p>
    </footer>
  </body>
</html>
```

- [ ] **Step 2: Create global styles**

Create `src/styles/global.css` with:

```css
:root {
  color-scheme: light;
  --bg: #f7f5ef;
  --paper: #fffefa;
  --ink: #23211c;
  --muted: #69645b;
  --line: #d8d1c3;
  --accent: #7f3f2a;
  --accent-soft: #efe2da;
  --mark: #1f5c63;
  --max: 1160px;
  --reading: 760px;
  font-family: "Noto Serif SC", "Songti SC", "STSong", serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  line-height: 1.75;
}

a {
  color: var(--mark);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.18em;
}

.site-header,
.site-footer {
  max-width: var(--max);
  margin: 0 auto;
  padding: 22px 24px;
}

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
}

.site-brand {
  color: var(--ink);
  font-size: 20px;
  font-weight: 700;
  text-decoration: none;
}

.site-nav {
  display: flex;
  gap: 18px;
  font-size: 15px;
}

.site-nav a {
  color: var(--muted);
  text-decoration: none;
}

.site-nav a:hover,
.site-nav a:focus-visible {
  color: var(--accent);
}

.site-footer {
  color: var(--muted);
  border-top: 1px solid var(--line);
  font-size: 14px;
}

.page {
  max-width: var(--max);
  margin: 0 auto;
  padding: 44px 24px 72px;
}

.reading-page {
  max-width: var(--reading);
  margin: 0 auto;
  padding: 44px 24px 72px;
}

.eyebrow {
  color: var(--accent);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0;
}

.hero-title {
  max-width: 860px;
  margin: 10px 0 16px;
  font-size: clamp(36px, 6vw, 72px);
  line-height: 1.08;
  letter-spacing: 0;
}

.hero-copy {
  max-width: 720px;
  color: var(--muted);
  font-size: 18px;
}

.section-title {
  margin: 48px 0 18px;
  font-size: 26px;
  line-height: 1.25;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.card {
  min-height: 168px;
  padding: 18px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 6px;
}

.card h2,
.card h3 {
  margin: 0 0 8px;
  line-height: 1.3;
}

.card p {
  margin: 0 0 12px;
  color: var(--muted);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0;
  margin: 12px 0 0;
  list-style: none;
}

.tag-list a,
.tag-list span {
  display: inline-flex;
  padding: 3px 9px;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 999px;
  font-size: 13px;
  text-decoration: none;
}

.meta {
  color: var(--muted);
  font-size: 14px;
}

.article-body {
  font-size: 18px;
}

.article-body blockquote {
  margin: 28px 0;
  padding: 18px 22px;
  background: var(--paper);
  border-left: 4px solid var(--accent);
}

.article-body h2,
.article-body h3 {
  margin-top: 42px;
  line-height: 1.35;
}

.article-body img {
  max-width: 100%;
  height: auto;
}

.split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 32px;
}

.side-panel {
  position: sticky;
  top: 18px;
  align-self: start;
  padding: 16px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 14px;
}

@media (max-width: 800px) {
  .site-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .split {
    grid-template-columns: 1fr;
  }

  .side-panel {
    position: static;
  }
}
```

- [ ] **Step 3: Run Astro check**

Run:

```bash
npm run check
```

Expected: PASS.

- [ ] **Step 4: Commit layout and styles**

Run:

```bash
git add src/layouts/BaseLayout.astro src/styles/global.css
git commit -m "feat: add knowledge base layout"
```

Expected: Commit succeeds.

---

## Task 8: Add Home and Topic Pages

**Files:**

- Create: `src/pages/index.astro`
- Create: `src/pages/topics/index.astro`
- Create: `src/pages/topics/[slug].astro`

- [ ] **Step 1: Create home page**

Create `src/pages/index.astro` with:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import { READING_PATH_KEYWORDS, TOPICS } from "../content/site";
import { loadArticles, loadOriginalSources } from "../lib/corpus";

const articles = loadArticles();
const sources = loadOriginalSources();
const readingPath = READING_PATH_KEYWORDS.map((keyword) =>
  articles.find((article) => article.keyword.includes(keyword) || article.title.includes(keyword))
).filter(Boolean);
const featured = articles.slice().sort((a, b) => b.quoteCount - a.quoteCount).slice(0, 6);
---

<BaseLayout title="首页">
  <section class="page">
    <p class="eyebrow">主题地图</p>
    <h1 class="hero-title">从主题进入芒格，而不是从语录进入芒格。</h1>
    <p class="hero-copy">
      这里把现有 {articles.length} 篇解释文章、{sources.length} 篇原文资料组织成一个可阅读、可追溯的知识库。
    </p>

    <h2 class="section-title">六条主线</h2>
    <div class="grid">
      {TOPICS.map((topic) => (
        <article class="card">
          <h2><a href={`/topics/${topic.slug}/`}>{topic.title}</a></h2>
          <p>{topic.description}</p>
          <ul class="tag-list">
            {topic.keywords.slice(0, 6).map((keyword) => <li><span>{keyword}</span></li>)}
          </ul>
        </article>
      ))}
    </div>

    <h2 class="section-title">新读者路径</h2>
    <div class="grid">
      {readingPath.map((article) => (
        <article class="card">
          <h3><a href={`/articles/${article.slug}/`}>{article.title}</a></h3>
          <p>{article.excerpt}</p>
          <p class="meta">{article.quoteCount} 处引用</p>
        </article>
      ))}
    </div>

    <h2 class="section-title">高引用文章</h2>
    <div class="grid">
      {featured.map((article) => (
        <article class="card">
          <h3><a href={`/articles/${article.slug}/`}>{article.title}</a></h3>
          <p>{article.excerpt}</p>
          <p class="meta">{article.category} / {article.quoteCount} 处引用</p>
        </article>
      ))}
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Create topics index**

Create `src/pages/topics/index.astro` with:

```astro
---
import { TOPICS } from "../../content/site";
import BaseLayout from "../../layouts/BaseLayout.astro";
---

<BaseLayout title="主题">
  <section class="page">
    <p class="eyebrow">主题索引</p>
    <h1 class="hero-title">芒格思想的六个入口。</h1>
    <div class="grid">
      {TOPICS.map((topic) => (
        <article class="card">
          <h2><a href={`/topics/${topic.slug}/`}>{topic.title}</a></h2>
          <p>{topic.description}</p>
          <ul class="tag-list">
            {topic.keywords.map((keyword) => <li><span>{keyword}</span></li>)}
          </ul>
        </article>
      ))}
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 3: Create dynamic topic page**

Create `src/pages/topics/[slug].astro` with:

```astro
---
import { TOPICS } from "../../content/site";
import BaseLayout from "../../layouts/BaseLayout.astro";
import { loadArticles, loadOriginalSources } from "../../lib/corpus";
import { articlesForTopic, sourcesForArticle } from "../../lib/relations";

export function getStaticPaths() {
  return TOPICS.map((topic) => ({ params: { slug: topic.slug }, props: { topic } }));
}

const { topic } = Astro.props;
const articles = articlesForTopic(loadArticles(), topic);
const sources = loadOriginalSources();
const researchSources = Array.from(
  new Map(
    articles
      .flatMap((article) => sourcesForArticle(article, sources))
      .map((source) => [source.slug, source])
  ).values()
).slice(0, 10);
---

<BaseLayout title={topic.title} description={topic.description}>
  <section class="page">
    <p class="eyebrow">主题</p>
    <h1 class="hero-title">{topic.title}</h1>
    <p class="hero-copy">{topic.description}</p>

    <div class="split">
      <section>
        <h2 class="section-title">解释文章</h2>
        <div class="grid">
          {articles.map((article) => (
            <article class="card">
              <h3><a href={`/articles/${article.slug}/`}>{article.title}</a></h3>
              <p>{article.excerpt}</p>
              <p class="meta">{article.quoteCount} 处引用 / {article.sources.length} 个来源</p>
            </article>
          ))}
        </div>
      </section>
      <aside class="side-panel">
        <h2>研究入口</h2>
        <ul>
          {researchSources.map((source) => (
            <li><a href={`/sources/${source.slug}/`}>{source.title}</a></li>
          ))}
        </ul>
      </aside>
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: PASS and `dist/index.html` plus topic pages are generated.

- [ ] **Step 5: Commit home and topic pages**

Run:

```bash
git add src/pages/index.astro src/pages/topics/index.astro 'src/pages/topics/[slug].astro'
git commit -m "feat: add topic map pages"
```

Expected: Commit succeeds.

---

## Task 9: Add Article Pages

**Files:**

- Create: `src/pages/articles/index.astro`
- Create: `src/pages/articles/[slug].astro`

- [ ] **Step 1: Create article index page**

Create `src/pages/articles/index.astro` with:

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import { loadArticles } from "../../lib/corpus";

const articles = loadArticles().sort((a, b) => a.category.localeCompare(b.category, "zh-Hans-CN") || b.quoteCount - a.quoteCount);
---

<BaseLayout title="全部文章">
  <section class="page">
    <p class="eyebrow">解释层</p>
    <h1 class="hero-title">全部专题文章。</h1>
    <div class="grid">
      {articles.map((article) => (
        <article class="card">
          <h2><a href={`/articles/${article.slug}/`}>{article.title}</a></h2>
          <p>{article.excerpt}</p>
          <p class="meta">{article.category} / {article.quoteCount} 处引用 / {article.sources.length} 个来源</p>
        </article>
      ))}
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Create article detail page**

Create `src/pages/articles/[slug].astro` with:

```astro
---
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import BaseLayout from "../../layouts/BaseLayout.astro";
import { loadArticles, loadOriginalSources } from "../../lib/corpus";
import { relatedArticles, sourcesForArticle } from "../../lib/relations";

export function getStaticPaths() {
  return loadArticles().map((article) => ({ params: { slug: article.slug }, props: { article } }));
}

const { article } = Astro.props;
const allArticles = loadArticles();
const sources = loadOriginalSources();
const matchedSources = sourcesForArticle(article, sources);
const related = relatedArticles(article, allArticles);
const rendered = await remark().use(remarkGfm).use(remarkHtml).process(article.body);
---

<BaseLayout title={article.title} description={article.excerpt}>
  <article class="page">
    <p class="eyebrow">{article.category}</p>
    <h1 class="hero-title">{article.title}</h1>
    <p class="hero-copy">{article.excerpt}</p>
    <p class="meta">{article.quoteCount} 处引用 / {article.sources.length} 个来源</p>

    <div class="split">
      <div class="article-body" set:html={rendered.toString()} />
      <aside class="side-panel">
        <h2>目录</h2>
        <ul>
          {article.headings.map((heading) => (
            <li><a href={`#${heading.slug}`}>{heading.text}</a></li>
          ))}
        </ul>

        <h2>来源追溯</h2>
        <ul>
          {matchedSources.map((source) => (
            <li><a href={`/sources/${source.slug}/`}>{source.title}</a></li>
          ))}
          {matchedSources.length === 0 && article.sources.map((sourceLabel) => <li>{sourceLabel}</li>)}
        </ul>

        <h2>相关主题</h2>
        <ul>
          {related.map((item) => (
            <li><a href={`/articles/${item.slug}/`}>{item.keyword}</a></li>
          ))}
        </ul>
      </aside>
    </div>
  </article>
</BaseLayout>
```

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS and article pages are generated under `dist/articles/`.

- [ ] **Step 4: Commit article pages**

Run:

```bash
git add src/pages/articles/index.astro 'src/pages/articles/[slug].astro'
git commit -m "feat: add article pages"
```

Expected: Commit succeeds.

---

## Task 10: Add Original Source Pages

**Files:**

- Create: `src/pages/sources/index.astro`
- Create: `src/pages/sources/[slug].astro`

- [ ] **Step 1: Create source index page**

Create `src/pages/sources/index.astro` with:

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import { loadOriginalSources } from "../../lib/corpus";

const sources = loadOriginalSources().sort((a, b) => a.year.localeCompare(b.year) || a.title.localeCompare(b.title, "zh-Hans-CN"));
---

<BaseLayout title="原文资料">
  <section class="page">
    <p class="eyebrow">原文语境层</p>
    <h1 class="hero-title">股东会、演讲、访谈与声明。</h1>
    <div class="grid">
      {sources.map((source) => (
        <article class="card">
          <h2><a href={`/sources/${source.slug}/`}>{source.title}</a></h2>
          <p>{source.excerpt}</p>
          <p class="meta">{source.year} / {source.type === "shareholder" ? "股东会与股东信" : "演讲与访谈"}</p>
        </article>
      ))}
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Create source detail page**

Create `src/pages/sources/[slug].astro` with:

```astro
---
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import BaseLayout from "../../layouts/BaseLayout.astro";
import { loadArticles, loadOriginalSources } from "../../lib/corpus";
import { buildSourceArticleMap } from "../../lib/relations";

export function getStaticPaths() {
  return loadOriginalSources().map((source) => ({ params: { slug: source.slug }, props: { source } }));
}

const { source } = Astro.props;
const articles = loadArticles();
const sourceArticleMap = buildSourceArticleMap(articles, loadOriginalSources());
const citedBy = sourceArticleMap.get(source.slug) ?? [];
const sameYear = loadOriginalSources()
  .filter((item) => item.slug !== source.slug && item.year === source.year)
  .slice(0, 8);
const rendered = await remark().use(remarkGfm).use(remarkHtml).process(source.body);
---

<BaseLayout title={source.title} description={source.excerpt}>
  <article class="page">
    <p class="eyebrow">{source.type === "shareholder" ? "股东会与股东信" : "演讲与访谈"}</p>
    <h1 class="hero-title">{source.title}</h1>
    <p class="meta">{source.year}</p>

    <div class="split">
      <div class="article-body" set:html={rendered.toString()} />
      <aside class="side-panel">
        <h2>被这些文章引用</h2>
        <ul>
          {citedBy.map((article) => (
            <li><a href={`/articles/${article.slug}/`}>{article.keyword}</a></li>
          ))}
        </ul>

        <h2>同年份资料</h2>
        <ul>
          {sameYear.map((item) => (
            <li><a href={`/sources/${item.slug}/`}>{item.title}</a></li>
          ))}
        </ul>
      </aside>
    </div>
  </article>
</BaseLayout>
```

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS and source pages are generated under `dist/sources/`.

- [ ] **Step 4: Commit source pages**

Run:

```bash
git add src/pages/sources/index.astro 'src/pages/sources/[slug].astro'
git commit -m "feat: add original source pages"
```

Expected: Commit succeeds.

---

## Task 11: Add Build-Time Content Validation

**Files:**

- Create: `scripts/validate-site-content.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create validation script**

Create `scripts/validate-site-content.mjs` with:

```js
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const articlesDir = path.join(root, "articles");

const articleFiles = fs
  .readdirSync(articlesDir)
  .filter((fileName) => fileName.endsWith(".md"))
  .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

const errors = [];

for (const fileName of articleFiles) {
  const filePath = path.join(articlesDir, fileName);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const required = ["title", "keyword", "category", "quote_count", "sources"];

  for (const key of required) {
    if (parsed.data[key] === undefined) {
      errors.push(`${path.relative(root, filePath)} missing front matter field: ${key}`);
    }
  }

  if (!Array.isArray(parsed.data.sources) || parsed.data.sources.length === 0) {
    errors.push(`${path.relative(root, filePath)} must include at least one source`);
  }

  if (typeof parsed.data.quote_count !== "number" || parsed.data.quote_count < 1) {
    errors.push(`${path.relative(root, filePath)} must include positive quote_count`);
  }
}

if (articleFiles.length < 70) {
  errors.push(`expected at least 70 articles, found ${articleFiles.length}`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${articleFiles.length} article files.`);
```

- [ ] **Step 2: Modify `package.json` scripts**

Update the `scripts` object in `package.json` to:

```json
{
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "validate:content": "node scripts/validate-site-content.mjs",
  "check": "npm run validate:content && astro check && vitest run && astro build"
}
```

- [ ] **Step 3: Run content validation**

Run:

```bash
npm run validate:content
```

Expected: PASS with output like `Validated 70 article files.`

- [ ] **Step 4: Run full check**

Run:

```bash
npm run check
```

Expected: PASS.

- [ ] **Step 5: Commit validation**

Run:

```bash
git add package.json scripts/validate-site-content.mjs
git commit -m "test: validate site content metadata"
```

Expected: Commit succeeds.

---

## Task 12: Final Verification and Handoff

**Files:**

- Modify: `docs/knowledge-base-site-design.md` only if implementation discovers a design mismatch that must be recorded.

- [ ] **Step 1: Run complete verification**

Run:

```bash
npm run check
```

Expected: PASS, including content validation, Astro check, Vitest tests, and static build.

- [ ] **Step 2: Run whitespace check**

Run:

```bash
git diff --check
```

Expected: PASS with no output.

- [ ] **Step 3: Inspect generated route count**

Run:

```bash
find dist -name 'index.html' | wc -l
```

Expected: output is at least `150`, covering home, topic pages, article pages, source pages, and index pages.

- [ ] **Step 4: Check worktree state**

Run:

```bash
git status --short
```

Expected: no uncommitted files after the final commit. If generated `dist/` is untracked, add `dist/` to `.gitignore` and commit that ignore rule.

- [ ] **Step 5: Final commit if needed**

If Step 4 shows `.gitignore` or documentation changes, run:

```bash
git add .gitignore docs/knowledge-base-site-design.md
git commit -m "docs: align knowledge base site handoff"
```

Expected: Commit succeeds only if those files changed.

---

## Self-Review

### Spec Coverage

- Theme-map home page: Task 8.
- Six main topic columns: Task 4 and Task 8.
- Article page structure with metadata, table of contents, source tracing, and related articles: Task 9.
- Original source page structure with year, type, cited-by articles, and same-year sources: Task 10.
- Basic index pages for articles, sources, and topics: Task 8, Task 9, Task 10.
- Front matter fields `title`, `keyword`, `category`, `quote_count`, `sources`: Task 3, Task 5, Task 11.
- Original source index from directories and filenames: Task 5 and Task 10.
- First-version exclusions such as full-text search, exact quote highlighting, accounts, external fetching, and article rewriting: not implemented by design.

### Placeholder Scan

The plan contains no open implementation placeholders. The only future-facing content is in the already-approved design scope, not in the executable task steps.

### Type Consistency

- Article type is `KnowledgeArticle` across corpus, relations, and pages.
- Source type is `OriginalSource` across corpus, relations, and pages.
- Topic type is `TopicDefinition` across taxonomy and relations.
- Slugs are generated through `filePathToSlug` and consumed consistently by route paths.
