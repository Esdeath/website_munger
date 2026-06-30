This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, Chinese-language knowledge base of Charlie Munger's thought (查理·芒格知识库), built with Astro 4 and deployed to `https://munger.ayaseeri.com`. It organizes ~70 explanatory essays by topic and links each back to the primary-source corpus (shareholder letters, speeches, interviews) they quote.

## Commands

```bash
npm run dev              # local dev server (astro dev)
npm run build            # static build to dist/ (astro build)
npm run preview          # serve the built site

npm test                 # run all vitest tests once
npm run test:watch       # vitest in watch mode
npx vitest run tests/corpus.test.ts        # run a single test file
npx vitest run -t "parses corpus rows"     # run tests matching a name

npm run validate:content # check article frontmatter (scripts/validate-site-content.mjs)
npm run check            # FULL GATE: validate:content + astro check + vitest run + astro build

python3 tools/check_article.py "articles/<file>.md"  # verify one essay's quotes are verbatim
```

`npm run check` is the canonical pre-commit gate. `astro check` does TypeScript/Astro typechecking (config extends `astro/tsconfigs/strict`; `@/*` maps to `src/*`).

## Architecture

### Content is plain files in the repo root, not an Astro content collection

The three content directories live at the **repository root**, not under `src/`:

- `articles/` — explanatory essays. Each `.md` has frontmatter (`title`, `keyword`, `category`, `quote_count`, `sources`, `date`) plus a body of prose interleaving verbatim Munger quotes.
- `shareholders/` — Blue Chip / Wesco / Daily Journal shareholder letters & meeting transcripts.
- `speech/` — speeches, interviews, statements, long-form conversations.

`src/lib/corpus.ts` is the single loader: it reads these directories directly from `process.cwd()` via `node:fs` at build time (`loadArticles()`, `loadOriginalSources()`). There is no Astro content collection / `src/content/config.ts`. Anything that needs content calls these functions. `src/content/site.ts` is **not** a content collection — it is a hand-maintained config module (site metadata + the `TOPICS` array).

### Topic mapping

`src/content/site.ts` defines 8 `TOPICS` (investment-principles, thinking-methods, human-misjudgment, etc.). An article belongs to a topic when its frontmatter `category` string equals a topic's `title` — `relations.ts:topicForCategory` is currently an identity function, so the join is by exact Chinese category name. Articles, source-to-article maps, and "related articles" are all computed in `src/lib/relations.ts`.

### Page generation

Routes in `src/pages/` use `getStaticPaths()` over the corpus to emit one static page per item:

- `articles/[slug].astro`, `sources/[slug].astro`, `topics/[slug].astro` (+ their `index.astro` listings)
- Slugs come from the **filename** via `src/lib/slug.ts:filePathToSlug` (handles CJK punctuation → dashes). Slugs are derived, not stored.
- `[sourceDirectory]/images/[image].png.ts` serves images out of `shareholders/images/` and `speech/images/` through a dynamic route (with path-traversal guards).
- SEO/agent routes are generated, not static files: `sitemap.xml.ts`, `robots.txt.ts`, `llms.txt.ts`, `llms-full.txt.ts`.

### Markdown rendering & automatic cross-linking

`src/lib/render.ts` runs a remark pipeline (`remark-gfm` → custom plugins → `remark-html` with `hast-util-sanitize`). Two custom behaviors matter:

1. **Heading IDs**: every `##`/`###` gets an `id` via `textToSlug`, so the per-article TOC anchors work.
2. **Keyword auto-linking**: across all articles, occurrences of another article's `keyword` in body text are rewritten into links to that article (skipping the current page and text already inside links). This is how the knowledge base self-cross-links.

`src/lib/seo.ts` builds JSON-LD structured data, canonical URLs, and the `llms.txt` contents. `BaseLayout.astro` wires meta tags, OpenGraph, structured data, the sidebar (`src/lib/navigation.ts`), and an inline Baidu analytics snippet. Layout has two shells: `archive` (listing pages) and `reader` (article pages).

### Tests

Vitest, `node` environment, globals enabled, files in `tests/**/*.test.ts`. Tests are pure-function unit tests over the `src/lib/*` modules (corpus parsing, slug, navigation, relations, markdown, seo) plus CSS/layout assertions (`responsive-css`, `layout-analytics`, `favicon`). Adding a content feature usually means: extend a `src/lib` function + add a test there.

## Content production pipeline

Essays in `articles/` are generated from the corpus by a documented, repeatable process. The authoritative docs live in `docs/article-production/`:

- `workflow/00..05-*.md` — the pipeline stages (build corpus → clean → extract keywords → generate articles → verify).
- `state/` — `corpus-manifest.md` (source provenance, parsed by `corpus.ts:parseCorpusManifest`), `keyword-registry.md`, `article-status.md`.
- `reference/` — `article-template.md` (the 8-section essay skeleton), `article-style.md`, `article-index.md`.

Key conventions when authoring/editing essays:

- **Quotes must be verbatim** from the corpus and attributed to **Munger himself** (interview files also contain interviewers/Buffett/audience). `tools/check_article.py` enforces verbatim quotes, `quote_count` matching, ≥12 quotes across ≥4 sources, required sections, and frontmatter fields. It must print `PASS` / exit 0.
- **Full-width punctuation**: the corpus uses CJK full-width punctuation (`，。？；`). `check_article.py` normalizes whitespace/quote-marks/`**` but does **not** normalize ASCII `,.?;` to full-width — pasting a quote with ASCII punctuation makes every fragment fail "未在语料中找到". Match the corpus's exact punctuation.
- `quote_count` in frontmatter must equal the script's reported 引用数. Titles/subtitles should use Munger's actual corpus wording, not invented metaphors.
- The script guarantees quotes are verbatim but cannot catch wrong year/source attribution or reversed meaning in awkward translations — those need a human/fact-checker reading the cited source file.

The established workflow generates essays as parallel writer agents (one per keyword, separate files, agents do **not** run git) followed by one independent fact-checker per essay; the controller then commits. Convention: commit new essays **directly to `main`**, one `article: 关键词` commit per essay.
