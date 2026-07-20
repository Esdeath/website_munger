# Replace Seeking Wisdom Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing Seeking Wisdom Markdown source with the supplied standalone Chinese HTML reader while preserving its public URL and site discovery.

**Architecture:** Store the supplied document at `public/sources/seeking-wisdom-中文版/index.html` so Astro copies it unchanged to the established source URL. Register lightweight metadata for this standalone source in the corpus loader, and exclude standalone sources from the Markdown detail route so the generated page cannot overwrite the static HTML.

**Tech Stack:** Astro 4, TypeScript, Vitest, static files

## Global Constraints

- Preserve `/sources/seeking-wisdom-中文版/`.
- Remove `speech/Seeking-Wisdom-中文版.md`.
- Serve the supplied HTML unchanged.
- Keep the source visible in the source index, sidebar, sitemap, and LLM indexes.

---

### Task 1: Describe the standalone source in the corpus

**Files:**
- Create: `src/content/standalone-sources.ts`
- Modify: `src/lib/corpus.ts`
- Modify: `tests/corpus.test.ts`

**Interfaces:**
- Produces: `STANDALONE_SOURCES`, a typed list containing `slug`, `filePath`, `title`, `type`, `year`, and `excerpt`.
- Extends: `OriginalSource` with an optional `standalone` marker used by page generation.

- [ ] Add a failing loader test asserting that the new HTML source is loaded with the preserved slug and `standalone: true`.
- [ ] Run `npx vitest run tests/corpus.test.ts` and confirm the source is missing.
- [ ] Add the standalone source metadata and merge it into `loadOriginalSources()`.
- [ ] Run `npx vitest run tests/corpus.test.ts` and confirm it passes.

### Task 2: Replace the content and protect its route

**Files:**
- Delete: `speech/Seeking-Wisdom-中文版.md`
- Create: `public/sources/seeking-wisdom-中文版/index.html`
- Modify: `src/pages/sources/[slug].astro`
- Modify: `tests/source-page.test.ts`
- Modify: `docs/article-production/state/corpus-manifest.md`

**Interfaces:**
- Consumes: `OriginalSource.standalone` from Task 1.
- Produces: the unchanged standalone document at `/sources/seeking-wisdom-中文版/`.

- [ ] Add a failing route test asserting that standalone sources are filtered out of the Markdown detail page paths.
- [ ] Run `npx vitest run tests/source-page.test.ts` and confirm the route filter is missing.
- [ ] Copy the supplied HTML to the public route, remove the old Markdown, filter `getStaticPaths()`, and update the corpus manifest path and title.
- [ ] Run the focused tests and inspect the built HTML for the supplied title and reader controls.

### Task 3: Verify the complete site

**Files:**
- Verify only.

**Interfaces:**
- Confirms all existing consumers discover the standalone source through `loadOriginalSources()`.

- [ ] Run `npm run check`.
- [ ] Confirm `dist/sources/seeking-wisdom-中文版/index.html` exists and contains the supplied standalone reader.
- [ ] Review `git diff --check`, `git status --short`, and the final diff summary.
