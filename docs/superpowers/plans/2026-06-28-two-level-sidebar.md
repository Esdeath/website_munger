# Two-Level Collapsible Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn both sidebar sections (原文, 解读) into expandable two-level trees where each category reveals its individual documents, and clicking one shows that article in the main reading area.

**Architecture:** `buildSidebarSections` returns a `section → group → leaf` tree; `BaseLayout` renders each group as a native `<details>` (no JS) with the active branch server-rendered open, computed from `Astro.url.pathname`. The obsolete `activeHref` prop is removed. CSS restyles `<summary>` rows and the indented second level.

**Tech Stack:** Astro 4 (static), TypeScript, Vitest, plain CSS.

---

### Task 1: Restructure navigation data model and builder

**Files:**
- Modify: `src/lib/navigation.ts`
- Test: `tests/navigation.test.ts`

- [ ] **Step 1: Replace the `buildSidebarSections` test with the tree-shaped contract**

Replace the entire `describe("buildSidebarSections", ...)` block in `tests/navigation.test.ts` (the `describe("buildArchiveCards", ...)` block and the fixtures above it stay unchanged):

```ts
describe("buildSidebarSections", () => {
  it("builds original-source and article sections with grouped counts", () => {
    const sections = buildSidebarSections(articles, sources);

    expect(sections.map((section) => section.title)).toEqual(["原文", "解读"]);
    expect(sections[0].groups.map((group) => [group.label, group.count])).toEqual([
      ["股东会与股东信", 1],
      ["演讲与访谈", 1]
    ]);
    expect(sections[0].groups[0].children.map((leaf) => leaf.label)).toEqual([
      "2017年 每日期刊股东会讲话"
    ]);
    expect(sections[1].groups.map((group) => group.label)).toContain("投资原则");
  });

  it("marks the active leaf and opens its parent group", () => {
    const sections = buildSidebarSections(articles, sources, "/sources/查理芒格-1995年哈佛法学院演讲/");

    const speech = sections[0].groups.find((group) => group.label === "演讲与访谈")!;
    expect(speech.open).toBe(true);
    expect(speech.children[0].active).toBe(true);

    const shareholder = sections[0].groups.find((group) => group.label === "股东会与股东信")!;
    expect(shareholder.open).toBe(false);
  });

  it("normalizes trailing slashes when matching the active leaf", () => {
    const open = (path: string) =>
      buildSidebarSections(articles, sources, path)[1].groups.find((group) => group.label === "投资原则")!.open;

    expect(open("/articles/能力圈-知道自己不知道什么/")).toBe(true);
    expect(open("/articles/能力圈-知道自己不知道什么")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- navigation`
Expected: FAIL — `sections[0].groups` is undefined (builder still returns `items`).

- [ ] **Step 3: Rewrite `src/lib/navigation.ts`**

Replace the file's contents with:

```ts
import type { TopicDefinition } from "../content/site";
import type { KnowledgeArticle, OriginalSource } from "./corpus";
import { articlesForTopic } from "./relations";
import { textToSlug } from "./slug";

export interface SidebarLeaf {
  label: string;
  href: string;
  active: boolean;
}

export interface SidebarGroup {
  label: string;
  count: number;
  open: boolean;
  children: SidebarLeaf[];
}

export interface SidebarSection {
  title: string;
  groups: SidebarGroup[];
}

export interface ArchiveCard {
  mark: string;
  title: string;
  description: string;
  href: string;
  count: number;
}

const sourceLabels = {
  shareholder: "股东会与股东信",
  speech: "演讲与访谈"
} as const;

function normalizePath(path: string): string {
  if (!path) {
    return "/";
  }
  return path.endsWith("/") ? path : `${path}/`;
}

export function categoryHref(category: string): string {
  return `/articles/#${textToSlug(category)}`;
}

function toLeaf(label: string, href: string, currentPath: string): SidebarLeaf {
  return { label, href, active: normalizePath(currentPath) === normalizePath(href) };
}

function makeGroup(label: string, children: SidebarLeaf[]): SidebarGroup {
  return { label, count: children.length, children, open: children.some((leaf) => leaf.active) };
}

export function buildSidebarSections(
  articles: KnowledgeArticle[],
  sources: OriginalSource[],
  currentPath = ""
): SidebarSection[] {
  const sourceGroup = (type: OriginalSource["type"]): SidebarGroup =>
    makeGroup(
      sourceLabels[type],
      sources
        .filter((source) => source.type === type)
        .sort((a, b) => a.year.localeCompare(b.year) || a.title.localeCompare(b.title, "zh-Hans-CN"))
        .map((source) => toLeaf(source.title, `/sources/${source.slug}/`, currentPath))
    );

  const categories = Array.from(new Set(articles.map((article) => article.category))).sort((a, b) =>
    a.localeCompare(b, "zh-Hans-CN")
  );

  const articleGroup = (category: string): SidebarGroup =>
    makeGroup(
      category,
      articles
        .filter((article) => article.category === category)
        .sort((a, b) => b.quoteCount - a.quoteCount)
        .map((article) => toLeaf(article.title, `/articles/${article.slug}/`, currentPath))
    );

  return [
    { title: "原文", groups: [sourceGroup("shareholder"), sourceGroup("speech")] },
    { title: "解读", groups: categories.map(articleGroup) }
  ];
}

export function buildArchiveCards(topics: TopicDefinition[], articles: KnowledgeArticle[]): ArchiveCard[] {
  return topics.map((topic) => ({
    mark: topic.title.slice(0, 1),
    title: topic.title,
    description: topic.description,
    href: `/topics/${topic.slug}/`,
    count: articlesForTopic(articles, topic).length
  }));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- navigation`
Expected: PASS (all three `buildSidebarSections` cases + `buildArchiveCards`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/navigation.ts tests/navigation.test.ts
git commit -m "feat: model sidebar as two-level section/group/leaf tree"
```

---

### Task 2: Render the `<details>` tree in BaseLayout and drop `activeHref`

**Files:**
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/pages/sources/[slug].astro:19,22`
- Modify: `src/pages/articles/[slug].astro:4,18,21`

These change together so `astro check` stays green (removing the prop from `BaseLayout` while a page still passes it is a type error).

- [ ] **Step 1: Update `BaseLayout.astro` frontmatter**

Remove `activeHref` from the `Props` interface and feed `Astro.url.pathname` to the builder.

Replace:

```astro
interface Props {
  title?: string;
  description?: string;
  activeHref?: string;
  shell?: "archive" | "reader";
}

const pageTitle = Astro.props.title ? `${Astro.props.title} | ${SITE_TITLE}` : SITE_TITLE;
const description = Astro.props.description ?? SITE_DESCRIPTION;
const shell = Astro.props.shell ?? "archive";
const sidebarSections = buildSidebarSections(loadArticles(), loadOriginalSources(), Astro.props.activeHref);
```

with:

```astro
interface Props {
  title?: string;
  description?: string;
  shell?: "archive" | "reader";
}

const pageTitle = Astro.props.title ? `${Astro.props.title} | ${SITE_TITLE}` : SITE_TITLE;
const description = Astro.props.description ?? SITE_DESCRIPTION;
const shell = Astro.props.shell ?? "archive";
const sidebarSections = buildSidebarSections(loadArticles(), loadOriginalSources(), Astro.url.pathname);
```

- [ ] **Step 2: Update the `<nav>` markup in `BaseLayout.astro`**

Replace the whole `<nav class="sidebar-nav"> ... </nav>` block with:

```astro
        <nav class="sidebar-nav">
          {sidebarSections.map((section) => (
            <section class="sidebar-section">
              <h2>{section.title}</h2>
              <ul class="sidebar-tree">
                {section.groups.map((group) => (
                  <li>
                    <details open={group.open}>
                      <summary>
                        <span class="chevron">›</span>
                        <span class="sidebar-group-label">{group.label}</span>
                        <span class="sidebar-count">· {group.count}</span>
                      </summary>
                      <ul class="sidebar-leaves">
                        {group.children.map((leaf) => (
                          <li>
                            <a class:list={[leaf.active && "is-active"]} href={leaf.href}>{leaf.label}</a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
```

- [ ] **Step 3: Remove `activeHref` from `src/pages/sources/[slug].astro`**

Delete this line (line 19):

```astro
const activeHref = source.type === "shareholder" ? "/sources/#shareholder" : "/sources/#speech";
```

Change the opening tag (line 22) from:

```astro
<BaseLayout title={source.title} description={source.excerpt} activeHref={activeHref} shell="reader">
```

to:

```astro
<BaseLayout title={source.title} description={source.excerpt} shell="reader">
```

- [ ] **Step 4: Remove `activeHref` and the unused import from `src/pages/articles/[slug].astro`**

Delete the import (line 4):

```astro
import { categoryHref } from "../../lib/navigation";
```

Delete the constant (line 18):

```astro
const activeHref = categoryHref(article.category);
```

Change the opening tag (line 21) from:

```astro
<BaseLayout title={article.title} description={article.excerpt} activeHref={activeHref} shell="reader">
```

to:

```astro
<BaseLayout title={article.title} description={article.excerpt} shell="reader">
```

- [ ] **Step 5: Type-check and build**

Run: `npx astro check && npm run build`
Expected: 0 errors, build completes. (Confirms the `activeHref` removal is consistent and `Astro.url.pathname` resolves for every static route.)

- [ ] **Step 6: Commit**

```bash
git add src/layouts/BaseLayout.astro src/pages/sources/[slug].astro src/pages/articles/[slug].astro
git commit -m "feat: render two-level sidebar tree, drop activeHref prop"
```

---

### Task 3: Style the two-level tree

**Files:**
- Modify: `src/styles/global.css:127-162`

- [ ] **Step 1: Replace the old flat-list sidebar rules**

Replace this block (the `.sidebar-section ul`/`li`/`a` rules plus the `.chevron, .sidebar-count` rule, lines 127-162):

```css
.sidebar-section ul,
.link-list,
.keyword-list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.sidebar-section li + li {
  margin-top: 8px;
}

.sidebar-section a {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: baseline;
  padding: 6px 4px;
  color: var(--green-dark);
  border-left: 4px solid transparent;
  border-radius: 5px;
  font-size: 20px;
  font-weight: 800;
}

.sidebar-section a:hover,
.sidebar-section a.is-active {
  background: var(--green-soft);
  border-left-color: var(--green);
}

.chevron,
.sidebar-count {
  color: var(--muted);
  font-weight: 700;
}
```

with:

```css
.sidebar-tree,
.sidebar-leaves,
.link-list,
.keyword-list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.sidebar-tree > li + li {
  margin-top: 6px;
}

.sidebar-tree summary {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: baseline;
  padding: 6px 4px;
  color: var(--green-dark);
  border-left: 4px solid transparent;
  border-radius: 5px;
  font-size: 20px;
  font-weight: 800;
  cursor: pointer;
  list-style: none;
}

.sidebar-tree summary::-webkit-details-marker {
  display: none;
}

.sidebar-tree summary:hover {
  background: var(--green-soft);
  border-left-color: var(--green);
}

.sidebar-tree .chevron {
  transition: transform 0.15s ease;
}

.sidebar-tree details[open] > summary .chevron {
  transform: rotate(90deg);
}

.sidebar-leaves {
  margin: 4px 0 8px;
  padding-left: 26px;
}

.sidebar-leaves li + li {
  margin-top: 2px;
}

.sidebar-leaves a {
  display: block;
  padding: 5px 8px;
  color: var(--green-dark);
  border-left: 3px solid transparent;
  border-radius: 5px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.5;
}

.sidebar-leaves a:hover {
  background: var(--green-soft);
}

.sidebar-leaves a.is-active {
  background: var(--green-soft);
  border-left-color: var(--green);
}

.chevron,
.sidebar-count {
  color: var(--muted);
  font-weight: 700;
}
```

- [ ] **Step 2: Build to confirm CSS is valid and nothing else broke**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 3: Visual check in the dev server**

Run: `npm run dev` and open `http://localhost:4321/sources/<any-shareholder-slug>/` (e.g. from `ls shareholders`).
Expected:
- Sidebar shows 原文 with two collapsible rows (股东会与股东信 · N, 演讲与访谈 · N) and 解读 with one row per category.
- The current document's category is expanded, its title highlighted (green-soft + green left border); other groups are collapsed.
- The chevron points right when collapsed and rotates down when open.
- Clicking a leaf navigates and the article renders in the main area with the right aside intact.

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "style: two-level collapsible sidebar tree"
```

---

### Final verification

- [ ] Run the full gate: `npm run check` (validate:content + astro check + vitest + build). Expected: all pass.

---

## Self-Review notes

- **Spec coverage:** tree data model (Task 1), `<details>` render + pathname active state + `activeHref` removal (Task 2), summary/second-level/active CSS (Task 3), keep homepage/right-aside (untouched by design), tests for grouping/active/normalization (Task 1). All spec sections mapped.
- **Type consistency:** `SidebarSection.groups`, `SidebarGroup.{label,count,open,children}`, `SidebarLeaf.{label,href,active}` used identically across builder, test, and BaseLayout markup.
- **No placeholders:** every step has concrete code/commands.
