# 思维格栅文章首段去重 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent each thinking-grid model page from rendering its excerpt twice at the beginning.

**Architecture:** Extract the shared Markdown cleanup into a small pure helper in `src/lib/thinking-grid.ts`. The model page keeps using `model.excerpt` in the header and passes the helper's output to the Markdown renderer. This leaves the source snapshot unchanged and limits the behavior change to thinking-grid pages.

**Tech Stack:** Astro 4, TypeScript, Vitest, Node.js Markdown string processing.

## Global Constraints

- Keep the change scoped to the thinking-grid model page.
- Preserve the first paragraph in `model.excerpt` for the header and SEO metadata.
- Preserve all content after the first paragraph, including headings, links, code blocks, and later paragraphs.

---

### Task 1: Remove the duplicated excerpt from rendered model bodies

**Files:**
- Modify: `src/lib/thinking-grid.ts`
- Modify: `src/pages/thinking-grids/[slug].astro`
- Test: `tests/thinking-grid.test.ts`

**Interfaces:**
- Produces `bodyWithoutExcerpt(body: string): string`, a pure helper that removes a leading Markdown H1 and the first paragraph block while preserving the remaining Markdown.

- [x] **Step 1: Write the failing test**

Add this import and test to `tests/thinking-grid.test.ts`:

```ts
import { bodyWithoutExcerpt } from "../src/lib/thinking-grid";

it("removes the title and first paragraph before rendering a model body", () => {
  expect(
    bodyWithoutExcerpt(
      "# 模型标题\n\n这是摘要。\n\n这是正文第二段。\n\n## 下一节\n\n后续内容。"
    )
  ).toBe("这是正文第二段。\n\n## 下一节\n\n后续内容。");
});
```

- [x] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run tests/thinking-grid.test.ts -t "removes the title and first paragraph"`

Expected: FAIL because `bodyWithoutExcerpt` is not exported yet.

- [x] **Step 3: Implement the minimal helper**

Add this exported function to `src/lib/thinking-grid.ts`:

```ts
export function bodyWithoutExcerpt(body: string): string {
  const withoutTitle = body.replace(/^#\s+.+(?:\r?\n|$)/, "").trimStart();
  const firstParagraphEnd = withoutTitle.search(/\r?\n\s*\r?\n/);

  return firstParagraphEnd === -1 ? "" : withoutTitle.slice(firstParagraphEnd).trim();
}
```

Replace the page-local title cleanup in `src/pages/thinking-grids/[slug].astro`:

```ts
const rendered = await renderMarkdownToHtml(bodyWithoutExcerpt(model.body), {
```

and import `bodyWithoutExcerpt` from `../../lib/thinking-grid`.

- [x] **Step 4: Run the focused test and verify it passes**

Run: `npx vitest run tests/thinking-grid.test.ts -t "removes the title and first paragraph"`

Expected: PASS.

- [x] **Step 5: Run the related test file**

Run: `npx vitest run tests/thinking-grid.test.ts`

Expected: all tests in `tests/thinking-grid.test.ts` pass.

- [x] **Step 6: Run the full repository gate**

Run: `npm run check`

Expected: content validation, Astro typechecking, Vitest, and Astro build all exit 0.
