# Article Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one-click, formatting-preserving article copying to original-source and explanatory-article detail pages.

**Architecture:** A pure TypeScript formatter builds equivalent Markdown and HTML payloads with the required attribution at both ends. A shared Astro component embeds the page-specific payload and handles Clipboard API feature detection, fallback, and accessible feedback; both detail routes render that component below their header metadata.

**Tech Stack:** Astro 4, TypeScript, browser Clipboard API, `@lucide/astro`, Vitest, CSS.

## Global Constraints

- Cover only `/sources/[slug]/` and `/articles/[slug]/` detail pages.
- Write both `text/html` and `text/plain` when `ClipboardItem` is supported; use Markdown with `writeText` as the fallback.
- Include “查理·芒格知识库” and the current canonical article link at both the beginning and end.
- Copy the article title and complete body, preserving headings, paragraphs, lists, quotes, emphasis, images, and links.
- Do not copy the reader sidebar, directory, related links, or article information panels.
- Keep the button inline below article header metadata and expose success and failure through an accessible live region.
- Do not add sharing to thinking grids, stop-doing pages, list pages, or the standalone Seeking Wisdom reader.

## File Structure

- Create `src/lib/article-share.ts`: pure escaping and Markdown/HTML payload construction.
- Create `src/components/ArticleShare.astro`: button, embedded payload, Clipboard API behavior, and status feedback.
- Create `tests/article-share.test.ts`: formatter behavior and component/page integration contracts.
- Modify `src/pages/articles/[slug].astro`: pass explanatory article content and canonical URL to the component.
- Modify `src/pages/sources/[slug].astro`: pass title-deduplicated original Markdown and canonical URL to the component.
- Modify `src/styles/global.css`: stable share-action sizing, states, focus behavior, and mobile fit.
- Modify `package.json` and `package-lock.json`: add `@lucide/astro` for the Share2 icon.

---

### Task 1: Dual-format share payload

**Files:**
- Create: `src/lib/article-share.ts`
- Create: `tests/article-share.test.ts`

**Interfaces:**
- Consumes: `ArticleShareInput { siteTitle: string; title: string; url: string; markdown: string; html: string }`.
- Produces: `buildArticleSharePayload(input): { markdown: string; html: string }`.

- [ ] **Step 1: Write failing formatter tests**

Create `tests/article-share.test.ts` with assertions that count two website links and three current-article title appearances in each format, retain representative Markdown/HTML structure, trim surrounding body whitespace, and HTML-escape title/site/link values:

```ts
import { describe, expect, it } from "vitest";
import { buildArticleSharePayload } from "../src/lib/article-share";

describe("article share payload", () => {
  const input = {
    siteTitle: "查理·芒格知识库",
    title: "能力圈 <边界>",
    url: "https://munger.ayaseeri.com/articles/能力圈/?from=a&b=c",
    markdown: "\n## 第一节\n\n> 保留引用。\n",
    html: '<h2 id="first">第一节</h2><blockquote><p>保留引用。</p></blockquote>'
  };

  it("wraps Markdown with linked site and article attribution at both ends", () => {
    const payload = buildArticleSharePayload(input);
    const attribution = `[查理·芒格知识库](${input.url}) · [能力圈 <边界>](${input.url})`;

    expect(payload.markdown).toBe(
      `${attribution}\n\n# 能力圈 <边界>\n\n## 第一节\n\n> 保留引用。\n\n---\n\n${attribution}`
    );
  });

  it("wraps rendered HTML without changing article structure", () => {
    const payload = buildArticleSharePayload(input);

    expect(payload.html).toContain("<h1>能力圈 &lt;边界&gt;</h1>");
    expect(payload.html).toContain(input.html);
    expect(payload.html.match(/查理·芒格知识库/g)).toHaveLength(2);
    expect(payload.html.match(/能力圈 &lt;边界&gt;/g)).toHaveLength(3);
    expect(payload.html).toContain("?from=a&amp;b=c");
  });
});
```

- [ ] **Step 2: Run the formatter test and verify RED**

Run: `npx vitest run tests/article-share.test.ts`

Expected: FAIL because `../src/lib/article-share` does not exist.

- [ ] **Step 3: Implement the minimal formatter**

Create `src/lib/article-share.ts` with exported input/output interfaces, a local HTML attribute/text escaper, one shared Markdown attribution string, and matching top/bottom HTML attribution blocks:

```ts
export interface ArticleShareInput {
  siteTitle: string;
  title: string;
  url: string;
  markdown: string;
  html: string;
}

export interface ArticleSharePayload {
  markdown: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildArticleSharePayload(input: ArticleShareInput): ArticleSharePayload {
  const markdownAttribution = `[${input.siteTitle}](${input.url}) · [${input.title}](${input.url})`;
  const escapedSiteTitle = escapeHtml(input.siteTitle);
  const escapedTitle = escapeHtml(input.title);
  const escapedUrl = escapeHtml(input.url);
  const htmlAttribution = `<p><strong>${escapedSiteTitle}</strong> · <a href="${escapedUrl}">${escapedTitle}</a></p>`;

  return {
    markdown: `${markdownAttribution}\n\n# ${input.title}\n\n${input.markdown.trim()}\n\n---\n\n${markdownAttribution}`,
    html: `<div>${htmlAttribution}<hr><h1>${escapedTitle}</h1>${input.html.trim()}<hr>${htmlAttribution}</div>`
  };
}
```

- [ ] **Step 4: Run the formatter test and verify GREEN**

Run: `npx vitest run tests/article-share.test.ts`

Expected: 2 tests PASS.

- [ ] **Step 5: Commit the formatter**

```bash
git add src/lib/article-share.ts tests/article-share.test.ts
git commit -m "feat: build article share payloads"
```

---

### Task 2: Shared copy button and detail-page integration

**Files:**
- Create: `src/components/ArticleShare.astro`
- Modify: `src/pages/articles/[slug].astro`
- Modify: `src/pages/sources/[slug].astro`
- Modify: `src/styles/global.css`
- Modify: `tests/article-share.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `ArticleShare` props `{ title: string; url: string; markdown: string; html: string }` and `buildArticleSharePayload` from Task 1.
- Produces: one `.article-share` control that writes `ClipboardItem({ "text/html", "text/plain" })`, falls back to `navigator.clipboard.writeText(payload.markdown)`, and reports `已复制` or `复制失败，请重试`.

- [ ] **Step 1: Add failing component and route contract tests**

Extend `tests/article-share.test.ts` by reading the component and route files. Assert the component imports `Share2` from `lucide-astro`, has a button with `data-share-button`, a `role="status"` live region, creates both MIME blobs, uses `navigator.clipboard.writeText` as fallback, and reports both outcome strings. Assert both route files import and render `ArticleShare`, article Markdown is `article.body`, original-source Markdown is `bodyWithoutDuplicateTitle`, and both URLs use `canonicalUrl(...)`.

```ts
import { readFileSync } from "node:fs";

describe("article sharing integration", () => {
  const component = readFileSync("src/components/ArticleShare.astro", "utf8");
  const articlePage = readFileSync("src/pages/articles/[slug].astro", "utf8");
  const sourcePage = readFileSync("src/pages/sources/[slug].astro", "utf8");

  it("writes rich and Markdown clipboard formats with a plain-text fallback", () => {
    expect(component).toContain('import { Share2 } from "@lucide/astro"');
    expect(component).toContain('data-share-button');
    expect(component).toContain('role="status"');
    expect(component).toContain('"text/html"');
    expect(component).toContain('"text/plain"');
    expect(component).toContain("navigator.clipboard.writeText(payload.markdown)");
    expect(component).toContain("已复制");
    expect(component).toContain("复制失败，请重试");
  });

  it("renders the shared control on explanatory and original detail pages", () => {
    expect(articlePage).toContain('import ArticleShare from "../../components/ArticleShare.astro"');
    expect(articlePage).toContain("markdown={article.body}");
    expect(articlePage).toContain('url={canonicalUrl(`/articles/${article.slug}/`)}');
    expect(sourcePage).toContain('import ArticleShare from "../../components/ArticleShare.astro"');
    expect(sourcePage).toContain("markdown={bodyWithoutDuplicateTitle}");
    expect(sourcePage).toContain('url={canonicalUrl(`/sources/${source.slug}/`)}');
  });
});
```

- [ ] **Step 2: Run the integration tests and verify RED**

Run: `npx vitest run tests/article-share.test.ts`

Expected: formatter tests PASS and integration setup FAIL because `src/components/ArticleShare.astro` does not exist.

- [ ] **Step 3: Install the icon dependency**

Run: `npm install @lucide/astro`

Expected: `package.json` and `package-lock.json` record a compatible `@lucide/astro` release.

- [ ] **Step 4: Build the shared Astro component**

Create `src/components/ArticleShare.astro`. In frontmatter, build the payload with `SITE_TITLE`, serialize it with `<` replaced by `\\u003c`, and render a Share2 icon, the label `分享`, and an initially empty live region. In the bundled script, initialize every `[data-article-share]` root once, parse its adjacent JSON payload, disable the button while writing, prefer `navigator.clipboard.write` with two typed blobs, fall back to `writeText`, set the success/failure text, and restore the default label after 2 seconds without hiding failure feedback before it can be announced.

The control must use this observable structure:

```astro
<div class="article-share" data-article-share>
  <button class="article-share-button" type="button" data-share-button aria-describedby={statusId}>
    <Share2 size={16} strokeWidth={2} aria-hidden="true" />
    <span data-share-label>分享</span>
  </button>
  <span class="article-share-status" id={statusId} role="status" aria-live="polite"></span>
  <script type="application/json" data-share-payload set:html={serializedPayload}></script>
</div>
```

- [ ] **Step 5: Render the component on both detail routes**

In `src/pages/articles/[slug].astro`, add imports for `ArticleShare` and `canonicalUrl`, then place this immediately after `.reader-header`:

```astro
<ArticleShare
  title={article.title}
  url={canonicalUrl(`/articles/${article.slug}/`)}
  markdown={article.body}
  html={rendered}
/>
```

In `src/pages/sources/[slug].astro`, add imports for `ArticleShare` and `canonicalUrl`, then place this immediately after `.reader-header`:

```astro
<ArticleShare
  title={source.title}
  url={canonicalUrl(`/sources/${source.slug}/`)}
  markdown={bodyWithoutDuplicateTitle}
  html={rendered}
/>
```

- [ ] **Step 6: Style stable button and feedback states**

Add `.article-share`, `.article-share-button`, `.article-share-button:hover`, `.article-share-button:disabled`, and `.article-share-status` rules near the reader header styles in `src/styles/global.css`. Use an inline flex row, `min-height: 38px`, 6px radius, existing `--paper`, `--line`, `--green-dark`, and sans-serif control typography. Reserve a fixed `min-width` for the live status so `已复制` and failure copy do not shift the article width; allow wrapping under the existing phone breakpoint.

- [ ] **Step 7: Run focused tests and typecheck**

Run: `npx vitest run tests/article-share.test.ts tests/source-page.test.ts tests/responsive-css.test.ts && npx astro check`

Expected: all focused tests PASS and Astro reports 0 errors.

- [ ] **Step 8: Commit the UI integration**

```bash
git add package.json package-lock.json src/components/ArticleShare.astro src/pages/articles/[slug].astro src/pages/sources/[slug].astro src/styles/global.css tests/article-share.test.ts
git commit -m "feat: copy formatted articles for sharing"
```

---

### Task 3: End-to-end verification

**Files:**
- Verify only; modify implementation files only when a check exposes a defect.

**Interfaces:**
- Consumes: the completed formatter, component, routes, and styles.
- Produces: a clean canonical project gate and a locally reachable built experience.

- [ ] **Step 1: Run the complete project gate**

Run: `npm run check`

Expected: content validation passes, Astro reports 0 errors, all Vitest tests pass, and the production build completes.

- [ ] **Step 2: Start the development server**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Astro prints a local URL. Keep the session running and use the reported port rather than replacing another process.

- [ ] **Step 3: Inspect both rendered route types**

Open one `/articles/<slug>/` route and one `/sources/<slug>/` route at desktop and phone widths. Confirm the button sits below header metadata, contains the Share2 icon and `分享`, does not resize or overlap content, changes to `已复制`, and produces the required top/body/bottom structure when pasted into rich-text and plain-text targets.

- [ ] **Step 4: Review the final diff**

Run: `git status --short && git diff --check && git diff HEAD~2 --stat`

Expected: no whitespace errors, no unplanned files, and only the formatter, component, two routes, styles, tests, dependency manifests, design, and plan are in scope.
