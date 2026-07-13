# 思维格栅栏目 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 178 篇思维模型的独立快照接入网站，提供左侧“思维格栅”入口、十二层索引和模型阅读页。

**Architecture:** 将源目录的 180 个 Markdown 文件一次性复制到仓库根目录 `thinking-grids/`。新的加载器把索引和 178 篇模型解析为独立内容类型；新路由使用该加载器生成静态页面。Markdown 渲染器只在该内容类型中重写有效的模型相对链接，避免改变现有文章链接规则。

**Tech Stack:** Astro 4 静态路由、TypeScript、Vitest、remark/remark-gfm、gray-matter。

## Global Constraints

- 复制来源 `/Users/ruimin/Desktop/code/learn-from-book/EPUB/mental-models/models/`，不建立同步、符号链接或构建时外部读取。
- 快照目录固定为 `thinking-grids/`；其中 `思维格栅.md` 是索引，`README.md` 不是模型页，剩余 178 个 Markdown 文件是模型页。
- “思维格栅”是左侧顶级入口，不能加入“解读”折叠组或现有 `TOPICS`。
- 只将存在于快照内的相对 `.md` 链接改为本站模型链接；锚点和外部链接不变，其他相对本地文档链接显示为纯文字。
- 不改动既有文章、原文资料、主题分类、排序和站点主题。

---

## File Structure

| 文件 | 职责 |
| --- | --- |
| `thinking-grids/*.md` | 由外部模型库复制进来的静态快照（180 个 Markdown 文件）。 |
| `src/lib/thinking-grid.ts` | 验证快照、解析索引与模型、提供站内模型 URL 和相对链接解析。 |
| `src/lib/render.ts` | 对可选的相对 Markdown 链接解析器进行 AST 级重写或解链。 |
| `src/lib/navigation.ts` | 定义顶级“思维格栅”导航入口。 |
| `src/layouts/BaseLayout.astro` | 将新的顶级入口渲染在左侧并标识当前页。 |
| `src/pages/thinking-grids/index.astro` | 生成索引页和 CollectionPage 结构化数据。 |
| `src/pages/thinking-grids/[slug].astro` | 为每个模型生成阅读页与面包屑/CreativeWork 结构化数据。 |
| `tests/thinking-grid.test.ts` | 锁定快照规模、加载器、链接解析与错误信息。 |
| `tests/markdown.test.ts` | 锁定相对 Markdown 链接重写行为。 |
| `tests/navigation.test.ts` | 锁定顶级导航入口常量。 |

### Task 1: 导入并验证独立内容快照

**Files:**
- Create: `tests/thinking-grid.test.ts`
- Create: `thinking-grids/*.md`（从模型源目录复制 180 个 Markdown 文件）

**Interfaces:**
- Consumes: 外部源目录 `mental-models/models/`。
- Produces: 本仓库内、无需外部文件系统即可读取的 `thinking-grids/` 快照。

- [ ] **Step 1: 写入会失败的快照规模测试**

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const snapshotDirectory = path.join(process.cwd(), "thinking-grids");

describe("thinking grid snapshot", () => {
  it("contains the index, README, and 178 model documents", () => {
    expect(fs.existsSync(snapshotDirectory)).toBe(true);
    const fileNames = fs.readdirSync(snapshotDirectory).filter((fileName) => fileName.endsWith(".md"));
    expect(fileNames).toHaveLength(180);
    expect(fileNames).toContain("思维格栅.md");
    expect(fileNames).toContain("README.md");
  });
});
```

- [ ] **Step 2: 运行测试，确认它因缺少快照而失败**

Run: `npm test -- tests/thinking-grid.test.ts`

Expected: FAIL，断言 `thinking-grids` 不存在。

- [ ] **Step 3: 复制 Markdown 快照，不复制符号链接**

Run:

```bash
mkdir -p thinking-grids
cp /Users/ruimin/Desktop/code/learn-from-book/EPUB/mental-models/models/*.md thinking-grids/
```

Confirm: `rg --files thinking-grids -g '*.md' | wc -l` 输出 `180`。

- [ ] **Step 4: 运行快照测试，确认它通过**

Run: `npm test -- tests/thinking-grid.test.ts`

Expected: PASS，且无外部目录读取。

### Task 2: 实现思维格栅快照加载器

**Files:**
- Modify: `tests/thinking-grid.test.ts`
- Create: `src/lib/thinking-grid.ts`

**Interfaces:**
- Produces:

```ts
export interface ThinkingGridDocument {
  slug: string;
  filePath: string;
  title: string;
  excerpt: string;
  body: string;
  headings: MarkdownHeading[];
}

export interface ThinkingGridSnapshot {
  index: ThinkingGridDocument;
  models: ThinkingGridDocument[];
}

export function loadThinkingGridSnapshot(directory?: string): ThinkingGridSnapshot;
export function thinkingGridHref(slug: string): string;
export function resolveThinkingGridMarkdownLink(url: string, snapshot: ThinkingGridSnapshot): string | null | undefined;
```

- [ ] **Step 1: 为加载、URL 与坏链接验证写入失败测试**

Append the following tests to `tests/thinking-grid.test.ts`:

```ts
import {
  loadThinkingGridSnapshot,
  resolveThinkingGridMarkdownLink,
  thinkingGridHref
} from "../src/lib/thinking-grid";

it("loads the 12-layer index and 178 standalone models", () => {
  const snapshot = loadThinkingGridSnapshot();

  expect(snapshot.index.title).toBe("思维格栅");
  expect(snapshot.index.body).toContain("## 12 层导航");
  expect(snapshot.models).toHaveLength(178);
  expect(snapshot.models.find((model) => model.slug === "概率思维与期望值")?.title).toBe(
    "概率思维与期望值：不要问会不会，要问值不值得"
  );
});

it("creates local URLs only for copied model documents", () => {
  const snapshot = loadThinkingGridSnapshot();

  expect(thinkingGridHref("概率思维与期望值")).toBe("/thinking-grids/概率思维与期望值/");
  expect(resolveThinkingGridMarkdownLink("概率思维与期望值.md", snapshot)).toBe(
    "/thinking-grids/概率思维与期望值/"
  );
  expect(resolveThinkingGridMarkdownLink("README.md", snapshot)).toBeNull();
  expect(resolveThinkingGridMarkdownLink("../taxonomy.md", snapshot)).toBeNull();
  expect(resolveThinkingGridMarkdownLink("#思维操作系统", snapshot)).toBeUndefined();
  expect(resolveThinkingGridMarkdownLink("https://example.com/model.md", snapshot)).toBeUndefined();
});
```

- [ ] **Step 2: 运行测试，确认加载器模块尚不存在而失败**

Run: `npm test -- tests/thinking-grid.test.ts`

Expected: FAIL，报错 `Failed to load url ../src/lib/thinking-grid`。

- [ ] **Step 3: 添加最小加载器与链接解析器**

Create `src/lib/thinking-grid.ts` using these exact rules:

```ts
const ROOT = process.cwd();
const DEFAULT_DIRECTORY = path.join(ROOT, "thinking-grids");
const INDEX_FILE_NAME = "思维格栅.md";
const SUPPORTING_FILE_NAMES = new Set([INDEX_FILE_NAME, "README.md"]);

export function thinkingGridHref(slug: string): string {
  return `/thinking-grids/${slug}/`;
}

export function loadThinkingGridSnapshot(directory = DEFAULT_DIRECTORY): ThinkingGridSnapshot {
  if (!fs.existsSync(directory)) {
    throw new Error(`思维格栅快照目录不存在: ${directory}`);
  }

  const fileNames = fs.readdirSync(directory).filter((fileName) => fileName.endsWith(".md"));
  if (!fileNames.includes(INDEX_FILE_NAME)) {
    throw new Error(`思维格栅索引不存在: ${path.join(directory, INDEX_FILE_NAME)}`);
  }

  const toDocument = (fileName: string): ThinkingGridDocument => {
    const filePath = path.join(directory, fileName);
    const body = fs.readFileSync(filePath, "utf8").trim();
    const title = body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? path.parse(fileName).name;
    return {
      slug: filePathToSlug(fileName),
      filePath: path.relative(ROOT, filePath),
      title,
      excerpt: extractExcerpt(body),
      body,
      headings: extractHeadings(body)
    };
  };

  const index = toDocument(INDEX_FILE_NAME);
  const models = fileNames
    .filter((fileName) => !SUPPORTING_FILE_NAMES.has(fileName))
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
    .map(toDocument);

  if (models.length === 0) {
    throw new Error(`思维格栅快照没有模型文章: ${directory}`);
  }

  return { index, models };
}
```

Implement `resolveThinkingGridMarkdownLink` by returning `undefined` for anchors, slash-prefixed paths and protocol URLs; returning the corresponding `thinkingGridHref` only when `path.basename(url)` maps to a model slug; and returning `null` for every other relative `.md` URL.

- [ ] **Step 4: 运行加载器测试，确认通过**

Run: `npm test -- tests/thinking-grid.test.ts`

Expected: PASS。

### Task 3: 以 AST 重写思维格栅的相对链接

**Files:**
- Modify: `tests/markdown.test.ts`
- Modify: `src/lib/render.ts`

**Interfaces:**
- Consumes: `relativeLinkResolver?: (url: string) => string | null | undefined`。
- Produces: 有效模型链接使用本地 URL；`null` 对应纯文字；`undefined` 保留原链接。

- [ ] **Step 1: 为重写、解链和保留链接写失败测试**

Append to `tests/markdown.test.ts`:

```ts
it("rewrites copied Markdown links and unlinks unavailable local documents", async () => {
  const resolve = (url: string) => {
    if (url === "模型.md") return "/thinking-grids/模型/";
    if (url === "README.md") return null;
    return undefined;
  };

  await expect(
    renderMarkdownToHtml("[模型](模型.md) [说明](README.md) [锚点](#层级)", { relativeLinkResolver: resolve })
  ).resolves.toContain('<a href="/thinking-grids/%E6%A8%A1%E5%9E%8B/">模型</a> 说明 <a href="#%E5%B1%82%E7%BA%A7">锚点</a>');
});
```

- [ ] **Step 2: 运行测试，确认旧渲染器保留了相对文件链接而失败**

Run: `npm test -- tests/markdown.test.ts`

Expected: FAIL，HTML 中仍含 `href="README.md"`。

- [ ] **Step 3: 在 `src/lib/render.ts` 中实现可选 resolver**

Extend the public options and add a remark plugin before `remarkHtml`:

```ts
export interface RenderMarkdownOptions {
  keywordLinks?: KeywordLink[];
  currentHref?: string;
  relativeLinkResolver?: (url: string) => string | null | undefined;
}

function remarkRelativeLinks(resolve: NonNullable<RenderMarkdownOptions["relativeLinkResolver"]>) {
  return (tree: Node) => {
    visit(tree, "link", (node) => {
      const link = node as MarkdownNode;
      const resolved = resolve(link.url ?? "");
      if (resolved === undefined) return;
      if (resolved === null) {
        link.type = "text";
        link.value = nodeText(link);
        delete link.url;
        delete link.children;
        return;
      }
      link.url = resolved;
    });
  };
}
```

Register it conditionally with `.use(remarkRelativeLinks, options.relativeLinkResolver)` before keyword-link processing. Keep the existing article rendering unchanged when the option is absent.

- [ ] **Step 4: 运行 Markdown 测试，确认全部通过**

Run: `npm test -- tests/markdown.test.ts`

Expected: PASS。

### Task 4: 接入左侧入口与静态页面

**Files:**
- Modify: `tests/navigation.test.ts`
- Modify: `src/lib/navigation.ts`
- Modify: `src/layouts/BaseLayout.astro`
- Create: `src/pages/thinking-grids/index.astro`
- Create: `src/pages/thinking-grids/[slug].astro`

**Interfaces:**
- Consumes: `THINKING_GRID_NAV`, `loadThinkingGridSnapshot`, `thinkingGridHref`, `resolveThinkingGridMarkdownLink`。
- Produces: `/thinking-grids/` 索引和 178 个 `/thinking-grids/<slug>/` 静态页面。

- [ ] **Step 1: 写入顶级导航常量的失败测试**

Add to `tests/navigation.test.ts`:

```ts
import { THINKING_GRID_NAV } from "../src/lib/navigation";

describe("THINKING_GRID_NAV", () => {
  it("is a top-level entry pointing at the thinking grid index", () => {
    expect(THINKING_GRID_NAV).toEqual({ label: "思维格栅", href: "/thinking-grids/" });
  });
});
```

- [ ] **Step 2: 运行导航测试，确认常量缺失而失败**

Run: `npm test -- tests/navigation.test.ts`

Expected: FAIL，报错 `THINKING_GRID_NAV` 未导出。

- [ ] **Step 3: 实现导航常量和当前页状态**

Add to `src/lib/navigation.ts`:

```ts
export const THINKING_GRID_NAV = { label: "思维格栅", href: "/thinking-grids/" } as const;
```

In `BaseLayout.astro`, import it beside `STOP_DOING_NAV`; compute `thinkingGridActive` with the same decoded, trailing-slash-normalized path comparison used for `stopDoingActive`; and render this sibling list item before “不可为清单”:

```astro
<li>
  <a class:list={["sidebar-toplink", thinkingGridActive && "is-active"]} href={THINKING_GRID_NAV.href}>
    {THINKING_GRID_NAV.label}
  </a>
</li>
```

- [ ] **Step 4: 创建索引与模型页面**

`src/pages/thinking-grids/index.astro` must call `loadThinkingGridSnapshot()`, render `snapshot.index.body` with `relativeLinkResolver: (url) => resolveThinkingGridMarkdownLink(url, snapshot)`, and pass a `buildCollectionPageSchema` whose pathname is `/thinking-grids/` and whose items are the 178 `thinkingGridHref(model.slug)` URLs.

`src/pages/thinking-grids/[slug].astro` must use `getStaticPaths()` over `loadThinkingGridSnapshot().models`, render each model with the same resolver, use `shell="reader"`, show its headings in the right-side table of contents, and pass both `buildCreativeWorkSchema({ title: model.title, description: model.excerpt, pathname: thinkingGridHref(model.slug), sourceTypeLabel: "思维格栅", year: "" })` and a breadcrumb (`首页 → 思维格栅 → 模型名`).

- [ ] **Step 5: 运行导航及类型检查，确认通过**

Run: `npm test -- tests/navigation.test.ts && npx astro check`

Expected: PASS，Astro 无类型错误。

### Task 5: 全量验证与生成物检查

**Files:**
- Verify only: `dist/thinking-grids/index.html`
- Verify only: `dist/thinking-grids/概率思维与期望值/index.html`

**Interfaces:**
- Consumes: 完整快照、加载器、路由和导航。
- Produces: 可部署的一级入口、索引和模型页。

- [ ] **Step 1: 执行完整质量门槛**

Run: `npm run check`

Expected: `validate:content`、`astro check`、Vitest 和 Astro build 全部成功。

- [ ] **Step 2: 检查生成的索引与模型链接**

Run:

```bash
rg -n '思维格栅|/thinking-grids/概率思维与期望值/' dist/thinking-grids/index.html
test -f dist/thinking-grids/概率思维与期望值/index.html
```

Expected: 索引含左侧“思维格栅”入口和到本地模型页的 URL；目标 HTML 文件存在。

- [ ] **Step 3: 检查变更范围和空白错误**

Run: `git diff --check && git status --short`

Expected: 无空白错误；变更只包含快照、思维格栅实现、测试和本计划。

- [ ] **Step 4: 提交实现**

```bash
git add thinking-grids src/lib/thinking-grid.ts src/lib/render.ts src/lib/navigation.ts src/layouts/BaseLayout.astro src/pages/thinking-grids tests/thinking-grid.test.ts tests/markdown.test.ts tests/navigation.test.ts docs/superpowers/plans/2026-07-13-thinking-grid.md
git commit -m "feat: add thinking grid library"
```
